import { useState, useRef, useEffect, useCallback } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  FileArchive,
  FileCode2,
  Github,
  Globe,
  Loader2,
  Lock,
  Radar,
  RefreshCw,
  Search,
  Shield,
  Star,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AskPhillNavbar } from "@/components/AskPhillNavbar";
import { getStoredUser, syncSessionFromSupabase, getGitHubAccessToken } from "@/lib/auth-store";
import {
  parseGitHubRepoInput,
  fetchRepositoryMetadata,
  fetchUserRepositories,
  type GitHubRepo,
} from "@/lib/github-api";

export const Route = createFileRoute("/analyze")({
  head: () => ({
    meta: [
      { title: "Analyze Repository — APILOCK" },
      { name: "description", content: "Choose a repository to analyze." },
    ],
  }),
  component: AnalyzePage,
});

type InputMethod = "github" | "url" | "upload";
type UploadState = "idle" | "dragging" | "ready" | "error";

interface SelectedRepo {
  method: InputMethod;
  githubRepo?: GitHubRepo;
  repoUrl?: string;
  zipFile?: File;
  zipName?: string;
}

// ─── Language dot colour ──────────────────────────────────────────────────────
const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572A5",
  Go: "#00ADD8", Rust: "#dea584", Java: "#b07219", Ruby: "#701516",
  "C#": "#178600", "C++": "#f34b7d", PHP: "#4F5D95", Swift: "#F05138",
  Kotlin: "#A97BFF", Vue: "#41b883", Svelte: "#ff3e00",
};

function LangDot({ lang }: { lang: string | null }) {
  if (!lang) return null;
  const color = LANG_COLORS[lang] ?? "#8b8b8b";
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-[var(--color-ink-muted)]">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      {lang}
    </span>
  );
}

function AnalyzePage() {
  const navigate = useNavigate();
  const [method, setMethod] = useState<InputMethod>("github");
  const [mounted, setMounted] = useState(false);

  // ── GitHub repos state ─────────────────────────────────────────────────────
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);
  const [repoSearch, setRepoSearch] = useState("");
  const [hasGithubToken, setHasGithubToken] = useState(false);

  // ── URL state ──────────────────────────────────────────────────────────────
  const [repoUrl, setRepoUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlRepo, setUrlRepo] = useState<GitHubRepo | null>(null);

  // ── Upload state ───────────────────────────────────────────────────────────
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // ── Selected ───────────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<SelectedRepo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Auth + load repos on mount ─────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    syncSessionFromSupabase().then(async (liveUser) => {
      if (!liveUser && !getStoredUser()) {
        window.location.href = "/auth";
        return;
      }
      // Try to get GitHub token from Supabase session
      const token = await getGitHubAccessToken();
      if (token) {
        setHasGithubToken(true);
        loadRepos(token);
      } else {
        // No GitHub token — switch to URL tab
        setMethod("url");
      }
    });
  }, []);

  const loadRepos = useCallback(async (token?: string) => {
    setReposLoading(true);
    setReposError(null);
    try {
      const t = token ?? (await getGitHubAccessToken());
      if (!t) {
        setReposError("No GitHub token found. Please sign in with GitHub to see your repositories.");
        return;
      }
      const repos = await fetchUserRepositories(t);
      if (repos.length === 0) {
        setReposError("No repositories found on your account.");
      } else {
        setGithubRepos(repos);
      }
    } catch {
      setReposError("Failed to load repositories. Please try again.");
    } finally {
      setReposLoading(false);
    }
  }, []);

  // ── URL method ─────────────────────────────────────────────────────────────
  const handleUrlValidate = useCallback(async () => {
    if (!repoUrl.trim()) return;
    setUrlError(null);
    setUrlRepo(null);
    setSelected(null);
    const parsed = parseGitHubRepoInput(repoUrl.trim());
    if (!parsed) {
      setUrlError("Invalid URL. Use https://github.com/owner/repo or owner/repo format.");
      return;
    }
    setUrlLoading(true);
    try {
      const meta = await fetchRepositoryMetadata(parsed.owner, parsed.repo);
      if (!meta) {
        setUrlError(`Repository ${parsed.owner}/${parsed.repo} not found or not publicly accessible.`);
        return;
      }
      setUrlRepo(meta);
      setSelected({ method: "url", githubRepo: meta, repoUrl: meta.html_url });
    } catch {
      setUrlError("Failed to fetch repository. Check the URL and try again.");
    } finally {
      setUrlLoading(false);
    }
  }, [repoUrl]);

  // ── Upload method ──────────────────────────────────────────────────────────
  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith(".zip")) {
      setUploadError("Only .zip files are supported.");
      setUploadState("error");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setUploadError("File size limit is 50 MB.");
      setUploadState("error");
      return;
    }
    setUploadError(null);
    setUploadFile(file);
    setUploadState("ready");
    setSelected({ method: "upload", zipFile: file, zipName: file.name });
  };

  // ── Start analysis ─────────────────────────────────────────────────────────
  const handleStartAnalysis = () => {
    if (!selected) return;
    if ((selected.method === "github" || selected.method === "url") && selected.githubRepo) {
      navigate({
        to: "/scan/$id",
        params: { id: `gh-${selected.githubRepo.full_name.replace("/", "-")}-${Date.now()}` },
        search: { repoUrl: selected.githubRepo.html_url },
      });
    } else if (selected.method === "upload" && selected.zipFile) {
      navigate({
        to: "/scan/$id",
        params: { id: `zip-${Date.now()}` },
        search: { zipName: selected.zipFile.name, zipSize: String(selected.zipFile.size) },
      });
    }
  };

  // ── Filtered repos ─────────────────────────────────────────────────────────
  const filteredRepos = githubRepos.filter((r) => {
    if (!repoSearch.trim()) return true;
    const q = repoSearch.toLowerCase();
    return r.full_name.toLowerCase().includes(q) ||
      (r.description ?? "").toLowerCase().includes(q) ||
      (r.language ?? "").toLowerCase().includes(q);
  });

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[var(--color-paper)] flex items-center justify-center">
        <Radar className="w-8 h-8 text-[#bef264] animate-pulse" />
      </div>
    );
  }

  const tabs: { id: InputMethod; icon: React.ElementType; label: string; show: boolean }[] = [
    { id: "github", icon: Github, label: "My GitHub Repos", show: true },
    { id: "url", icon: Globe, label: "Paste URL", show: true },
    { id: "upload", icon: FileArchive, label: "Upload ZIP", show: true },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-paper)]">
      {/* Ask Phill Style Navbar matching Homepage */}
      <AskPhillNavbar />

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Title */}
        <div className="mb-7">
          <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider text-[#5a7a00] bg-[#bef264]/20 border border-[#bef264]/30 rounded-full px-3 py-1 mb-3">
            <FileCode2 className="w-3.5 h-3.5" />
            REPOSITORY ANALYSIS
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-ink)] mb-2">
            Choose a repository to analyze
          </h1>
          <p className="text-sm text-[var(--color-ink-muted)]">
            Select from your GitHub repos, paste a URL, or upload a ZIP.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-[var(--color-accent)] rounded-xl mb-6">
          {tabs.filter((t) => t.show).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => {
                setMethod(id);
                setSelected(null);
                setUrlRepo(null);
                setUrlError(null);
                setUploadError(null);
                setUploadState("idle");
                setUploadFile(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
                method === id
                  ? "bg-[var(--card)] text-[var(--color-ink)] shadow-sm border border-[var(--color-border)]"
                  : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* ── TAB: My GitHub Repos ── */}
        {method === "github" && (
          <div className="space-y-4">
            <div className="bg-[var(--card)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
              {/* Search bar + refresh */}
              <div className="p-4 border-b border-[var(--color-border)] flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
                  <input
                    type="text"
                    value={repoSearch}
                    onChange={(e) => setRepoSearch(e.target.value)}
                    placeholder="Search repositories…"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] text-sm text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] outline-none focus:border-[#bef264] transition-all"
                  />
                </div>
                <button
                  onClick={() => loadRepos()}
                  disabled={reposLoading}
                  className="p-2 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-accent)] transition-colors text-[var(--color-ink-muted)] disabled:opacity-40"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${reposLoading ? "animate-spin" : ""}`} />
                </button>
              </div>

              {/* Repo list */}
              <div className="divide-y divide-[var(--color-border)] max-h-[420px] overflow-y-auto">
                {reposLoading && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--color-ink-muted)]" />
                    <p className="text-sm text-[var(--color-ink-muted)]">Loading your repositories…</p>
                  </div>
                )}

                {!reposLoading && reposError && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center">
                    <Github className="w-8 h-8 text-[var(--color-ink-muted)]" />
                    <p className="text-sm text-[var(--color-ink-muted)]">{reposError}</p>
                    {!hasGithubToken && (
                      <a
                        href="/auth"
                        className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-xl bg-[var(--color-ink)] text-[var(--color-paper)] text-sm font-semibold hover:bg-[var(--color-marker)] transition-colors"
                      >
                        <Github className="w-4 h-4" />
                        Sign in with GitHub
                      </a>
                    )}
                  </div>
                )}

                {!reposLoading && !reposError && filteredRepos.length === 0 && githubRepos.length > 0 && (
                  <div className="py-10 text-center text-sm text-[var(--color-ink-muted)]">
                    No repositories match "{repoSearch}"
                  </div>
                )}

                {!reposLoading && !reposError && filteredRepos.map((repo) => {
                  const isSelected = selected?.githubRepo?.id === repo.id;
                  return (
                    <button
                      key={repo.id}
                      onClick={() => setSelected({ method: "github", githubRepo: repo, repoUrl: repo.html_url })}
                      className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors ${
                        isSelected
                          ? "bg-[#bef264]/15 border-l-2 border-[#bef264]"
                          : "hover:bg-[var(--color-accent)]/60"
                      }`}
                    >
                      {/* Selected indicator */}
                      <div className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected ? "border-[#5a7a00] bg-[#bef264]" : "border-[var(--color-border)]"
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#2d4a00]" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-[var(--color-ink)] truncate">
                            {repo.full_name}
                          </span>
                          {repo.visibility === "private" && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
                              <Lock className="w-2.5 h-2.5" /> Private
                            </span>
                          )}
                        </div>
                        {repo.description && (
                          <p className="text-xs text-[var(--color-ink-muted)] mt-0.5 line-clamp-1">
                            {repo.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <LangDot lang={repo.language} />
                          {repo.stargazers_count > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-[var(--color-ink-muted)]">
                              <Star className="w-2.5 h-2.5" />
                              {repo.stargazers_count.toLocaleString()}
                            </span>
                          )}
                          <span className="text-[10px] text-[var(--color-ink-muted)]">
                            {new Date(repo.pushed_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-[#5a7a00] flex-shrink-0 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>

              {!reposLoading && !reposError && githubRepos.length > 0 && (
                <div className="px-4 py-2.5 border-t border-[var(--color-border)] bg-[var(--color-paper)]">
                  <span className="text-[10px] text-[var(--color-ink-muted)]">
                    {filteredRepos.length} of {githubRepos.length} repositories
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: Paste URL ── */}
        {method === "url" && (
          <div className="space-y-4">
            <div className="bg-[var(--card)] border border-[var(--color-border)] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <Globe className="w-4 h-4 text-[var(--color-ink-muted)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">GitHub Repository URL</span>
              </div>
              <p className="text-xs text-[var(--color-ink-muted)] mb-4">
                Paste any public GitHub repository URL to analyze it.
              </p>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Github className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => { setRepoUrl(e.target.value); setUrlError(null); setUrlRepo(null); setSelected(null); }}
                    onKeyDown={(e) => e.key === "Enter" && handleUrlValidate()}
                    placeholder="https://github.com/username/repository"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] text-sm text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] outline-none focus:border-[#bef264] focus:ring-2 focus:ring-[#bef264]/20 transition-all font-mono"
                  />
                </div>
                <Button
                  onClick={handleUrlValidate}
                  disabled={!repoUrl.trim() || urlLoading}
                  className="bg-[var(--color-ink)] text-[var(--color-paper)] hover:bg-[var(--color-marker)] font-semibold text-sm px-5 h-auto"
                >
                  {urlLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>

              {urlError && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  <X className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  {urlError}
                </div>
              )}

              {urlRepo && (
                <div className="mt-4 p-4 rounded-xl bg-[#bef264]/10 border border-[#bef264]/30">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#5a7a00] flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-[var(--color-ink)]">{urlRepo.full_name}</span>
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">PUBLIC</span>
                      </div>
                      {urlRepo.description && (
                        <p className="text-xs text-[var(--color-ink-muted)] mt-1 line-clamp-2">{urlRepo.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <LangDot lang={urlRepo.language} />
                        <span className="text-[10px] text-[var(--color-ink-muted)]">★ {urlRepo.stargazers_count.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="text-xs text-[var(--color-ink-muted)]">
              <span className="font-semibold">Examples: </span>
              {["expressjs/express", "fastapi/fastapi", "vuejs/vue"].map((r) => (
                <button
                  key={r}
                  onClick={() => { setRepoUrl(`https://github.com/${r}`); setUrlError(null); setUrlRepo(null); setSelected(null); }}
                  className="ml-2 text-[var(--color-ink)] hover:text-[var(--color-marker)] font-mono font-medium transition-colors"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB: Upload ZIP ── */}
        {method === "upload" && (
          <div className="space-y-4">
            <div className="bg-[var(--card)] border border-[var(--color-border)] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <FileArchive className="w-4 h-4 text-[var(--color-ink-muted)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">Upload Repository ZIP</span>
              </div>
              <p className="text-xs text-[var(--color-ink-muted)] mb-4">
                GitHub → Code → Download ZIP, then upload here. Max 50 MB.
              </p>

              <div
                onDragOver={(e) => { e.preventDefault(); setUploadState("dragging"); }}
                onDragLeave={() => setUploadState(uploadFile ? "ready" : "idle")}
                onDrop={(e) => { e.preventDefault(); setUploadState("idle"); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-3 p-10 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                  uploadState === "dragging" ? "border-[#bef264] bg-[#bef264]/10"
                  : uploadState === "ready" ? "border-emerald-400 bg-emerald-50"
                  : uploadState === "error" ? "border-red-300 bg-red-50"
                  : "border-[var(--color-border)] hover:border-[#bef264]/50 hover:bg-[var(--color-accent)]"
                }`}
              >
                <input ref={fileInputRef} type="file" accept=".zip" className="sr-only"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />

                {uploadState === "ready" && uploadFile ? (
                  <>
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    <div className="text-center">
                      <div className="text-sm font-bold text-[var(--color-ink)]">{uploadFile.name}</div>
                      <div className="text-xs text-[var(--color-ink-muted)] mt-0.5">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setUploadFile(null); setUploadState("idle"); setSelected(null); }}
                      className="text-xs text-[var(--color-ink-muted)] hover:text-red-600 transition-colors flex items-center gap-1">
                      <X className="w-3 h-3" /> Remove
                    </button>
                  </>
                ) : (
                  <>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${uploadState === "error" ? "bg-red-100" : "bg-[var(--color-accent)]"}`}>
                      <Upload className={`w-6 h-6 ${uploadState === "error" ? "text-red-500" : "text-[var(--color-ink-muted)]"}`} />
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-semibold text-[var(--color-ink)]">Drop ZIP here, or click to browse</div>
                      <div className="text-xs text-[var(--color-ink-muted)] mt-1">.zip · Max 50 MB</div>
                    </div>
                  </>
                )}
              </div>

              {uploadError && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  <X className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{uploadError}
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
              <Shield className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600" />
              Uploaded code is never executed — only statically inspected in your browser.
            </div>
          </div>
        )}

        {/* Start Analysis */}
        <div className="mt-6">
          <Button
            onClick={handleStartAnalysis}
            disabled={!selected}
            className={`w-full font-bold text-sm py-3.5 h-auto rounded-xl transition-all flex items-center justify-center gap-2 ${
              selected
                ? "bg-[#bef264] text-black hover:bg-[#a3e635] shadow-lg shadow-[#bef264]/20"
                : "bg-[var(--color-accent)] text-[var(--color-ink-muted)] cursor-not-allowed"
            }`}
          >
            {selected ? (
              <>Start Analysis — {selected.githubRepo?.full_name ?? selected.zipName}<ArrowRight className="w-4 h-4" /></>
            ) : (
              "Select a repository to begin"
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
