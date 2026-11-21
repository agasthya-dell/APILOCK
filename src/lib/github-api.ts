/**
 * APILOCK — GitHub API Client for Global Repository Discovery & File Inspection
 *
 * Capabilities:
 * - Discover public repositories worldwide across multiple sectors, languages, and organizations
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

export interface GitHubSearchResult {
  total_count: number;
  items: GitHubRepo[];
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

export interface RateLimitStatus {
  limit: number;
  remaining: number;
  resetTime: number;
}

const GITHUB_API = "https://api.github.com";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Global multi-domain discovery queries for worldwide coverage */
export const GLOBAL_DISCOVERY_QUERIES = [
  // AI & Large Language Models
  "topic:llm language:python stars:>10",
  "topic:openai language:typescript stars:>5",
  "topic:langchain language:python stars:>15",
  "topic:machine-learning language:python stars:>20",
  // Cloud Infrastructure & DevOps
  "topic:terraform language:hcl stars:>5",
  "topic:kubernetes language:yaml stars:>15",
  "topic:aws language:python stars:>15",
  "topic:cloud language:go stars:>15",
  // Payment, Billing & FinTech
  "topic:fintech language:typescript stars:>5",
  "topic:stripe language:python stars:>5",
  "topic:ecommerce language:javascript stars:>15",
  // Backend Services & Microservices
  "topic:backend language:go stars:>20",
  "topic:microservices language:java stars:>15",
  "topic:api-gateway language:typescript stars:>10",
  "topic:database language:rust stars:>15",
  // Cross-Language Open Source Projects
  "language:python stars:>50",
  "language:typescript stars:>50",
  "language:go stars:>50",
];

let lastRateLimitStatus: RateLimitStatus = {
  limit: 60,
  remaining: 60,
  resetTime: Date.now() + 3600000,
};

export function getRateLimitStatus(): RateLimitStatus {
  return lastRateLimitStatus;
}

/** Fetch with exponential backoff and rate-limit detection */
async function ghFetch(url: string, attempt = 0): Promise<Response> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  // Track rate limit headers
  const limitHeader = res.headers.get("x-ratelimit-limit");
  const remainingHeader = res.headers.get("x-ratelimit-remaining");
  const resetHeader = res.headers.get("x-ratelimit-reset");

  if (limitHeader && remainingHeader && resetHeader) {
    lastRateLimitStatus = {
      limit: parseInt(limitHeader, 10),
      remaining: parseInt(remainingHeader, 10),
      resetTime: parseInt(resetHeader, 10) * 1000,
    };
  }

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
  const clean = input.trim().replace(/\.git$/i, "").replace(/\/$/, "");

  // Match URL format
  const urlMatch = clean.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/i);
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
export async function fetchRepositoryMetadata(owner: string, repo: string): Promise<GitHubRepo | null> {
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
 * Uses pagination and persists discovery checkpoints to resume seamlessly.
 */
export async function discoverNextBatch(
  checkpoint: { queryIndex: number; page: number },
  maxResults = 25,
  onProgress?: (msg: string) => void,
): Promise<{
  repos: GitHubRepo[];
  nextCheckpoint: { queryIndex: number; page: number };
}> {
  let { queryIndex, page } = checkpoint;
  if (queryIndex >= GLOBAL_DISCOVERY_QUERIES.length) {
    queryIndex = 0;
    page = 1;
  }

  const query = GLOBAL_DISCOVERY_QUERIES[queryIndex]!;
  onProgress?.(`Global discovery: query [${queryIndex + 1}/${GLOBAL_DISCOVERY_QUERIES.length}] page ${page}...`);

  // Global search for existing established public repositories worldwide
  const url = `${GITHUB_API}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${maxResults}&page=${page}`;

  try {
    const res = await ghFetch(url);
    if (!res.ok) {
      onProgress?.(`GitHub API returned status ${res.status}. Advancing query checkpoint.`);
      return {
        repos: [],
        nextCheckpoint: { queryIndex: (queryIndex + 1) % GLOBAL_DISCOVERY_QUERIES.length, page: 1 },
      };
    }

    const data: GitHubSearchResult = await res.json();
    const items = data.items || [];

    let nextQueryIndex = queryIndex;
    let nextPage = page + 1;
    if (items.length < maxResults || nextPage > 5) {
      nextQueryIndex = (queryIndex + 1) % GLOBAL_DISCOVERY_QUERIES.length;
      nextPage = 1;
    }

    onProgress?.(`Discovered ${items.length} repositories from global search query.`);
    return {
      repos: items,
      nextCheckpoint: { queryIndex: nextQueryIndex, page: nextPage },
    };
  } catch (err) {
    onProgress?.(`Discovery connection timeout or error. Retrying later.`);
    return {
      repos: [],
      nextCheckpoint: { queryIndex, page },
    };
  }
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
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp",
    ".woff", ".woff2", ".ttf", ".eot",
    ".mp4", ".mp3", ".webm", ".zip", ".tar", ".gz", ".7z",
    ".pdf", ".lock", ".min.js", ".min.css", ".bundle.js", ".map",
    ".jar", ".war", ".class", ".exe", ".bin",
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
