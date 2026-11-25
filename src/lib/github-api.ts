/**
 * APILOCK — GitHub API Client for Authorized Repository Inspection
 *
 * Capabilities:
 * - Ingest and parse arbitrary public GitHub repository URLs (e.g., https://github.com/tempoxyz/tempo)
 * - Fetch full repository metadata, default branch, and recursive file trees
 * - Enumerate eligible source code and configuration files (.py, .js, .ts, .go, .java, .env, .yaml, etc.)
 * - Inspect accessible Git commit history and diff patches for historical exposures
 * - Accurately track complete vs. partial scan coverage (file limits, size caps, truncated trees)
 * - Rate-limit management with exponential backoff and reset-header detection
 */

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string; avatar_url: string };
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  default_branch: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  size: number;
  topics: string[];
  visibility: "public" | "private";
}

export interface GitHubContent {
  name: string;
  path: string;
  type: "file" | "dir" | "submodule" | "symlink";
  content?: string;
  encoding?: string;
  sha: string;
  size: number;
  download_url: string | null;
}

export interface GitHubCommitDetail {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
  files?: Array<{
    filename: string;
    status: string;
    patch?: string;
  }>;
}

export interface TreeFileItem {
  path: string;
  type: string;
  sha: string;
  size?: number;
}

export interface RepoTreeResult {
  files: TreeFileItem[];
  truncated: boolean;
}

const GITHUB_API = "https://api.github.com";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fetch with exponential backoff and rate-limit detection */
async function ghFetch(url: string, attempt = 0): Promise<Response> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  // Honor GitHub's rate-limit reset time when retrying.
  const resetHeader = res.headers.get("x-ratelimit-reset");

  if (res.status === 403 || res.status === 429) {
    const retryAfter = res.headers.get("Retry-After");
    let waitMs = 2000;

    if (retryAfter) {
      waitMs = parseInt(retryAfter, 10) * 1000;
    } else if (resetHeader) {
      const resetTime = parseInt(resetHeader, 10) * 1000;
      const diff = resetTime - Date.now();
      if (diff > 0 && diff < 60000) waitMs = diff + 1000;
    } else {
      waitMs = Math.min(1000 * 2 ** attempt, 16000);
    }

    if (attempt < 3) {
      await sleep(waitMs);
      return ghFetch(url, attempt + 1);
    }
  }

  return res;
}

/**
 * Parse an arbitrary repository identifier or URL into { owner, repo }.
 * Supports formats:
 * - "https://github.com/tempoxyz/tempo"
 * - "https://github.com/tempoxyz/tempo.git"
 * - "github.com/tempoxyz/tempo"
 * - "tempoxyz/tempo"
 */
export function parseGitHubRepoInput(input: string): { owner: string; repo: string } | null {
  if (!input || typeof input !== "string") return null;
  const clean = input
    .trim()
    .replace(/\.git$/i, "")
    .replace(/\/$/, "");

  // Match URL format
  const urlMatch = clean.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/i,
  );
  if (urlMatch && urlMatch[1] && urlMatch[2]) {
    return { owner: urlMatch[1], repo: urlMatch[2] };
  }

  // Match owner/repo format
  const ownerRepoMatch = clean.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (ownerRepoMatch && ownerRepoMatch[1] && ownerRepoMatch[2]) {
    return { owner: ownerRepoMatch[1], repo: ownerRepoMatch[2] };
  }

  return null;
}

/**
 * Fetch a single public repository by owner and name.
 */
export async function fetchRepositoryMetadata(
  owner: string,
  repo: string,
): Promise<GitHubRepo | null> {
  const url = `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  try {
    const res = await ghFetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetch all repositories accessible to the authenticated GitHub user.
 * Requires a valid OAuth access token (provider_token from Supabase session).
 * Paginates until all repos are retrieved (up to 300).
 */
export async function fetchUserRepositories(accessToken: string): Promise<GitHubRepo[]> {
  const allRepos: GitHubRepo[] = [];
  let page = 1;

  while (allRepos.length < 300) {
    const url = `${GITHUB_API}/user/repos?per_page=100&page=${page}&sort=pushed&affiliation=owner,collaborator,organization_member`;
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!res.ok) break;
      const batch: GitHubRepo[] = await res.json();
      if (batch.length === 0) break;
      allRepos.push(...batch);
      if (batch.length < 100) break;
      page++;
    } catch {
      break;
    }
  }

  return allRepos;
}

/**
 * Recursively enumerate the file tree of a repository using the Git Trees API.
 */
export async function getRepoTree(
  owner: string,
  repo: string,
  branch: string,
): Promise<RepoTreeResult> {
  const url = `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
  try {
    const res = await ghFetch(url);
    if (!res.ok) return { files: [], truncated: false };
    const data = await res.json();
    return {
      files: data.tree ?? [],
      truncated: Boolean(data.truncated),
    };
  } catch {
    return { files: [], truncated: false };
  }
}

/**
 * Fetch file content for authorized repository scanning.
 */
export async function getFileContent(
  owner: string,
  repo: string,
  path: string,
): Promise<string | null> {
  const url = `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(path)}`;
  try {
    const res = await ghFetch(url);
    if (!res.ok) return null;
    const data: GitHubContent = await res.json();
    if (data.encoding === "base64" && data.content) {
      try {
        return atob(data.content.replace(/\n/g, ""));
      } catch {
        return null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch recent commits with file diff patches to check historical exposure.
 */
export async function getRecentCommitDetails(
  owner: string,
  repo: string,
  branch: string,
  count = 3,
): Promise<GitHubCommitDetail[]> {
  const listUrl = `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?sha=${encodeURIComponent(branch)}&per_page=${count}`;
  try {
    const res = await ghFetch(listUrl);
    if (!res.ok) return [];
    const commits: { sha: string }[] = await res.json();

    const details: GitHubCommitDetail[] = [];
    for (const c of commits.slice(0, count)) {
      const detailUrl = `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(c.sha)}`;
      const detailRes = await ghFetch(detailUrl);
      if (detailRes.ok) {
        details.push(await detailRes.json());
      }
      await sleep(150);
    }
    return details;
  } catch {
    return [];
  }
}

/** Relevant file extensions for source-code & config inspection (Section 3E) */
export const SCANNABLE_EXTENSIONS = new Set([
  ".py",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".java",
  ".go",
  ".php",
  ".rb",
  ".env",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".properties",
  ".xml",
  ".sh",
  ".bash",
  ".zsh",
  ".sql",
  ".tf",
  ".hcl",
  ".cfg",
  ".conf",
  ".config",
]);

/** Known configuration and secret file basenames */
export const HIGH_VALUE_CONFIG_FILES = [
  ".env",
  ".env.local",
  ".env.production",
  ".env.staging",
  ".env.development",
  "config.py",
  "settings.py",
  "config.js",
  "config.ts",
  "docker-compose.yml",
  "docker-compose.yaml",
  "docker-compose.override.yml",
  "Dockerfile",
  "terraform.tfvars",
  "secrets.json",
  "credentials.json",
  "appsettings.json",
  "application.properties",
  "application.yml",
  "database.yml",
  "vault.json",
];

/** Check if a file should be inspected */
export function isEligibleFile(path: string): boolean {
  const lower = path.toLowerCase();
  const basename = lower.split("/").pop() || "";

  // Skip directories and common binary/build artifacts
  const excludedDirs = [
    "node_modules/",
    "vendor/",
    ".git/",
    "dist/",
    "build/",
    ".next/",
    ".nuxt/",
    "coverage/",
    "__pycache__/",
    ".venv/",
    "venv/",
    ".cache/",
  ];
  if (excludedDirs.some((dir) => lower.includes(dir))) return false;

  const binaryOrBundleExts = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".ico",
    ".svg",
    ".webp",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".mp4",
    ".mp3",
    ".webm",
    ".zip",
    ".tar",
    ".gz",
    ".7z",
    ".pdf",
    ".lock",
    ".min.js",
    ".min.css",
    ".bundle.js",
    ".map",
    ".jar",
    ".war",
    ".class",
    ".exe",
    ".bin",
  ];
  if (binaryOrBundleExts.some((ext) => lower.endsWith(ext))) return false;

  // Exact file name match (e.g., Dockerfile, .env)
  if (HIGH_VALUE_CONFIG_FILES.some((f) => basename === f.toLowerCase())) return true;

  // Extension match
  const dotIndex = basename.lastIndexOf(".");
  if (dotIndex !== -1) {
    const ext = basename.slice(dotIndex);
    if (SCANNABLE_EXTENSIONS.has(ext)) return true;
  }

  return false;
}
