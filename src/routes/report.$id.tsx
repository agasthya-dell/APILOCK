import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  ExternalLink,
  FileCode2,
  GitBranch,
  Info,
  Loader2,
  Radar,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Star,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PixelShowcaseCard } from "@/components/PixelShowcaseCard";
import { getStoredUser, syncSessionFromSupabase } from "@/lib/auth-store";
import {
  getAnalysis,
  type AnalysisFinding,
  type AnalysisResult,
  type FindingSeverity,
  type ImprovementItem,
} from "@/lib/analysis-store";

export const Route = createFileRoute("/report/$id")({
  head: () => ({ meta: [{ title: "Repository Report — APILOCK" }] }),
  component: ReportPage,
});

// ─── Design helpers ───────────────────────────────────────────────────────────

function scoreGrade(n: number) {
  if (n >= 85) return { label: "Excellent",   desc: "This project is in great shape.",                        ring: "#16a34a", badge: "bg-emerald-50 text-emerald-700 border-emerald-300" };
  if (n >= 70) return { label: "Good",        desc: "Solid project with a few things to improve.",            ring: "#ca8a04", badge: "bg-yellow-50  text-yellow-700  border-yellow-300"  };
  if (n >= 50) return { label: "Needs Work",  desc: "Several issues that should be addressed.",              ring: "#ea580c", badge: "bg-orange-50 text-orange-700 border-orange-300" };
  return              { label: "Poor",        desc: "Serious problems that need immediate attention.",        ring: "#dc2626", badge: "bg-red-50    text-red-700    border-red-300"    };
}

function pct(score: number, max: number) { return Math.round((score / max) * 100); }

function barColor(p: number) {
  if (p >= 75) return "bg-emerald-500";
  if (p >= 50) return "bg-yellow-400";
  return "bg-red-400";
}

function statusWord(p: number) {
  if (p >= 75) return { word: "Good",  cls: "text-emerald-600" };
  if (p >= 50) return { word: "Fair",  cls: "text-yellow-600"  };
  return              { word: "Poor",  cls: "text-red-600"      };
}

function sevStyle(s: FindingSeverity) {
  if (s === "critical") return { border: "border-red-200",    bg: "bg-red-50",    badge: "bg-red-100    text-red-700",    label: "Critical" };
  if (s === "high")     return { border: "border-orange-200", bg: "bg-orange-50", badge: "bg-orange-100 text-orange-700", label: "High"     };
  if (s === "medium")   return { border: "border-yellow-200", bg: "bg-yellow-50", badge: "bg-yellow-100 text-yellow-700", label: "Medium"   };
  return                       { border: "border-blue-200",   bg: "bg-blue-50",   badge: "bg-blue-100   text-blue-700",   label: "Low"      };
}

// ─── Score ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const size = 150;
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const { ring } = scoreGrade(score);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth="12" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ring} strokeWidth="12"
          strokeLinecap="round" strokeDasharray={`${filled} ${circ}`}
          style={{ transition: "stroke-dasharray 1.4s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black text-[var(--color-ink)]">{score}</span>
        <span className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase tracking-widest">/100</span>
      </div>
    </div>
  );
}

// ─── Expandable issue card ────────────────────────────────────────────────────
function IssueCard({ finding }: { finding: AnalysisFinding }) {
  const [open, setOpen] = useState(false);
  const s = sevStyle(finding.severity);
  return (
    <div className={`border rounded-2xl overflow-hidden ${s.border} ${s.bg}`}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 p-5 text-left hover:brightness-[0.97] transition-all">
        <span className={`text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${s.badge}`}>
          {s.label}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--color-ink)]">{finding.title}</p>
          {finding.file && (
            <p className="text-[11px] font-mono text-[var(--color-ink-muted)] mt-0.5 truncate">
              {finding.file}{finding.line ? `:${finding.line}` : ""}
            </p>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-[var(--color-ink-muted)] flex-shrink-0 mt-1 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-current/10 bg-white/60 p-5 space-y-4">
          <p className="text-sm text-[var(--color-ink)]">{finding.description}</p>
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wide mb-1">Why this matters</p>
            <p className="text-sm text-amber-900">{finding.whyItMatters}</p>
          </div>
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide mb-1">How to fix it</p>
            <p className="text-sm text-emerald-900">{finding.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Secret card ──────────────────────────────────────────────────────────────
function SecretCard({ f }: {
  f: { secretType: string; provider: string; file: string; line: number; severity: string; redactedEvidence: string; suggestedAction: string; fileUrl: string };
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-red-300 bg-red-50 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 p-5 text-left hover:bg-red-100/60 transition-colors">
        <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-red-800">{f.secretType}</span>
            <span className="text-[10px] font-bold bg-red-200 text-red-800 px-2 py-0.5 rounded-full">{f.provider}</span>
            <span className="text-[10px] font-bold bg-red-600 text-white px-2 py-0.5 rounded-full">{f.severity}</span>
          </div>
          <p className="text-xs font-mono text-red-700 mt-0.5">{f.file} · line {f.line}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-red-400 flex-shrink-0 mt-1 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-red-200 bg-white/70 p-5 space-y-4">
          <div className="p-4 rounded-xl bg-white border border-red-200">
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Redacted preview — actual value is never stored
            </p>
            <code className="text-xs font-mono text-gray-700 break-all">{f.redactedEvidence}</code>
          </div>
          <a href={f.fileUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline">
            <ExternalLink className="w-3 h-3" /> See the exact line on GitHub
          </a>
          <div className="p-4 rounded-xl bg-red-100 border border-red-200">
            <p className="text-[11px] font-bold text-red-700 uppercase tracking-wide mb-1">What to do right now</p>
            <p className="text-sm text-red-900">{f.suggestedAction}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Roadmap card ─────────────────────────────────────────────────────────────
function RoadmapCard({ item }: { item: ImprovementItem }) {
  const styles: Record<number, { border: string; bg: string; badge: string }> = {
    1: { border: "border-red-200",    bg: "bg-red-50",    badge: "bg-red-600    text-white" },
    2: { border: "border-orange-200", bg: "bg-orange-50", badge: "bg-orange-500 text-white" },
    3: { border: "border-yellow-200", bg: "bg-yellow-50", badge: "bg-yellow-400 text-black" },
    4: { border: "border-gray-200",   bg: "bg-gray-50",   badge: "bg-gray-400   text-white" },
  };
  const st = styles[item.priority] ?? styles[4]!;
  return (
    <div className={`border rounded-2xl p-5 ${st.border} ${st.bg}`}>
      <div className="flex items-start gap-3">
        <span className={`text-[11px] font-bold px-3 py-1 rounded-full flex-shrink-0 whitespace-nowrap ${st.badge}`}>
          {item.priorityLabel}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[var(--color-ink)]">{item.title}</p>
          <p className="text-sm text-[var(--color-ink-muted)] mt-1">{item.description}</p>
          <p className="text-xs text-emerald-700 font-semibold mt-2">{item.estimatedImpact}</p>
        </div>
      </div>
    </div>
  );
}

function AllGood({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 p-5 bg-emerald-50 border border-emerald-200 rounded-2xl">
      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
      <p className="text-sm text-emerald-800 font-medium">{message}</p>
    </div>
  );
}

type Tab = "overview" | "issues" | "security" | "deps" | "roadmap";

// ─── Page ─────────────────────────────────────────────────────────────────────
function ReportPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    syncSessionFromSupabase().then((liveUser) => {
      const user = liveUser ?? getStoredUser();
      if (!user) { window.location.href = "/auth"; return; }
      const result = getAnalysis(id);
      if (!result) { setNotFound(true); setChecking(false); return; }
      if (result.status === "queued" || result.status === "initializing") {
        navigate({ to: "/scan/$id", params: { id }, search: { repoUrl: result.repo?.url } });
        return;
      }
      setAnalysis(result);
      setChecking(false);
    });
  }, [id, navigate]);

  if (checking) return (
    <div className="min-h-screen bg-[var(--color-paper)] flex items-center justify-center">
      <Radar className="w-8 h-8 text-[#bef264] animate-pulse" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-[var(--color-paper)] flex items-center justify-center">
      <div className="text-center space-y-4">
        <XCircle className="w-10 h-10 text-red-400 mx-auto" />
        <h1 className="text-lg font-bold text-[var(--color-ink)]">Report not found</h1>
        <Button onClick={() => navigate({ to: "/dashboard" })} className="bg-[#bef264] text-black hover:bg-[#a3e635] font-bold">
          Back to Dashboard
        </Button>
      </div>
    </div>
  );

  if (!analysis) return (
    <div className="min-h-screen bg-[var(--color-paper)] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--color-ink-muted)]" />
    </div>
  );

  const { scores, findings, secretFindings, dependencies, improvementRoadmap, strengths, weaknesses } = analysis;
  const grade = scoreGrade(scores.overall);
  const allIssues     = findings.filter((f) => ["critical","high","medium"].includes(f.severity));
  const criticalIssues = findings.filter((f) => f.severity === "critical" || f.severity === "high");
  const vulnDeps      = dependencies.filter((d) => d.vulnerabilities.length > 0);

  const categories = [
    { name: "Code Quality",    s: scores.codeQuality },
    { name: "Security",        s: scores.security },
    { name: "Project Structure", s: scores.projectStructure },
    { name: "Dependencies",    s: scores.dependencyHealth },
    { name: "Documentation",   s: scores.documentation },
    { name: "Testing",         s: scores.testing },
    { name: "Maintainability", s: scores.maintainability },
  ];

  const handleExport = () => {
    const lines = [
      "APILOCK — REPOSITORY HEALTH REPORT",
      `Generated: ${new Date().toLocaleString()}`,
      `Repository:    ${analysis.repo.fullName}`,
      `Overall Score: ${scores.overall}/100 — ${grade.label}`,
      "",
      "CATEGORY SCORES",
      ...categories.map((c) => `  ${c.name}: ${c.s.score}/${c.s.maxScore}`),
      "",
      "EXPOSED SECRETS",
      secretFindings.length === 0 ? "  None." : secretFindings.map((f) => `  - ${f.secretType} in ${f.file}:${f.line}`).join("\n"),
      "",
      "ISSUES",
      criticalIssues.length === 0 ? "  None." : criticalIssues.map((f) => `  - [${f.severity}] ${f.title}`).join("\n"),
      "",
      "WHAT TO FIX",
      improvementRoadmap.map((i) => `  - [${i.priorityLabel}] ${i.title}`).join("\n"),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `APILOCK-${analysis.repo.name}-report.txt`;
    a.click();
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "overview",  label: "Summary" },
    { id: "issues",    label: "Issues",       count: allIssues.length },
    { id: "security",  label: "Security",     count: secretFindings.length },
    { id: "deps",      label: "Dependencies", count: vulnDeps.length },
    { id: "roadmap",   label: "What to Fix" },
  ];

  return (
    <div className="bg-[var(--color-paper)] min-h-screen">

      {/* ── Sticky nav ── */}
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="brand-mark">
            <span className="brand-icon"><Radar /></span>
            <span className="font-bold tracking-tight">APILOCK</span>
          </Link>
          <nav className="desktop-nav">
            <Link to="/dashboard" className="text-sm font-medium">Dashboard</Link>
            <Link to="/analyze"   className="text-sm font-medium">New Analysis</Link>
          </nav>
          <div className="header-actions">
            <Button onClick={handleExport}
              className="button-ink gap-2 cursor-pointer">
              <Download className="w-4 h-4" /> Export
            </Button>
          </div>
        </div>
      </header>

      {/* ── HERO: score + repo info (dark panel) ── */}
      <section className="bg-[var(--color-ink)] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: "linear-gradient(#bef264 1px,transparent 1px),linear-gradient(90deg,#bef264 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="absolute top-0 left-0 right-0 h-px bg-[#bef264]/30" />

        <div className="section-wrap py-16 sm:py-20 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

            {/* Left — score ring */}
            <div className="lg:col-span-4 flex flex-col items-center lg:items-start gap-5">
              <ScoreRing score={scores.overall} />
              <div>
                <span className={`text-sm font-bold px-4 py-1.5 rounded-full border ${grade.badge}`}>
                  {grade.label}
                </span>
                <p className="text-sm text-white/60 mt-2 leading-relaxed">{grade.desc}</p>
              </div>

              {/* Quick stat pills */}
              <div className="flex flex-wrap gap-2 mt-1">
                {secretFindings.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30 px-3 py-1 rounded-full">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    {secretFindings.length} exposed secret{secretFindings.length > 1 ? "s" : ""}
                  </span>
                )}
                {secretFindings.length === 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5" /> No secrets exposed
                  </span>
                )}
              </div>
            </div>

            {/* Right — meta + category bars */}
            <div className="lg:col-span-8 space-y-7">
              <div>
                <div className="flex items-start gap-3 flex-wrap">
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-none">
                    {analysis.repo.fullName}
                  </h1>
                  <a href={analysis.repo.url} target="_blank" rel="noopener noreferrer"
                    className="mt-1 text-white/40 hover:text-[#bef264] transition-colors">
                    <ArrowUpRight className="w-5 h-5" />
                  </a>
                </div>
                {analysis.repo.description && (
                  <p className="text-white/60 text-sm mt-2 leading-relaxed max-w-xl">{analysis.repo.description}</p>
                )}
                <div className="flex flex-wrap gap-4 mt-3 text-xs text-white/40">
                  {analysis.repo.language && <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />{analysis.repo.language}</span>}
                  <span className="flex items-center gap-1"><Star className="w-3 h-3" />{analysis.repo.stars.toLocaleString()} stars</span>
                  <span className="flex items-center gap-1"><FileCode2 className="w-3 h-3" />{analysis.totalFilesInspected} files checked</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(analysis.startedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Category bars */}
              <div className="space-y-3">
                {categories.map(({ name, s }) => {
                  const p = s.available ? pct(s.score, s.maxScore) : 0;
                  const { word, cls } = statusWord(p);
                  return (
                    <div key={name} className="flex items-center gap-4">
                      <span className="text-xs text-white/50 w-36 flex-shrink-0 truncate">{name}</span>
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        {s.available
                          ? <div className={`h-full ${barColor(p)} rounded-full transition-all duration-700`} style={{ width: `${p}%` }} />
                          : <div className="h-full bg-white/10 rounded-full w-full" />}
                      </div>
                      <span className={`text-xs font-bold w-20 text-right flex-shrink-0 ${s.available ? cls : "text-white/30"}`}>
                        {s.available ? `${word}  ${s.score}/${s.maxScore}` : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STAT STRIP ── */}
      <div className="border-b border-[var(--color-border)] bg-[var(--card)]">
        <div className="section-wrap">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[var(--color-border)]">
            {[
              { label: "Issues Found",          value: allIssues.length,      sub: allIssues.length === 0 ? "None — great" : `${criticalIssues.length} critical`,        icon: <AlertTriangle className="w-4 h-4" />, alert: allIssues.length > 0 },
              { label: "Exposed Secrets",        value: secretFindings.length, sub: secretFindings.length === 0 ? "None found" : "Rotate immediately",                   icon: <ShieldAlert className="w-4 h-4" />,   alert: secretFindings.length > 0 },
              { label: "Vulnerable Packages",    value: vulnDeps.length,       sub: vulnDeps.length === 0 ? "All clear" : "Need updating",                               icon: <Info className="w-4 h-4" />,          alert: vulnDeps.length > 0 },
              { label: "Files Analyzed",         value: analysis.totalFilesInspected, sub: `of ${analysis.totalFilesDiscovered} discovered`,                             icon: <FileCode2 className="w-4 h-4" />,     alert: false },
            ].map(({ label, value, sub, icon, alert }) => (
              <div key={label} className="px-6 py-5 flex items-center gap-4">
                <span className={`flex-shrink-0 ${alert ? "text-red-500" : "text-[var(--color-ink-muted)]"}`}>{icon}</span>
                <div>
                  <div className={`text-2xl font-black ${alert ? "text-red-600" : "text-[var(--color-ink)]"}`}>{value}</div>
                  <div className="text-xs text-[var(--color-ink-muted)] font-medium">{label}</div>
                  <div className="text-[10px] text-[var(--color-ink-muted)]">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="section-wrap py-14 space-y-14">

        {/* Tab bar */}
        <div className="flex gap-1 p-1 bg-[var(--color-accent)] rounded-xl overflow-x-auto sticky top-[79px] z-30">
          {tabs.map(({ id, label, count }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tab === id
                  ? "bg-[var(--card)] text-[var(--color-ink)] shadow-sm border border-[var(--color-border)]"
                  : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              }`}>
              {label}
              {count !== undefined && count > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  id === "security" ? "bg-red-500 text-white" : "bg-[var(--color-ink)] text-[var(--color-paper)]"
                }`}>{count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── SUMMARY ── */}
        {tab === "overview" && (
          <div className="space-y-14">

            {/* Strengths / Weaknesses two-col */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-[var(--card)] border border-[var(--color-border)] rounded-2xl p-7">
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </span>
                  <h2 className="text-base font-bold text-[var(--color-ink)]">What is working well</h2>
                </div>
                {strengths.length > 0 ? (
                  <ul className="space-y-3">
                    {strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-[var(--color-ink)]">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 font-black text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">+</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[var(--color-ink-muted)]">Not enough data yet.</p>
                )}
              </div>

              <div className="bg-[var(--card)] border border-[var(--color-border)] rounded-2xl p-7">
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </span>
                  <h2 className="text-base font-bold text-[var(--color-ink)]">What needs attention</h2>
                </div>
                {weaknesses.length > 0 ? (
                  <ul className="space-y-3">
                    {weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-[var(--color-ink)]">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 font-black text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">!</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <AllGood message="No major weaknesses detected." />
                )}
              </div>
            </div>

            {/* Unsplash — dark matrix code aesthetic */}
            <div className="w-full my-8 bg-[#09110b] border border-[#bef264]/30 rounded-2xl overflow-hidden shadow-xl relative" style={{ height: 220 }}>
              <img
                src="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&q=80&auto=format&fit=crop"
                alt="Dark matrix code streams"
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#09110b]/90 via-[#09110b]/50 to-transparent flex flex-col justify-center px-10">
                <span className="text-xs font-bold tracking-wider text-[#bef264] uppercase mb-2">Deep Code Intelligence</span>
                <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug max-w-md">
                  Every line of code, thoroughly reviewed.
                </h3>
                <p className="text-sm text-[#d9f99d]/80 mt-2 max-w-sm leading-relaxed">
                  APILOCK inspects source files, dependencies, configuration, tests and documentation — turning results into a plain-English health report.
                </p>
              </div>
            </div>

            {/* Top 3 actions */}
            {improvementRoadmap.length > 0 && (
              <div>
                <div className="section-index">
                  <span>01</span>
                  <span>TOP ACTIONS</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  <div className="lg:col-span-5">
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--color-ink)] leading-tight mb-3">
                      The three most impactful things to do right now.
                    </h2>
                    <p className="text-[var(--color-ink-muted)] text-sm leading-relaxed">
                      Start here. These will make the biggest difference to your project's health, security and maintainability.
                    </p>
                    <button onClick={() => setTab("roadmap")}
                      className="text-link mt-4">
                      See the full plan <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="lg:col-span-7 space-y-4">
                    {improvementRoadmap.slice(0, 3).map((item, i) => (
                      <div key={i} className="flex items-start gap-4 p-5 rounded-2xl bg-[var(--card)] border border-[var(--color-border)] hover:border-[#bef264]/40 transition-colors group">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#bef264] text-black font-black text-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-[var(--color-ink)]">{item.title}</p>
                          <p className="text-xs text-[var(--color-ink-muted)] mt-1 leading-relaxed">{item.description}</p>
                          <p className="text-xs text-emerald-600 font-semibold mt-2">{item.estimatedImpact}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {analysis.treeTruncated && (
              <div className="flex items-start gap-3 p-5 bg-amber-50 border border-amber-200 rounded-2xl">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  This is a large repository. APILOCK analyzed a representative sample of files —
                  results cover the most important areas but may not be fully complete.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── ISSUES ── */}
        {tab === "issues" && (
          <div className="space-y-10">
            {/* Pixel art — shield */}
            {/* Unsplash — dark code editor with syntax highlighting */}
            <div className="w-full my-8 bg-[#09110b] border border-[#bef264]/30 rounded-2xl overflow-hidden shadow-xl relative" style={{ height: 220 }}>
              <img
                src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&q=80&auto=format&fit=crop"
                alt="Code editor dark"
                className="w-full h-full object-cover opacity-55"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#09110b]/95 via-[#09110b]/60 to-transparent flex flex-col justify-center px-10">
                <span className="text-xs font-bold tracking-wider text-[#bef264] uppercase mb-2">Code Quality Analysis</span>
                <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug max-w-md">
                  Every issue explained in plain English.
                </h3>
                <p className="text-sm text-[#d9f99d]/80 mt-2 max-w-sm leading-relaxed">
                  No cryptic error codes. Each issue tells you what it is, why it matters, and exactly how to fix it.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              <div className="lg:col-span-4 space-y-5">
                <div className="section-index">
                  <span>02</span><span>ISSUES FOUND</span>
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-[var(--color-ink)] leading-tight">
                  {allIssues.length} issue{allIssues.length !== 1 ? "s" : ""} detected across your codebase.
                </h2>
                <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">
                  Click any issue to expand it and see the full explanation and fix.
                </p>
                <div className="space-y-2">
                  {[
                    { label: "Critical", count: findings.filter((f) => f.severity === "critical").length, cls: "text-red-600" },
                    { label: "High",     count: findings.filter((f) => f.severity === "high").length,     cls: "text-orange-600" },
                    { label: "Medium",   count: findings.filter((f) => f.severity === "medium").length,   cls: "text-yellow-600" },
                    { label: "Low",      count: findings.filter((f) => f.severity === "low").length,      cls: "text-blue-600" },
                  ].map(({ label, count, cls }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
                      <span className="text-sm text-[var(--color-ink-muted)]">{label}</span>
                      <span className={`text-sm font-black ${cls}`}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-8 space-y-6">
                {criticalIssues.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">Critical and High Priority</p>
                    {criticalIssues.map((f) => <IssueCard key={f.id} finding={f} />)}
                  </div>
                )}
                {findings.filter((f) => f.severity === "medium").length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">Medium Priority</p>
                    {findings.filter((f) => f.severity === "medium").map((f) => <IssueCard key={f.id} finding={f} />)}
                  </div>
                )}
                {findings.filter((f) => f.severity === "low" || f.severity === "info").length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">Minor Issues</p>
                    {findings.filter((f) => f.severity === "low" || f.severity === "info").map((f) => <IssueCard key={f.id} finding={f} />)}
                  </div>
                )}
                {allIssues.length === 0 && <AllGood message="No issues detected in the analyzed files." />}
              </div>
            </div>
          </div>
        )}

        {/* ── SECURITY ── */}
        {tab === "security" && (
          <div className="space-y-10">
            {/* Unsplash — dark lock / security binary */}
            <div className="w-full my-8 bg-[#09110b] border border-[#bef264]/30 rounded-2xl overflow-hidden shadow-xl relative" style={{ height: 220 }}>
              <img
                src="https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=1200&q=80&auto=format&fit=crop"
                alt="Cyber security lock"
                className="w-full h-full object-cover opacity-55"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#09110b]/95 via-[#09110b]/60 to-transparent flex flex-col justify-center px-10">
                <span className="text-xs font-bold tracking-wider text-[#bef264] uppercase mb-2">Security Analysis</span>
                <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug max-w-md">
                  Credential exposure detection. Zero raw values stored.
                </h3>
                <p className="text-sm text-[#d9f99d]/80 mt-2 max-w-sm leading-relaxed">
                  Scans every file for API keys, passwords and tokens. Only redacted evidence is stored — the actual value is never saved.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              <div className="lg:col-span-4 space-y-5">
                <div className="section-index">
                  <span>03</span><span>SECURITY</span>
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-[var(--color-ink)] leading-tight">
                  {secretFindings.length > 0
                    ? `${secretFindings.length} exposed secret${secretFindings.length > 1 ? "s" : ""} found.`
                    : "No secrets exposed."}
                </h2>
                <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">
                  {secretFindings.length > 0
                    ? "These need to be rotated immediately. Click each one to see exactly where it is and what to do."
                    : "No API keys, passwords, or tokens were found in the scanned files."}
                </p>
              </div>

              <div className="lg:col-span-8 space-y-4">
                {secretFindings.length > 0 ? (
                  <>
                    <div className="p-4 bg-red-100 border border-red-300 rounded-2xl text-sm text-red-800 font-semibold">
                      Your code contains {secretFindings.length} exposed secret{secretFindings.length > 1 ? "s" : ""}. Rotate each one immediately via its provider dashboard.
                    </div>
                    {secretFindings.map((f, i) => <SecretCard key={i} f={f} />)}
                  </>
                ) : (
                  <AllGood message="No exposed secrets or API keys found in the analyzed files." />
                )}

                {findings.filter((f) => f.category === "security").length > 0 && (
                  <div className="space-y-3 pt-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">Insecure Code Patterns</p>
                    {findings.filter((f) => f.category === "security").map((f) => <IssueCard key={f.id} finding={f} />)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── DEPENDENCIES ── */}
        {tab === "deps" && (
          <div className="space-y-10">
            {/* Unsplash — dark server / package infrastructure */}
            <div className="w-full my-8 bg-[#09110b] border border-[#bef264]/30 rounded-2xl overflow-hidden shadow-xl relative" style={{ height: 220 }}>
              <img
                src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&q=80&auto=format&fit=crop"
                alt="Server infrastructure dark"
                className="w-full h-full object-cover opacity-50"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#09110b]/95 via-[#09110b]/60 to-transparent flex flex-col justify-center px-10">
                <span className="text-xs font-bold tracking-wider text-[#bef264] uppercase mb-2">Dependency Health</span>
                <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug max-w-md">
                  Every package, checked against known vulnerabilities.
                </h3>
                <p className="text-sm text-[#d9f99d]/80 mt-2 max-w-sm leading-relaxed">
                  Reads your dependency files and flags packages with documented security issues so you know exactly what to update.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              <div className="lg:col-span-4 space-y-5">
                <div className="section-index">
                  <span>04</span><span>DEPENDENCIES</span>
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-[var(--color-ink)] leading-tight">
                  {dependencies.length} packages analyzed.
                </h2>
                <div className="space-y-2 mt-2">
                  {[
                    { label: "Total packages",             value: dependencies.length,                             alert: false },
                    { label: "With security issues",       value: vulnDeps.length,                                 alert: vulnDeps.length > 0 },
                    { label: "Outdated",                   value: dependencies.filter((d) => d.isOutdated).length, alert: false },
                  ].map(({ label, value, alert }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
                      <span className="text-sm text-[var(--color-ink-muted)]">{label}</span>
                      <span className={`text-sm font-black ${alert ? "text-red-600" : "text-[var(--color-ink)]"}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-8 space-y-4">
                {vulnDeps.length > 0 ? vulnDeps.map((dep) => (
                  <div key={dep.name} className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                      <code className="text-sm font-bold text-[var(--color-ink)]">{dep.name}</code>
                      <span className="text-xs text-[var(--color-ink-muted)] bg-[var(--color-paper)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                        installed: {dep.currentVersion}
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {dep.vulnerabilities.map((v, i) => (
                        <li key={i} className="text-xs text-orange-800 flex items-start gap-2">
                          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5 text-orange-500" /> {v}
                        </li>
                      ))}
                    </ul>
                  </div>
                )) : dependencies.length > 0
                  ? <AllGood message="No known vulnerabilities found in your dependencies." />
                  : <div className="p-5 bg-[var(--card)] border border-[var(--color-border)] rounded-2xl text-sm text-[var(--color-ink-muted)]">
                      No dependency files were found in this repository.
                    </div>}
              </div>
            </div>
          </div>
        )}

        {/* ── ROADMAP ── */}
        {tab === "roadmap" && (
          <div className="space-y-10">
            {/* Unsplash — dark terminal rocket launch / code improvement */}
            <div className="w-full my-8 bg-[#09110b] border border-[#bef264]/30 rounded-2xl overflow-hidden shadow-xl relative" style={{ height: 220 }}>
              <img
                src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&q=80&auto=format&fit=crop"
                alt="Dark laptop coding"
                className="w-full h-full object-cover opacity-55"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#09110b]/95 via-[#09110b]/60 to-transparent flex flex-col justify-center px-10">
                <span className="text-xs font-bold tracking-wider text-[#bef264] uppercase mb-2">Improvement Roadmap</span>
                <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug max-w-md">
                  Your step-by-step improvement plan.
                </h3>
                <p className="text-sm text-[#d9f99d]/80 mt-2 max-w-sm leading-relaxed">
                  Every recommendation backed by real evidence. Start from Critical and work your way down.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              <div className="lg:col-span-4 space-y-5">
                <div className="section-index">
                  <span>05</span><span>WHAT TO FIX</span>
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-[var(--color-ink)] leading-tight">
                  {improvementRoadmap.length} improvement{improvementRoadmap.length !== 1 ? "s" : ""} identified.
                </h2>
                <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">
                  Ordered by priority. Start from the top — Critical items have the biggest impact on security and stability.
                </p>
              </div>

              <div className="lg:col-span-8 space-y-8">
                {([1, 2, 3, 4] as const).map((priority) => {
                  const items = improvementRoadmap.filter((i) => i.priority === priority);
                  if (items.length === 0) return null;
                  const titles: Record<number, string> = {
                    1: "Fix these first — Critical",
                    2: "High impact improvements",
                    3: "Good to do when you have time",
                    4: "Optional polish",
                  };
                  return (
                    <div key={priority} className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink-muted)] border-b border-[var(--color-border)] pb-2">
                        {titles[priority]}
                      </p>
                      {items.map((item, i) => <RoadmapCard key={i} item={item} />)}
                    </div>
                  );
                })}
                {improvementRoadmap.length === 0 && (
                  <AllGood message="No specific improvements identified. The project looks solid!" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bottom CTA bar */}
        <div className="border-t border-[var(--color-border)] pt-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-6">
            <Link to="/dashboard"
              className="text-link">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Link>
            <button onClick={() => navigate({ to: "/analyze" })}
              className="text-link">
              <RefreshCw className="w-4 h-4" /> Analyze another repository
            </button>
          </div>
          <Button onClick={handleExport} className="button-ink gap-2 cursor-pointer">
            <Download className="w-4 h-4" /> Export Report
          </Button>
        </div>
      </div>
    </div>
  );
}
