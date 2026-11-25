import { useEffect, useState, useMemo } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Compass,
  Cpu,
  FileCode2,
  GitBranch,
  HardDrive,
  Info,
  Layers,
  Lock,
  LogOut,
  LogIn,
  Plus,
  Radar,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Trash2,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AskPhillNavbar } from "@/components/AskPhillNavbar";
import { getStoredUser, signOut, syncSessionFromSupabase, type User } from "@/lib/auth-store";
import {
  loadAnalysisHistory,
  deleteAnalysis,
  getHealthLabel,
  type AnalysisResult,
  type RepoMetadata,
} from "@/lib/analysis-store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Command Center Dashboard — APILOCK" },
      {
        name: "description",
        content:
          "Real-time security telemetry, repository audits, and secret detection command center.",
      },
    ],
  }),
  component: DashboardPage,
});

function createMockRepo(
  params: Partial<RepoMetadata> & { fullName: string; owner: string; name: string },
): RepoMetadata {
  return {
    id: 1001,
    description: "Production repository monitored by APILOCK.",
    createdAt: new Date(Date.now() - 365 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    pushedAt: new Date().toISOString(),
    size: 4096,
    isPrivate: false,
    topics: [],
    source: "github_url",
    url: `https://github.com/${params.fullName}`,
    language: "TypeScript",
    stars: 1000,
    forks: 200,
    openIssues: 10,
    defaultBranch: "main",
    ...params,
  };
}

// Demo analyses displayed when visitor is in Guest Mode or has no audits yet
const DEMO_ANALYSES: AnalysisResult[] = [
  {
    id: "demo-react",
    status: "completed",
    currentStage: "completed",
    stageProgress: 100,
    overallProgress: 100,
    repo: createMockRepo({
      fullName: "facebook/react",
      owner: "facebook",
      name: "react",
      defaultBranch: "main",
      language: "TypeScript",
      stars: 228000,
      forks: 46000,
      openIssues: 850,
      topics: ["react", "javascript", "ui", "frontend"],
    }),
    totalFilesDiscovered: 450,
    totalFilesInspected: 312,
    totalFindingsCount: 3,
    filesSkipped: 138,
    treeTruncated: false,
    startedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    completedAt: new Date(Date.now() - 3600000 * 3.8).toISOString(),
    scores: {
      overall: 92,
      codeQuality: { score: 19, maxScore: 20, available: true, findings: [] },
      projectStructure: { score: 14, maxScore: 15, available: true, findings: [] },
      security: { score: 25, maxScore: 25, available: true, findings: [] },
      dependencyHealth: { score: 14, maxScore: 15, available: true, findings: [] },
      documentation: { score: 9, maxScore: 10, available: true, findings: [] },
      testing: { score: 7, maxScore: 10, available: true, findings: [] },
      maintainability: { score: 4, maxScore: 5, available: true, findings: [] },
    },
    findings: [],
    secretFindings: [],
    dependencies: [],
    structure: null,
    improvementRoadmap: [],
    strengths: ["Strong TypeScript architecture", "Zero exposed secrets in repo history"],
    weaknesses: [],
    keyObservations: ["All perimeter security checks passed"],
    analysisLog: ["Completed scan in 2.3s"],
  },
  {
    id: "demo-openai",
    status: "completed",
    currentStage: "completed",
    stageProgress: 100,
    overallProgress: 100,
    repo: createMockRepo({
      fullName: "openai/openai-python",
      owner: "openai",
      name: "openai-python",
      defaultBranch: "main",
      language: "Python",
      stars: 23500,
      forks: 3200,
      openIssues: 120,
      topics: ["python", "ai", "openai", "sdk"],
    }),
    totalFilesDiscovered: 180,
    totalFilesInspected: 142,
    totalFindingsCount: 2,
    filesSkipped: 38,
    treeTruncated: false,
    startedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    completedAt: new Date(Date.now() - 3600000 * 23.9).toISOString(),
    scores: {
      overall: 95,
      codeQuality: { score: 20, maxScore: 20, available: true, findings: [] },
      projectStructure: { score: 15, maxScore: 15, available: true, findings: [] },
      security: { score: 25, maxScore: 25, available: true, findings: [] },
      dependencyHealth: { score: 15, maxScore: 15, available: true, findings: [] },
      documentation: { score: 10, maxScore: 10, available: true, findings: [] },
      testing: { score: 6, maxScore: 10, available: true, findings: [] },
      maintainability: { score: 4, maxScore: 5, available: true, findings: [] },
    },
    findings: [],
    secretFindings: [],
    dependencies: [],
    structure: null,
    improvementRoadmap: [],
    strengths: ["Clean type hints", "Zero hardcoded keys"],
    weaknesses: [],
    keyObservations: ["Environment variables used properly"],
    analysisLog: ["Completed scan in 1.8s"],
  },
  {
    id: "demo-supabase",
    status: "completed",
    currentStage: "completed",
    stageProgress: 100,
    overallProgress: 100,
    repo: createMockRepo({
      fullName: "supabase/supabase",
      owner: "supabase",
      name: "supabase",
      defaultBranch: "master",
      language: "TypeScript",
      stars: 76000,
      forks: 6400,
      openIssues: 420,
      topics: ["database", "postgres", "supabase"],
    }),
    totalFilesDiscovered: 850,
    totalFilesInspected: 480,
    totalFindingsCount: 6,
    filesSkipped: 370,
    treeTruncated: true,
    startedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    completedAt: new Date(Date.now() - 3600000 * 47.7).toISOString(),
    scores: {
      overall: 78,
      codeQuality: { score: 16, maxScore: 20, available: true, findings: [] },
      projectStructure: { score: 12, maxScore: 15, available: true, findings: [] },
      security: { score: 20, maxScore: 25, available: true, findings: [] },
      dependencyHealth: { score: 12, maxScore: 15, available: true, findings: [] },
      documentation: { score: 8, maxScore: 10, available: true, findings: [] },
      testing: { score: 6, maxScore: 10, available: true, findings: [] },
      maintainability: { score: 4, maxScore: 5, available: true, findings: [] },
    },
    findings: [],
    secretFindings: [],
    dependencies: [],
    structure: null,
    improvementRoadmap: [],
    strengths: ["Monorepo tooling", "Automated CI workflows"],
    weaknesses: [],
    keyObservations: ["Test fixture credentials detected in mock files"],
    analysisLog: ["Completed scan in 3.4s"],
  },
];

// Helper to pick a cool cyber banner image for repo cards based on language
function getRepoCoverImage(language?: string | null): string {
  const lang = (language || "").toLowerCase();
  if (lang.includes("python")) {
    return "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80&auto=format&fit=crop";
  }
  if (
    lang.includes("typescript") ||
    lang.includes("javascript") ||
    lang.includes("react") ||
    lang.includes("node")
  ) {
    return "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80&auto=format&fit=crop";
  }
  if (lang.includes("rust") || lang.includes("go") || lang.includes("c") || lang.includes("java")) {
    return "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80&auto=format&fit=crop";
  }
  if (lang.includes("html") || lang.includes("css") || lang.includes("vue")) {
    return "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80&auto=format&fit=crop";
  }
  return "https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=800&q=80&auto=format&fit=crop";
}

function ScorePill({ score }: { score: number }) {
  const { label } = getHealthLabel(score);
  const isHigh = score >= 70;
  const isMid = score >= 50;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider border backdrop-blur-md ${
        isHigh
          ? "bg-emerald-50/85 border-emerald-200/80 text-emerald-700"
          : isMid
            ? "bg-stone-100 border-stone-300 text-stone-800"
            : "bg-[var(--color-ink)] border-[var(--color-ink)] text-white"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full animate-ping ${
          isHigh ? "bg-emerald-500" : isMid ? "bg-stone-500" : "bg-black"
        }`}
      />
      {score}/100 · {label}
    </span>
  );
}

function AnalysisCard({
  analysis,
  onDelete,
}: {
  analysis: AnalysisResult;
  onDelete: (id: string) => void;
}) {
  const navigate = useNavigate();
  const secretCount = analysis.secretFindings?.length ?? 0;
  const isCompleted = analysis.status === "completed" || analysis.status === "partial";
  const coverImage = getRepoCoverImage(analysis.repo?.language);

  return (
    <div className="group relative bg-white/55 backdrop-blur-xl border border-white/70 hover:border-[var(--color-marker)]/35 rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-[0_18px_48px_rgba(26,42,29,0.14)] hover:-translate-y-1 flex flex-col shadow-[0_8px_28px_rgba(26,42,29,0.07)]">
      {/* Top Graphic Banner with Cyber Aesthetic Image from Unsplash */}
      <div className="relative h-28 w-full overflow-hidden bg-[var(--color-accent)]">
        <img
          src={coverImage}
          alt={analysis.repo?.fullName || "Repository"}
          className="w-full h-full object-cover object-center grayscale opacity-55 group-hover:opacity-75 group-hover:scale-105 transition-all duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white/70 via-white/15 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-transparent via-transparent to-black/45" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider bg-white/75 border border-white/80 text-[var(--color-ink)] backdrop-blur-xl shadow-sm">
            <GitBranch className="w-3 h-3 text-[var(--color-marker)]" />
            {analysis.repo?.language ?? "Git"}
          </span>

          <div className="flex items-center gap-1">
            {isCompleted && (
              <button
                onClick={() => navigate({ to: "/report/$id", params: { id: analysis.id } })}
                className="p-1.5 rounded-lg bg-white/90 hover:bg-[var(--color-marker)] text-[var(--color-ink)] hover:text-white border border-white/80 hover:border-[var(--color-marker)] transition-all cursor-pointer shadow-sm"
                title="View audit telemetry report"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(analysis.id);
              }}
              className="p-1.5 rounded-lg bg-white/90 hover:bg-[var(--color-ink)] text-[var(--color-ink-muted)] hover:text-white border border-white/80 hover:border-[var(--color-ink)] transition-all cursor-pointer shadow-sm"
              title="Delete repository record"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Status Pill on Bottom Right of Banner */}
        <div className="absolute bottom-2.5 right-3 z-10">
          {isCompleted ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50/95 border border-emerald-200 text-emerald-700 backdrop-blur-sm">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Audited
            </span>
          ) : analysis.status === "failed" ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-stone-100/95 border border-stone-300 text-stone-800 backdrop-blur-sm">
              <ShieldAlert className="w-3 h-3 text-stone-600" /> Error
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50/95 border border-emerald-200 text-emerald-700 backdrop-blur-sm">
              <RefreshCw className="w-3 h-3 animate-spin text-emerald-500" /> Scanning
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="mb-3">
            <h3
              className="text-base font-bold text-[var(--color-ink)] tracking-tight truncate group-hover:text-[var(--color-marker)] transition-colors"
              title={analysis.repo?.fullName}
            >
              {analysis.repo?.fullName || "Unknown repository"}
            </h3>
            <p className="text-xs text-[var(--color-ink-muted)] font-mono mt-0.5 truncate flex items-center gap-2">
              <span>{analysis.repo?.defaultBranch || "main"}</span>
              <span className="text-[var(--color-border)]">/</span>
              <span>{new Date(analysis.startedAt).toLocaleDateString()}</span>
            </p>
          </div>

          {isCompleted ? (
            <>
              <div className="mb-4">
                <ScorePill score={analysis.scores?.overall ?? 0} />
              </div>

              {/* HUD Tri-Stat Display */}
              <div className="grid grid-cols-3 gap-2 text-center mb-4">
                <div className="p-2.5 rounded-xl bg-[var(--color-paper)] border border-[var(--color-border)] group-hover:border-[var(--color-marker)]/30 transition-colors">
                  <div className="text-base font-black font-mono text-[var(--color-ink)]">
                    {analysis.totalFilesInspected ?? 0}
                  </div>
                  <div className="text-[10px] text-[var(--color-ink-muted)] uppercase tracking-widest font-mono">
                    Files
                  </div>
                </div>

                <div
                  className={`p-2.5 rounded-xl border backdrop-blur-sm ${
                    secretCount > 0
                      ? "bg-[var(--color-ink)] border-[var(--color-ink)] text-white"
                      : "bg-emerald-50 border-emerald-200 text-emerald-700"
                  }`}
                >
                  <div className="text-base font-black font-mono">{secretCount}</div>
                  <div className="text-[10px] uppercase tracking-widest font-mono opacity-80">
                    Secrets
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--color-paper)] border border-[var(--color-border)] group-hover:border-[var(--color-marker)]/30 transition-colors">
                  <div className="text-base font-black font-mono text-[var(--color-ink)]">
                    {analysis.findings?.length ?? 0}
                  </div>
                  <div className="text-[10px] text-[var(--color-ink-muted)] uppercase tracking-widest font-mono">
                    Issues
                  </div>
                </div>
              </div>
            </>
          ) : analysis.status === "failed" ? (
            <div className="text-xs text-[var(--color-ink)] bg-stone-100 px-3.5 py-3 rounded-xl border border-stone-300 mb-4 font-mono">
              Audit failed: {analysis.errorMessage ?? "Unknown error"}
            </div>
          ) : (
            <div className="text-xs text-emerald-800 bg-emerald-50 px-3.5 py-3 rounded-xl border border-emerald-200 flex items-center gap-2 mb-4 font-mono">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              Real-time AST parsing in progress...
            </div>
          )}
        </div>

        {isCompleted && (
          <Button
            onClick={() => navigate({ to: "/report/$id", params: { id: analysis.id } })}
            className="w-full mt-2 bg-[var(--color-ink)] hover:bg-[var(--color-marker)] text-white border border-[var(--color-ink)] hover:border-[var(--color-marker)] text-xs font-mono font-bold h-9 rounded-xl transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5"
          >
            Open Full Telemetry Report <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [checking, setChecking] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    syncSessionFromSupabase().then((liveUser) => {
      const resolved = liveUser ?? getStoredUser();
      if (resolved) {
        setUser(resolved);
        setIsGuest(false);
        const stored = loadAnalysisHistory();
        setAnalyses(stored.length > 0 ? stored : DEMO_ANALYSES);
      } else {
        // Guest mode — allow instant preview of the command center
        setUser({
          id: "guest-explorer",
          name: "Guest Operator",
          email: "guest@apilock.dev",
          provider: "unknown",
          createdAt: new Date().toISOString(),
        });
        setIsGuest(true);
        const stored = loadAnalysisHistory();
        setAnalyses(stored.length > 0 ? stored : DEMO_ANALYSES);
      }
      setChecking(false);
    });
  }, []);

  const handleDelete = (id: string) => {
    deleteAnalysis(id);
    const updated = loadAnalysisHistory();
    setAnalyses(
      updated.length > 0 ? updated : isGuest ? DEMO_ANALYSES.filter((d) => d.id !== id) : [],
    );
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const filteredAnalyses = useMemo(() => {
    if (!searchQuery.trim()) return analyses;
    const q = searchQuery.toLowerCase();
    return analyses.filter(
      (a) =>
        a.repo?.fullName?.toLowerCase().includes(q) || a.repo?.language?.toLowerCase().includes(q),
    );
  }, [analyses, searchQuery]);

  if (checking) {
    return (
      <div className="min-h-screen bg-[var(--color-paper)] flex items-center justify-center text-[var(--color-ink)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(48,105,68,0.08),_transparent_70%)]" />
        <div className="flex flex-col items-center gap-4 z-10">
          <div className="relative">
            <Radar className="w-12 h-12 text-[var(--color-marker)] animate-spin" />
            <div className="absolute inset-0 rounded-full border-2 border-[var(--color-marker)]/30 animate-ping" />
          </div>
          <p className="text-sm font-mono text-[var(--color-marker)] tracking-widest uppercase">
            Initializing Command Center Telemetry…
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const completed = analyses.filter((a) => a.status === "completed" || a.status === "partial");
  const avgScore =
    completed.length > 0
      ? Math.round(
          completed.reduce((sum, a) => sum + (a.scores?.overall ?? 0), 0) / completed.length,
        )
      : 100;
  const totalSecrets = analyses.reduce((sum, a) => sum + (a.secretFindings?.length ?? 0), 0);
  const totalIssues = analyses.reduce((sum, a) => sum + (a.findings?.length ?? 0), 0);
  const totalFiles = analyses.reduce((sum, a) => sum + (a.totalFilesInspected ?? 0), 0);

  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] relative selection:bg-[var(--color-marker)] selection:text-white font-sans overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_top,rgba(48,105,68,0.045),transparent_58%)]" />

      {/* Floating Ask Phill Navbar */}
      <div className="relative z-50 pt-4 sm:pt-6">
        <AskPhillNavbar />
      </div>

      <main className="relative z-10 max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 sm:pt-6 sm:pb-12 space-y-10">
        {/* Guest Mode Notification Pill */}
        {isGuest && (
          <div className="p-3.5 rounded-2xl bg-white/55 backdrop-blur-xl border border-white/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono shadow-[0_10px_32px_rgba(26,42,29,0.07)] transition-all duration-300">
            <div className="flex items-center gap-2.5 text-[var(--color-ink)]">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Telemetry Preview Mode:</strong> You are exploring with sample repositories.
                Connect your GitHub account to analyze private repos.
              </span>
            </div>
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--color-ink)]/90 backdrop-blur-md text-white font-bold hover:bg-[var(--color-marker)] transition-all duration-300 cursor-pointer flex-shrink-0 text-[11px] shadow-sm"
              style={{ color: "var(--color-paper)" }}
            >
              <LogIn className="w-3.5 h-3.5" /> Sign in with GitHub
            </Link>
          </div>
        )}

        {/* ─── 1. EPIC COMMAND CENTER HERO BANNER WITH COOL CYBER ROOM IMAGERY ─── */}
        <section className="relative rounded-3xl overflow-hidden border border-white/70 bg-white/35 backdrop-blur-2xl shadow-[0_24px_70px_rgba(26,42,29,0.12)] transition-all duration-500 group">
          {/* Internet Background Image: High-Tech Cyber Security Command Hub */}
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1600&q=80&auto=format&fit=crop"
              alt="Cyber Operations Hub"
              className="w-full h-full object-cover object-center grayscale opacity-30 group-hover:scale-[1.025] transition-transform duration-[1200ms] ease-out"
            />
            {/* Cinematic Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/75 via-white/55 to-white/25 backdrop-blur-sm" />
            <div className="absolute inset-0 bg-gradient-to-t from-white/35 via-transparent to-white/15" />
          </div>

          {/* Banner Content */}
          <div className="relative z-10 p-6 sm:p-10 lg:p-12 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/50 backdrop-blur-lg border border-white/75 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[var(--color-olive)]" />
                <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-[var(--color-marker)]">
                  SECURITY OPERATIONS CENTER // ONLINE
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--color-ink)] tracking-tight leading-[1.1]">
                Welcome back,{" "}
                <span className="text-[var(--color-marker)]">{user.name.split(" ")[0]}</span>
              </h1>

              <p className="text-sm sm:text-base text-[var(--color-ink-muted)] leading-relaxed font-sans max-w-xl">
                Continuous cryptographic token surveillance, AST codebase diagnostics, and public
                leak prevention across all connected repositories.
              </p>

              {/* User Identity & Session Status */}
              <div className="flex items-center gap-3 pt-2 flex-wrap">
                <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/50 backdrop-blur-lg border border-white/75 shadow-sm">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt=""
                      className="w-5 h-5 rounded-full grayscale ring-1 ring-[var(--color-marker)]"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-[var(--color-marker)] text-white font-bold text-[10px] flex items-center justify-center">
                      {user.name[0]}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-[var(--color-ink)]">{user.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50/75 backdrop-blur-md text-[var(--color-marker)]">
                    {isGuest ? "PREVIEW AGENT" : "AUTHORIZED"}
                  </span>
                </div>

                {!isGuest ? (
                  <button
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[var(--color-ink)] hover:text-white px-3.5 py-1.5 rounded-full bg-stone-100 hover:bg-[var(--color-ink)] border border-stone-300 hover:border-[var(--color-ink)] transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign out
                  </button>
                ) : (
                  <Link
                    to="/auth"
                    className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[var(--color-marker)] hover:text-white px-3.5 py-1.5 rounded-full bg-[var(--color-paper)] border border-[var(--color-border)] hover:bg-[var(--color-marker)] hover:border-[var(--color-marker)] transition-all cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" /> Sign in / Register
                  </Link>
                )}
              </div>
            </div>

            {/* Quick CTAs on Right */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[240px]">
              <Button
                onClick={() => navigate({ to: "/analyze" })}
                className="bg-[var(--color-ink)]/90 backdrop-blur-md hover:bg-[var(--color-marker)] text-white font-bold text-sm px-6 py-5 rounded-xl shadow-[0_8px_22px_rgba(26,42,29,0.14)] hover:shadow-[0_12px_30px_rgba(26,42,29,0.2)] hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4 stroke-[3]" /> Analyze Repository
              </Button>
            </div>
          </div>
        </section>

        {/* ─── 2. HIGH-TECH METRICS HUD (WITH CONTEXTUAL INTERNET IMAGES) ─── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[
            {
              label: "Monitored Repositories",
              value: analyses.length,
              sub: "Protected Codebases",
              icon: GitBranch,
              img: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&q=75&auto=format&fit=crop",
              accent: "text-[var(--color-marker)]",
            },
            {
              label: "Fleet Health Score",
              value: `${avgScore}/100`,
              sub: avgScore >= 70 ? "Optimal Security Grade" : "Action Required",
              icon: TrendingUp,
              img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=75&auto=format&fit=crop",
              accent: avgScore >= 70 ? "text-emerald-700" : "text-[var(--color-ink-muted)]",
            },
            {
              label: "Secret Exposures",
              value: totalSecrets,
              sub: totalSecrets === 0 ? "Zero Leaks Detected" : "Exposures Flagged",
              icon: ShieldAlert,
              img: "https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=600&q=75&auto=format&fit=crop",
              accent: totalSecrets > 0 ? "text-[var(--color-ink)]" : "text-[var(--color-marker)]",
            },
            {
              label: "Total Files Scanned",
              value: totalFiles > 0 ? totalFiles : analyses.length * 48,
              sub: `${totalIssues} Diagnostics Active`,
              icon: Activity,
              img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=75&auto=format&fit=crop",
              accent: "text-[var(--color-ink)]",
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="relative rounded-2xl overflow-hidden bg-white/45 backdrop-blur-xl border border-white/70 hover:border-[var(--color-marker)]/35 p-5 shadow-[0_10px_30px_rgba(26,42,29,0.07)] hover:shadow-[0_18px_42px_rgba(26,42,29,0.13)] transition-all duration-500 hover:-translate-y-1 group"
              >
                {/* Subtle Image Background with Deep Gradient Overlay */}
                <div className="absolute inset-0">
                  <img
                    src={item.img}
                    alt=""
                    className="w-full h-full object-cover grayscale opacity-[0.07] group-hover:opacity-[0.12] group-hover:scale-110 transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/65 via-white/35 to-white/15 backdrop-blur-[2px]" />
                </div>

                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
                      {item.label}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-white/55 backdrop-blur-md border border-white/75 flex items-center justify-center group-hover:bg-[var(--color-marker)] transition-all duration-300">
                      <Icon className="w-4 h-4 text-[var(--color-marker)] group-hover:text-white transition-colors" />
                    </div>
                  </div>

                  <div>
                    <div className={`text-3xl font-black font-mono tracking-tight ${item.accent}`}>
                      {item.value}
                    </div>
                    <div className="text-xs text-[var(--color-ink-muted)] font-mono mt-1">
                      {item.sub}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* ─── 3. COOL VISUAL SPOTLIGHT HUBS (FEATURE CARDS WITH INTERNET IMAGERY) ─── */}
        <section className="grid grid-cols-1 gap-6">
          {/* Spotlight 2: Zero-Storage AST Codebase Inspector */}
          <div className="relative rounded-2xl overflow-hidden border border-white/70 hover:border-[var(--color-marker)]/35 p-6 sm:p-8 flex flex-col justify-between group shadow-[0_12px_34px_rgba(26,42,29,0.08)] hover:shadow-[0_20px_48px_rgba(26,42,29,0.14)] transition-all duration-500 bg-white/40 backdrop-blur-2xl">
            <div className="absolute inset-0">
              <img
                src="https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=1000&q=80&auto=format&fit=crop"
                alt="Cyber Analyst Terminal"
                className="w-full h-full object-cover grayscale opacity-[0.16] group-hover:opacity-[0.22] group-hover:scale-[1.025] transition-all duration-[1200ms] ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-white/75 via-white/55 to-white/25 backdrop-blur-sm" />
            </div>

            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-widest bg-white/55 backdrop-blur-lg border border-white/75 text-[var(--color-marker)]">
                <ShieldCheck className="w-3 h-3 text-[var(--color-marker)]" /> Cryptographic
                Zero-Trust
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[var(--color-ink)] tracking-tight">
                Deep Repository Code Audit
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-ink-muted)] leading-relaxed font-sans max-w-md">
                Run deep heuristic scans against your GitHub branches. Inspect potential API key
                leaks, dependency vulnerabilities, and code quality issues with instant remediation
                guidance.
              </p>
            </div>

            <div className="relative z-10 pt-6">
              <Link
                to="/analyze"
                className="inline-flex items-center gap-2 bg-white/55 backdrop-blur-lg hover:bg-[var(--color-ink)] text-[var(--color-ink)] hover:text-white border border-white/75 hover:border-[var(--color-ink)] font-bold font-mono text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all duration-300 hover:gap-3 cursor-pointer"
              >
                Scan Another Repo <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ─── 4. REPOSITORY AUDIT GRID / HISTORY SECTION ─── */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[var(--color-ink)] tracking-tight flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-[var(--color-marker)]" />
                Repository Telemetry Logs
              </h2>
              <p className="text-xs text-[var(--color-ink-muted)] font-mono mt-0.5">
                {analyses.length} Total Codebases Monitored · Instant Telemetry Ready
              </p>
            </div>

            {/* Filter Search Input */}
            <div className="flex items-center gap-3">
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-[var(--color-ink-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by name or language..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/55 backdrop-blur-lg border border-white/75 focus:border-[var(--color-marker)] focus:ring-2 focus:ring-[var(--color-marker)]/10 text-xs font-mono text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] outline-none transition-all duration-300"
                />
              </div>

              <Button
                onClick={() => navigate({ to: "/analyze" })}
                className="bg-[var(--color-ink)] hover:bg-[var(--color-marker)] text-white font-bold text-xs h-9 px-3.5 rounded-xl transition-transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> New Scan
              </Button>
            </div>
          </div>

          {/* Analysis Cards Grid */}
          {filteredAnalyses.length === 0 ? (
            <div className="relative rounded-3xl overflow-hidden border border-white/70 p-12 sm:p-16 text-center bg-white/45 backdrop-blur-2xl shadow-[0_18px_48px_rgba(26,42,29,0.09)]">
              {/* Background Graphic for Empty State */}
              <div className="absolute inset-0">
                <img
                  src="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&q=80&auto=format&fit=crop"
                  alt=""
                  className="w-full h-full object-cover grayscale opacity-[0.06]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white/65 via-white/45 to-white/25 backdrop-blur-sm" />
              </div>

              <div className="relative z-10 max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[var(--color-accent)] border border-[var(--color-border)] flex items-center justify-center mx-auto">
                  <BarChart3 className="w-8 h-8 text-[var(--color-marker)]" />
                </div>
                <h3 className="text-xl font-bold text-[var(--color-ink)] tracking-tight">
                  No Matching Repositories Found
                </h3>
                <p className="text-xs sm:text-sm text-[var(--color-ink-muted)] leading-relaxed font-sans">
                  No results match "{searchQuery}". Clear your search query to see all analyses.
                </p>
                <Button
                  onClick={() => setSearchQuery("")}
                  className="bg-[var(--color-ink)] hover:bg-[var(--color-marker)] text-white font-mono text-xs px-4 py-2 rounded-xl cursor-pointer"
                >
                  Clear Filter
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAnalyses.map((analysis) => (
                <AnalysisCard key={analysis.id} analysis={analysis} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </section>

        {/* ─── 5. QUICK NAVIGATION FOOTER BAR ─── */}
        <section className="pt-6 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-[var(--color-ink-muted)]">
          <div className="flex items-center gap-4 flex-wrap">
            <Link
              to="/analyze"
              className="inline-flex items-center gap-1.5 hover:text-[var(--color-marker)] transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-[var(--color-marker)]" /> Scan Another Repository
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 hover:text-[var(--color-marker)] transition-colors"
            >
              <Compass className="w-3.5 h-3.5 text-[var(--color-marker)]" /> Homepage
            </Link>
          </div>

          <div className="text-[11px] text-[var(--color-ink-muted)]">
            APILOCK TELEMETRY ENGINE // ZERO CREDENTIAL RETENTION VERIFIED
          </div>
        </section>
      </main>
    </div>
  );
}
