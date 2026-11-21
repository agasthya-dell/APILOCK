import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Clock,
  FileCode2,
  GitBranch,
  LogOut,
  Plus,
  Radar,
  RefreshCw,
  Shield,
  ShieldAlert,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AskPhillNavbar } from "@/components/AskPhillNavbar";
import { getStoredUser, signOut, syncSessionFromSupabase, type User } from "@/lib/auth-store";
import { loadAnalysisHistory, deleteAnalysis, getHealthLabel, type AnalysisResult } from "@/lib/analysis-store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — APILOCK" },
      { name: "description", content: "Your repository analysis dashboard." },
    ],
  }),
  component: DashboardPage,
});

function ScorePill({ score }: { score: number }) {
  const { label, color, bgColor } = getHealthLabel(score);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${bgColor} ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${score >= 70 ? "bg-emerald-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500"}`} />
      {score}/100 · {label}
    </span>
  );
}

function AnalysisCard({ analysis, onDelete }: { analysis: AnalysisResult; onDelete: (id: string) => void }) {
  const navigate = useNavigate();
  const secretCount = analysis.secretFindings?.length ?? 0;
  const isCompleted = analysis.status === "completed" || analysis.status === "partial";

  return (
    <div className="bg-[var(--card)] border border-[var(--color-border)] rounded-xl p-5 hover:border-[#bef264]/40 transition-all group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#bef264]/20 flex items-center justify-center flex-shrink-0">
            <GitBranch className="w-4 h-4 text-[#5a7a00]" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-[var(--color-ink)] truncate">
              {analysis.repo?.fullName || "Unknown repository"}
            </div>
            <div className="text-xs text-[var(--color-ink-muted)] truncate">
              {analysis.repo?.language ?? "Unknown"} · {new Date(analysis.startedAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {isCompleted && (
            <button
              onClick={() => navigate({ to: "/report/$id", params: { id: analysis.id } })}
              className="p-1.5 rounded-lg hover:bg-[var(--color-accent)] transition-colors text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              title="View report"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(analysis.id); }}
            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-[var(--color-ink-muted)] hover:text-red-600"
            title="Delete analysis"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isCompleted ? (
        <>
          <div className="mb-3">
            <ScorePill score={analysis.scores?.overall ?? 0} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-[var(--color-paper)] border border-[var(--color-border)]">
              <div className="text-sm font-bold text-[var(--color-ink)]">{analysis.totalFilesInspected ?? 0}</div>
              <div className="text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide">Files</div>
            </div>
            <div className="p-2 rounded-lg bg-[var(--color-paper)] border border-[var(--color-border)]">
              <div className={`text-sm font-bold ${secretCount > 0 ? "text-red-600" : "text-emerald-600"}`}>{secretCount}</div>
              <div className="text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide">Secrets</div>
            </div>
            <div className="p-2 rounded-lg bg-[var(--color-paper)] border border-[var(--color-border)]">
              <div className="text-sm font-bold text-[var(--color-ink)]">{analysis.findings?.length ?? 0}</div>
              <div className="text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide">Issues</div>
            </div>
          </div>
          {isCompleted && (
            <Button
              onClick={() => navigate({ to: "/report/$id", params: { id: analysis.id } })}
              className="w-full mt-3 bg-[var(--color-ink)] text-[var(--color-paper)] hover:bg-[var(--color-marker)] text-xs font-semibold h-8 rounded-lg"
            >
              View Full Report <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          )}
        </>
      ) : analysis.status === "failed" ? (
        <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
          Analysis failed: {analysis.errorMessage ?? "Unknown error"}
        </div>
      ) : (
        <div className="text-xs text-[var(--color-ink-muted)] bg-[var(--color-paper)] px-3 py-2 rounded-lg border border-[var(--color-border)] flex items-center gap-2">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Analysis in progress...
        </div>
      )}
    </div>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [checking, setChecking] = useState(true); // true while session resolves

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

  // Show spinner while checking session — never flash /auth
  if (checking) {
    return (
      <div className="min-h-screen bg-[var(--color-paper)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Radar className="w-8 h-8 text-[#bef264] animate-pulse" />
          <p className="text-sm text-[var(--color-ink-muted)]">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const completed = analyses.filter((a) => a.status === "completed" || a.status === "partial");
  const avgScore = completed.length > 0
    ? Math.round(completed.reduce((sum, a) => sum + (a.scores?.overall ?? 0), 0) / completed.length)
    : 0;
  const totalSecrets = analyses.reduce((sum, a) => sum + (a.secretFindings?.length ?? 0), 0);
  const totalIssues = analyses.reduce((sum, a) => sum + (a.findings?.length ?? 0), 0);

  return (
    <div className="min-h-screen bg-[var(--color-paper)]">
      {/* Ask Phill Style Navbar matching Homepage */}
      <AskPhillNavbar />

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Welcome + CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-ink)]">
              Welcome back, {user.name.split(" ")[0]}
            </h1>
            <p className="text-sm text-[var(--color-ink-muted)] mt-1">
              {analyses.length > 0
                ? `${analyses.length} repositor${analyses.length === 1 ? "y" : "ies"} analyzed`
                : "Analyze your first repository to get started"}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="hidden sm:flex items-center gap-2 text-sm text-[var(--color-ink-muted)] bg-[var(--card)] px-3 py-1.5 rounded-full border border-[var(--color-border)]">
              {user.avatarUrl && (
                <img src={user.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
              )}
              <span className="font-semibold text-xs text-[var(--color-ink)]">{user.name}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors px-3 py-1.5 rounded-full hover:bg-rose-50 border border-rose-200 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
            <Button
              onClick={() => navigate({ to: "/analyze" })}
              className="bg-[#bef264] text-black hover:bg-[#a3e635] hover:scale-105 active:scale-95 font-bold font-sans px-4 py-2 rounded-full text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Analyze Repository
            </Button>
          </div>
        </div>

        {/* Stats */}
        {analyses.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Repositories", value: analyses.length, icon: GitBranch, accent: "text-[var(--color-ink)]" },
              { label: "Avg Health Score", value: `${avgScore}/100`, icon: TrendingUp, accent: avgScore >= 70 ? "text-emerald-600" : avgScore >= 50 ? "text-yellow-600" : "text-red-600" },
              { label: "Secret Exposures", value: totalSecrets, icon: ShieldAlert, accent: totalSecrets > 0 ? "text-red-600" : "text-emerald-600" },
              { label: "Total Issues", value: totalIssues, icon: Activity, accent: "text-[var(--color-ink)]" },
            ].map(({ label, value, icon: Icon, accent }) => (
              <div key={label} className="bg-[var(--card)] border border-[var(--color-border)] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">{label}</span>
                  <Icon className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
                </div>
                <div className={`text-2xl font-black ${accent}`}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Analysis history */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[var(--color-ink)] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--color-ink-muted)]" />
              Analysis History
            </h2>
            {analyses.length > 0 && (
              <button
                onClick={() => navigate({ to: "/analyze" })}
                className="text-xs font-semibold text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] flex items-center gap-1 transition-colors"
              >
                New analysis <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {analyses.length === 0 ? (
            <div className="bg-[var(--card)] border border-[var(--color-border)] border-dashed rounded-2xl p-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#bef264]/20 border border-[#bef264]/30 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-7 h-7 text-[#5a7a00]" />
              </div>
              <h3 className="text-base font-bold text-[var(--color-ink)] mb-2">No analyses yet</h3>
              <p className="text-sm text-[var(--color-ink-muted)] mb-6 max-w-sm mx-auto">
                Analyze a GitHub repository to understand its health, security, and code quality.
              </p>
              <Button
                onClick={() => navigate({ to: "/analyze" })}
                className="bg-[#bef264] text-black hover:bg-[#a3e635] font-bold text-sm"
              >
                <FileCode2 className="w-4 h-4 mr-2" />
                Analyze Your First Repository
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {analyses.map((analysis) => (
                <AnalysisCard key={analysis.id} analysis={analysis} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        {analyses.length > 0 && (
          <div className="mt-10 pt-8 border-t border-[var(--color-border)] flex flex-wrap gap-4">
            <Link to="/analyze" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)] hover:text-[var(--color-marker)] transition-colors">
              <Shield className="w-4 h-4" /> Analyze another repository
            </Link>
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors">
              <Radar className="w-4 h-4" /> Back to home
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
