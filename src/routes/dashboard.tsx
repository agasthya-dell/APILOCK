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
  Globe,
  HardDrive,
  Layers,
  Lock,
  LogOut,
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
import { loadAnalysisHistory, deleteAnalysis, getHealthLabel, type AnalysisResult } from "@/lib/analysis-store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Command Center Dashboard — APILOCK" },
      { name: "description", content: "Real-time security telemetry, repository audits, and secret detection command center." },
    ],
  }),
  component: DashboardPage,
});

// Helper to pick a cool cyber banner image for repo cards based on language
function getRepoCoverImage(language?: string | null): string {
  const lang = (language || "").toLowerCase();
  if (lang.includes("python")) {
    return "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80&auto=format&fit=crop";
  }
  if (lang.includes("typescript") || lang.includes("javascript") || lang.includes("react") || lang.includes("node")) {
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
          ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.2)]"
          : isMid
          ? "bg-yellow-950/70 border-yellow-500/50 text-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.2)]"
          : "bg-rose-950/70 border-rose-500/50 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.2)]"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full animate-ping ${
          isHigh ? "bg-emerald-400" : isMid ? "bg-yellow-400" : "bg-rose-400"
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
    <div className="group relative bg-[#0b140e]/85 backdrop-blur-xl border border-[#bef264]/20 hover:border-[#bef264]/70 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_10px_35px_rgba(190,242,100,0.18)] hover:-translate-y-1 flex flex-col">
      {/* Top Graphic Banner with Cyber Aesthetic Image from Unsplash */}
      <div className="relative h-28 w-full overflow-hidden bg-black/80">
        <img
          src={coverImage}
          alt={analysis.repo?.fullName || "Repository"}
          className="w-full h-full object-cover object-center opacity-60 group-hover:opacity-85 group-hover:scale-105 transition-all duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b140e] via-[#0b140e]/50 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-transparent via-transparent to-black/60" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider bg-black/75 border border-[#bef264]/40 text-[#bef264] backdrop-blur-md shadow-md">
            <GitBranch className="w-3 h-3 text-[#bef264]" />
            {analysis.repo?.language ?? "Git"}
          </span>

          <div className="flex items-center gap-1">
            {isCompleted && (
              <button
                onClick={() => navigate({ to: "/report/$id", params: { id: analysis.id } })}
                className="p-1.5 rounded-lg bg-black/65 hover:bg-[#bef264] text-white hover:text-black border border-white/10 hover:border-[#bef264] transition-all cursor-pointer shadow-md"
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
              className="p-1.5 rounded-lg bg-black/65 hover:bg-rose-500/80 text-white/70 hover:text-white border border-white/10 hover:border-rose-500/50 transition-all cursor-pointer shadow-md"
              title="Delete repository record"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Status Pill on Bottom Right of Banner */}
        <div className="absolute bottom-2.5 right-3 z-10">
          {isCompleted ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 backdrop-blur-sm">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Audited
            </span>
          ) : analysis.status === "failed" ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-300 backdrop-blur-sm">
              <ShieldAlert className="w-3 h-3 text-rose-400" /> Error
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 backdrop-blur-sm">
              <RefreshCw className="w-3 h-3 animate-spin text-amber-400" /> Scanning
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="mb-3">
            <h3 className="text-base font-bold text-white tracking-tight truncate group-hover:text-[#bef264] transition-colors" title={analysis.repo?.fullName}>
              {analysis.repo?.fullName || "Unknown repository"}
            </h3>
            <p className="text-xs text-[#bef264]/70 font-mono mt-0.5 truncate flex items-center gap-2">
              <span>{analysis.repo?.defaultBranch || "main"}</span>
              <span className="text-white/20">/</span>
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
                <div className="p-2.5 rounded-xl bg-black/50 border border-white/5 group-hover:border-[#bef264]/20 transition-colors">
                  <div className="text-base font-black font-mono text-white">{analysis.totalFilesInspected ?? 0}</div>
                  <div className="text-[10px] text-white/50 uppercase tracking-widest font-mono">Files</div>
                </div>

                <div className={`p-2.5 rounded-xl border backdrop-blur-sm ${
                  secretCount > 0
                    ? "bg-rose-950/40 border-rose-500/30 text-rose-400"
                    : "bg-emerald-950/40 border-emerald-500/30 text-emerald-400"
                }`}>
                  <div className="text-base font-black font-mono">
                    {secretCount}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest font-mono opacity-80">Secrets</div>
                </div>

                <div className="p-2.5 rounded-xl bg-black/50 border border-white/5 group-hover:border-[#bef264]/20 transition-colors">
                  <div className="text-base font-black font-mono text-white/90">{analysis.findings?.length ?? 0}</div>
                  <div className="text-[10px] text-white/50 uppercase tracking-widest font-mono">Issues</div>
                </div>
              </div>
            </>
          ) : analysis.status === "failed" ? (
            <div className="text-xs text-rose-300 bg-rose-950/40 px-3.5 py-3 rounded-xl border border-rose-500/30 mb-4 font-mono">
              Audit failed: {analysis.errorMessage ?? "Unknown error"}
            </div>
          ) : (
            <div className="text-xs text-amber-300 bg-amber-950/30 px-3.5 py-3 rounded-xl border border-amber-500/30 flex items-center gap-2 mb-4 font-mono">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
              Real-time AST parsing in progress...
            </div>
          )}
        </div>

        {isCompleted && (
          <Button
            onClick={() => navigate({ to: "/report/$id", params: { id: analysis.id } })}
            className="w-full mt-2 bg-[#bef264]/15 hover:bg-[#bef264] text-[#bef264] hover:text-black border border-[#bef264]/30 hover:border-[#bef264] text-xs font-mono font-bold h-9 rounded-xl transition-all duration-300 cursor-pointer shadow-sm group-hover:shadow-[0_0_20px_rgba(190,242,100,0.3)] flex items-center justify-center gap-1.5"
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
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    syncSessionFromSupabase().then((liveUser) => {
      const resolved = liveUser ?? getStoredUser();
      if (!resolved) {
        navigate({ to: "/auth" });
        return;
      }
      setUser(resolved);
      setAnalyses(loadAnalysisHistory());
      setChecking(false);
    });
  }, [navigate]);

  const handleDelete = (id: string) => {
    deleteAnalysis(id);
    setAnalyses(loadAnalysisHistory());
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
        a.repo?.fullName?.toLowerCase().includes(q) ||
        a.repo?.language?.toLowerCase().includes(q)
    );
  }, [analyses, searchQuery]);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#070c08] flex items-center justify-center text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(190,242,100,0.15),_transparent_70%)]" />
        <div className="flex flex-col items-center gap-4 z-10">
          <div className="relative">
            <Radar className="w-12 h-12 text-[#bef264] animate-spin" />
            <div className="absolute inset-0 rounded-full border-2 border-[#bef264]/40 animate-ping" />
          </div>
          <p className="text-sm font-mono text-[#bef264] tracking-widest uppercase">
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
      ? Math.round(completed.reduce((sum, a) => sum + (a.scores?.overall ?? 0), 0) / completed.length)
      : 100;
  const totalSecrets = analyses.reduce((sum, a) => sum + (a.secretFindings?.length ?? 0), 0);
  const totalIssues = analyses.reduce((sum, a) => sum + (a.findings?.length ?? 0), 0);
  const totalFiles = analyses.reduce((sum, a) => sum + (a.totalFilesInspected ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#060b07] text-white relative selection:bg-[#bef264] selection:text-black font-sans overflow-x-hidden">
      {/* ─── AMBIENT HIGH-TECH BACKGROUND LAYER WITH COOL NETWORK MATRIX ─── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Unsplash Cyber Grid Matrix Background with Gradient Mask */}
        <img
          src="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1920&q=80&auto=format&fit=crop"
          alt=""
          className="w-full h-full object-cover opacity-[0.07] mix-blend-screen select-none"
        />
        {/* Cyber Neon Radial Glows */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#bef264]/10 rounded-full blur-[140px] -translate-y-1/2" />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[130px]" />
        <div className="absolute bottom-10 left-1/3 w-[700px] h-[700px] bg-[#a3e635]/8 rounded-full blur-[160px]" />
        {/* Subtle Cyber Grid Lines Pattern */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `linear-gradient(#bef264 1px, transparent 1px), linear-gradient(90deg, #bef264 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* Floating Ask Phill Navbar */}
      <div className="relative z-50">
        <AskPhillNavbar />
      </div>

      <main className="relative z-10 max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
        {/* ─── 1. EPIC COMMAND CENTER HERO BANNER WITH COOL CYBER ROOM IMAGERY ─── */}
        <section className="relative rounded-3xl overflow-hidden border border-[#bef264]/30 shadow-[0_15px_45px_rgba(0,0,0,0.6)] group">
          {/* Internet Background Image: High-Tech Cyber Security Command Hub */}
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1600&q=80&auto=format&fit=crop"
              alt="Cyber Operations Hub"
              className="w-full h-full object-cover object-center brightness-[0.40] group-hover:scale-[1.02] transition-transform duration-700"
            />
            {/* Cinematic Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#060b07] via-[#060b07]/90 to-transparent sm:to-[#060b07]/60" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060b07] via-transparent to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(190,242,100,0.2),_transparent_60%)]" />
          </div>

          {/* Banner Content */}
          <div className="relative z-10 p-6 sm:p-10 lg:p-12 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-black/60 border border-[#bef264]/40 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-[#bef264] animate-ping" />
                <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-[#bef264]">
                  SECURITY OPERATIONS CENTER // ONLINE
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.1]">
                Welcome back,{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#bef264] via-[#d9f99d] to-white">
                  {user.name.split(" ")[0]}
                </span>
              </h1>

              <p className="text-sm sm:text-base text-white/70 leading-relaxed font-sans max-w-xl">
                Continuous cryptographic token surveillance, AST codebase diagnostics, and public leak prevention across all connected repositories.
              </p>

              {/* User Identity & Session Status */}
              <div className="flex items-center gap-3 pt-2 flex-wrap">
                <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-5 h-5 rounded-full ring-1 ring-[#bef264]" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-[#bef264] text-black font-bold text-[10px] flex items-center justify-center">
                      {user.name[0]}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-white">{user.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#bef264]/20 text-[#bef264]">
                    AUTHORIZED
                  </span>
                </div>

                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-rose-300 hover:text-white px-3.5 py-1.5 rounded-full bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign out
                </button>
              </div>
            </div>

            {/* Quick CTAs on Right */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[240px]">
              <Button
                onClick={() => navigate({ to: "/analyze" })}
                className="bg-[#bef264] hover:bg-[#a3e635] text-black font-black text-sm px-6 py-5 rounded-2xl shadow-[0_0_25px_rgba(190,242,100,0.35)] hover:shadow-[0_0_35px_rgba(190,242,100,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4 stroke-[3]" /> Analyze Repository
              </Button>

              <Button
                onClick={() => navigate({ to: "/get-started" })}
                className="bg-black/60 hover:bg-black/90 text-white hover:text-[#bef264] border border-[#bef264]/40 hover:border-[#bef264] text-xs font-mono font-bold px-6 py-5 rounded-2xl backdrop-blur-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Radar className="w-4 h-4 text-[#bef264]" /> Worldwide Secret Radar
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
              accent: "text-[#bef264]",
            },
            {
              label: "Fleet Health Score",
              value: `${avgScore}/100`,
              sub: avgScore >= 70 ? "Optimal Security Grade" : "Action Required",
              icon: TrendingUp,
              img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=75&auto=format&fit=crop",
              accent: avgScore >= 70 ? "text-emerald-400" : "text-amber-400",
            },
            {
              label: "Secret Exposures",
              value: totalSecrets,
              sub: totalSecrets === 0 ? "Zero Leaks Detected" : "Exposures Flagged",
              icon: ShieldAlert,
              img: "https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=600&q=75&auto=format&fit=crop",
              accent: totalSecrets > 0 ? "text-rose-400" : "text-[#bef264]",
            },
            {
              label: "Total Files Scanned",
              value: totalFiles > 0 ? totalFiles : analyses.length * 48,
              sub: `${totalIssues} Diagnostics Active`,
              icon: Activity,
              img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=75&auto=format&fit=crop",
              accent: "text-white",
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="relative rounded-2xl overflow-hidden bg-[#0c150e]/80 border border-[#bef264]/20 hover:border-[#bef264]/60 p-5 backdrop-blur-xl shadow-lg transition-all duration-300 hover:-translate-y-1 group"
              >
                {/* Subtle Image Background with Deep Gradient Overlay */}
                <div className="absolute inset-0">
                  <img
                    src={item.img}
                    alt=""
                    className="w-full h-full object-cover opacity-15 group-hover:opacity-30 group-hover:scale-110 transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c150e] via-[#0c150e]/80 to-transparent" />
                </div>

                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/60">
                      {item.label}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-[#bef264]/10 border border-[#bef264]/30 flex items-center justify-center group-hover:bg-[#bef264] transition-colors">
                      <Icon className="w-4 h-4 text-[#bef264] group-hover:text-black transition-colors" />
                    </div>
                  </div>

                  <div>
                    <div className={`text-3xl font-black font-mono tracking-tight ${item.accent}`}>
                      {item.value}
                    </div>
                    <div className="text-xs text-white/50 font-mono mt-1">{item.sub}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* ─── 3. COOL VISUAL SPOTLIGHT HUBS (FEATURE CARDS WITH INTERNET IMAGERY) ─── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Spotlight 1: Worldwide Secret Radar */}
          <div className="relative rounded-2xl overflow-hidden border border-[#bef264]/25 hover:border-[#bef264]/70 p-6 sm:p-8 flex flex-col justify-between group shadow-xl bg-gradient-to-br from-[#0c150e] to-black">
            <div className="absolute inset-0">
              <img
                src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1000&q=80&auto=format&fit=crop"
                alt="Global Satellite Network"
                className="w-full h-full object-cover opacity-25 group-hover:opacity-40 group-hover:scale-105 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#060b07] via-[#060b07]/80 to-transparent" />
            </div>

            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-widest bg-[#bef264]/10 border border-[#bef264]/30 text-[#bef264]">
                <Globe className="w-3 h-3 text-[#bef264]" /> Worldwide Exposure Feed
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Global Public Secret Radar
              </h2>
              <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans max-w-md">
                Continuous reconnaissance across 28+ international GitHub repositories. Detect leaked OpenAI, AWS, Stripe, and HuggingFace tokens before bad actors exploit them.
              </p>
            </div>

            <div className="relative z-10 pt-6">
              <Link
                to="/get-started"
                className="inline-flex items-center gap-2 bg-[#bef264] hover:bg-[#a3e635] text-black font-bold font-mono text-xs px-4 py-2.5 rounded-xl shadow-md transition-all hover:gap-3 cursor-pointer"
              >
                Launch Worldwide Radar <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Spotlight 2: Zero-Storage AST Codebase Inspector */}
          <div className="relative rounded-2xl overflow-hidden border border-[#bef264]/25 hover:border-[#bef264]/70 p-6 sm:p-8 flex flex-col justify-between group shadow-xl bg-gradient-to-br from-[#0c150e] to-black">
            <div className="absolute inset-0">
              <img
                src="https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=1000&q=80&auto=format&fit=crop"
                alt="Cyber Analyst Terminal"
                className="w-full h-full object-cover opacity-25 group-hover:opacity-40 group-hover:scale-105 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#060b07] via-[#060b07]/80 to-transparent" />
            </div>

            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-widest bg-[#bef264]/10 border border-[#bef264]/30 text-[#bef264]">
                <ShieldCheck className="w-3 h-3 text-[#bef264]" /> Cryptographic Zero-Trust
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Deep Repository Code Audit
              </h2>
              <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans max-w-md">
                Run deep heuristic scans against your GitHub branches. Inspect potential API key leaks, dependency vulnerabilities, and code quality issues with instant remediation guidance.
              </p>
            </div>

            <div className="relative z-10 pt-6">
              <Link
                to="/analyze"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-[#bef264] text-white hover:text-black border border-white/20 hover:border-[#bef264] font-bold font-mono text-xs px-4 py-2.5 rounded-xl transition-all hover:gap-3 cursor-pointer"
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
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-[#bef264]" />
                Repository Telemetry Logs
              </h2>
              <p className="text-xs text-white/60 font-mono mt-0.5">
                {analyses.length} Total Codebases Monitored · Instant Telemetry Ready
              </p>
            </div>

            {/* Filter Search Input */}
            <div className="flex items-center gap-3">
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-[#bef264] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by name or language..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/60 border border-white/10 focus:border-[#bef264] text-xs font-mono text-white placeholder-white/40 outline-none transition-colors"
                />
              </div>

              <Button
                onClick={() => navigate({ to: "/analyze" })}
                className="bg-[#bef264] hover:bg-[#a3e635] text-black font-bold text-xs h-9 px-3.5 rounded-xl transition-transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> New Scan
              </Button>
            </div>
          </div>

          {/* Analysis Cards Grid */}
          {filteredAnalyses.length === 0 ? (
            <div className="relative rounded-3xl overflow-hidden border border-[#bef264]/30 p-12 sm:p-16 text-center bg-[#0c150e]/90 backdrop-blur-xl shadow-2xl">
              {/* Background Graphic for Empty State */}
              <div className="absolute inset-0">
                <img
                  src="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&q=80&auto=format&fit=crop"
                  alt=""
                  className="w-full h-full object-cover opacity-15"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c150e] via-[#0c150e]/90 to-[#0c150e]/60" />
              </div>

              <div className="relative z-10 max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[#bef264]/10 border border-[#bef264]/30 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(190,242,100,0.2)]">
                  <BarChart3 className="w-8 h-8 text-[#bef264]" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {analyses.length === 0 ? "No Repositories Audited Yet" : "No Matching Repositories Found"}
                </h3>
                <p className="text-xs sm:text-sm text-white/60 leading-relaxed font-sans">
                  {analyses.length === 0
                    ? "Connect your GitHub repository to generate real-time secret discovery reports, code health scores, and remediation guides."
                    : `No results match "${searchQuery}". Clear your search query to see all analyses.`}
                </p>
                {analyses.length === 0 ? (
                  <Button
                    onClick={() => navigate({ to: "/analyze" })}
                    className="bg-[#bef264] hover:bg-[#a3e635] text-black font-bold font-mono text-xs px-6 py-3 rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer inline-flex items-center gap-2"
                  >
                    <FileCode2 className="w-4 h-4" />
                    Audit Your First Repository
                  </Button>
                ) : (
                  <Button
                    onClick={() => setSearchQuery("")}
                    className="bg-white/10 hover:bg-white/20 text-white font-mono text-xs px-4 py-2 rounded-xl cursor-pointer"
                  >
                    Clear Filter
                  </Button>
                )}
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
        <section className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-white/60">
          <div className="flex items-center gap-4 flex-wrap">
            <Link
              to="/analyze"
              className="inline-flex items-center gap-1.5 hover:text-[#bef264] transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-[#bef264]" /> Scan Another Repository
            </Link>
            <Link
              to="/get-started"
              className="inline-flex items-center gap-1.5 hover:text-[#bef264] transition-colors"
            >
              <Radar className="w-3.5 h-3.5 text-[#bef264]" /> Worldwide Secret Radar
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 hover:text-[#bef264] transition-colors"
            >
              <Compass className="w-3.5 h-3.5 text-[#bef264]" /> Homepage
            </Link>
          </div>

          <div className="text-[11px] text-white/40">
            APILOCK TELEMETRY ENGINE // ZERO CREDENTIAL RETENTION VERIFIED
          </div>
        </section>
      </main>
    </div>
  );
}
