import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Copy,
  CreditCard,
  Database,
  Download,
  Eye,
  FileCode2,
  Filter,
  Fingerprint,
  Flag,
  GitBranch,
  Globe,
  KeyRound,
  LockKeyhole,
  Pause,
  Play,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  ScanLine,
  Search,
  ShieldAlert,
  ShieldCheck,
  Square,
  Terminal,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PixelShowcaseCard } from "@/components/PixelShowcaseCard";
import { WordUnderlineAnimated } from "@/components/visual/DoodleDecorations";
import { AskPhillNavbar } from "@/components/AskPhillNavbar";
import { useAPILOCKAgent } from "@/hooks/use-secret-radar-agent";
import type { ScanFinding, SecretCategory } from "@/lib/secret-patterns";
import type { TrackedRepo } from "@/lib/agent-store";

export const Route = createFileRoute("/get-started")({
  head: () => ({
    meta: [
      { title: "Global Public GitHub Secret Exposure Scanner — APILOCK" },
      {
        name: "description",
        content:
          "Automated global discovery and detection of exposed high-value AI, Cloud, and Payment API credentials in public repositories.",
      },
      { property: "og:title", content: "APILOCK — Global Public GitHub Scanner" },
      {
        property: "og:description",
        content:
          "Detect exposed high-value API keys and cloud credentials across public repositories worldwide without collecting raw secrets.",
      },
    ],
  }),
  component: APILOCKGlobalPage,
});

// ─── Severity Badge ─────────────────────────────────────────────────────────
function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    Critical: "bg-rose-50 text-rose-700 border-rose-200",
    High: "bg-amber-50 text-amber-700 border-amber-200",
    Medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
    Low: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider border ${
        colors[severity] ?? "bg-gray-50 text-gray-600 border-gray-200"
      }`}
    >
      {severity.toUpperCase()}
    </span>
  );
}

// ─── Status Badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Discovered: "bg-lime-50 text-lime-700 border-lime-200",
    "Awaiting Authorization": "bg-amber-50 text-amber-700 border-amber-200",
    Authorized: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Queued: "bg-blue-50 text-blue-700 border-blue-200",
    Scanning: "bg-purple-50 text-purple-700 border-purple-200",
    Completed: "bg-lime-50 text-lime-700 border-lime-200",
    "Partially Scanned": "bg-amber-50 text-amber-800 border-amber-300",
    Failed: "bg-rose-50 text-rose-700 border-rose-200",
    "Authorization Revoked": "bg-gray-50 text-gray-500 border-gray-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider border ${
        colors[status] ?? "bg-gray-50 text-gray-500 border-gray-200"
      }`}
    >
      {status === "Scanning" && (
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
      )}
      {status}
    </span>
  );
}

// ─── Metric Card (Section 11) ────────────────────────────────────────────────
function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--card)] flex flex-col gap-1 shadow-2xs hover:border-[var(--color-marker)] transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-wider text-[var(--color-ink-muted)] uppercase truncate">
          {label}
        </span>
        <Icon className="w-3.5 h-3.5 text-[var(--color-ink-muted)] flex-shrink-0" />
      </div>
      <span className={`text-xl font-black tracking-tight ${accent ?? "text-[var(--color-ink)]"}`}>
        {value}
      </span>
      {sub && <span className="text-[9px] text-[var(--color-ink-muted)] truncate">{sub}</span>}
    </div>
  );
}

// ─── Single Finding Item (Section 8 Format) ─────────────────────────────────
function FindingCard({
  finding,
  onUpdate,
}: {
  finding: ScanFinding;
  onUpdate: (id: string, patch: Partial<ScanFinding>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyReport = () => {
    const reportText = [
      `Repository:         ${finding.repoOwner}/${finding.repoName}`,
      `Repository URL:     ${finding.repoUrl}`,
      `Provider:           ${finding.provider}`,
      `Credential Category: ${finding.secretType}`,
      `File:               ${finding.file}`,
      `Line:               ${finding.line}`,
      `Direct Code Link:   ${finding.fileUrl}`,
      `Commit:             ${finding.commitHash}`,
      `Exposure Status:    ${finding.historicalOrCurrent} (${finding.classification})`,
      `Severity:           ${finding.severity}`,
      `Confidence:         ${finding.confidence}`,
      `Credential Value:   Not collected (Redacted: ${finding.redactedEvidence})`,
      `First Detected:     ${new Date(finding.firstDetected).toLocaleString()}`,
      `Last Detected:      ${new Date(finding.lastDetected).toLocaleString()}`,
      `Recommended Action:`,
      `  - ${finding.suggestedAction}`,
    ].join("\n");

    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="border border-[var(--color-border)] rounded-xl overflow-hidden transition-all bg-[var(--card)] shadow-2xs">
      {/* Header row */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-[var(--color-accent)]/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0">
          <ShieldAlert className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[var(--color-ink)]">{finding.secretType}</span>
            <span className="text-[10px] font-semibold text-[var(--color-ink-muted)] bg-[var(--color-accent)]/60 px-2 py-0.5 rounded">
              {finding.provider}
            </span>
            <SeverityBadge severity={finding.severity} />
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                finding.historicalOrCurrent === "Current"
                  ? "bg-rose-100 text-rose-800"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {finding.historicalOrCurrent.toUpperCase()} EXPOSURE
            </span>
          </div>

          <div className="text-xs text-[var(--color-ink-muted)] mt-1 truncate">
            <a
              href={finding.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[var(--color-ink)] font-semibold hover:underline inline-flex items-center gap-1"
            >
              {finding.repoOwner}/{finding.repoName}
              <ArrowUpRight className="w-3 h-3 text-[var(--color-ink-muted)]" />
            </a>
            <span className="mx-1.5">·</span>
            <a
              href={finding.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="hover:underline text-[var(--color-ink)] font-medium"
              title="Open file at line on GitHub"
            >
              {finding.file}:{finding.line}
              <ArrowUpRight className="w-2.5 h-2.5 inline ml-0.5" />
            </a>
          </div>
        </div>

        <ChevronRight
          className={`w-4 h-4 text-[var(--color-ink-muted)] flex-shrink-0 transition-transform ${
            expanded ? "rotate-90" : ""
          }`}
        />
      </div>

      {/* Expanded view — Section 8 Format */}
      {expanded && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-paper)]/70 p-5 space-y-4">
          {/* Redacted Evidence */}
          <div className="p-3.5 rounded-lg bg-[var(--card)] border border-[var(--color-border)]">
            <div className="flex items-center justify-between text-[10px] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider mb-1.5">
              <span>Redacted Evidence (Credential value: Not collected)</span>
              <LockKeyhole className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <code className="text-xs font-mono font-medium text-[var(--color-ink)] break-all select-all block">
              {finding.redactedEvidence}
            </code>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase block">Repository URL</span>
              <a
                href={finding.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--color-ink)] font-semibold hover:underline truncate block"
              >
                {finding.repoUrl}
              </a>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase block">Affected File &amp; Line</span>
              <a
                href={finding.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-700 font-semibold hover:underline inline-flex items-center gap-1"
              >
                {finding.file}:{finding.line}
                <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase block">Commit Hash &amp; Branch</span>
              <span className="text-xs font-mono text-[var(--color-ink)]">{finding.commitHash} ({finding.branch})</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase block">First Detected</span>
              <span className="text-xs text-[var(--color-ink)]">{finding.firstDetected ? finding.firstDetected.slice(0, 10) : "Recent"}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase block">Exposure Classification</span>
              <span className="text-xs font-semibold text-[var(--color-ink)]">{finding.classification} ({finding.status})</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase block">Confidence / Severity</span>
              <span className="text-xs font-semibold text-emerald-700">
                {finding.confidence} Confidence · {finding.severity}
              </span>
            </div>
          </div>

          {/* Recommended Action */}
          <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 space-y-1">
            <span className="font-bold block uppercase text-[10px] tracking-wider text-amber-800">
              Recommended Action:
            </span>
            <p className="m-0 leading-relaxed">{finding.suggestedAction}</p>
          </div>

          {/* Finding Management Actions (Section 12) */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--color-border)]">
            <button
              onClick={() => onUpdate(finding.id, { status: "Under Review" })}
              className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
            >
              Under Review
            </button>
            <button
              onClick={() => onUpdate(finding.id, { status: "Confirmed" })}
              className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors cursor-pointer"
            >
              Confirm
            </button>
            <button
              onClick={() => onUpdate(finding.id, { status: "Resolved", historicalOrCurrent: "Resolved" })}
              className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3 h-3 inline mr-1" />
              Mark Resolved
            </button>
            <button
              onClick={() => onUpdate(finding.id, { status: "False Positive" })}
              className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <Flag className="w-3 h-3 inline mr-1" />
              False Positive
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={copyReport}
              className="ml-auto text-[11px] h-8 cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? "Report Copied" : "Copy Finding Report"}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Repository Row Component ────────────────────────────────────────────────
function RepoRow({
  repo,
  onAuthorize,
  onScanNow,
}: {
  repo: TrackedRepo;
  onAuthorize: (id: number, auth: boolean) => void;
  onScanNow: (repo: TrackedRepo) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3.5 border border-[var(--color-border)] rounded-xl bg-[var(--card)] hover:bg-[var(--color-accent)]/20 transition-colors">
      <GitBranch className="w-4 h-4 text-[var(--color-ink-muted)] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <a
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-[var(--color-ink)] hover:underline truncate"
          >
            {repo.fullName}
          </a>
          <StatusBadge status={repo.status} />
          {repo.scanCoverage !== "Pending" && (
            <span
              className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                repo.scanCoverage === "Full"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {repo.scanCoverage === "Full"
                ? "Full Scan"
                : `Partial (${repo.scannedFilesCount ?? 0}/${repo.totalEligibleFiles ?? 0})`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[var(--color-ink-muted)] mt-0.5 flex-wrap">
          {repo.language && <span>{repo.language}</span>}
          <span>★ {repo.stars.toLocaleString()}</span>
          <span>Branch: {repo.defaultBranch}</span>
          <span>Discovered: {repo.discoveredAt ? repo.discoveredAt.slice(0, 10) : "Recent"}</span>
          {repo.findingCount > 0 && (
            <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
              {repo.findingCount} finding(s)
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <a
          href={repo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-accent)] transition-colors"
          title="Open on GitHub"
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
        </a>

        {repo.authorized && repo.status !== "Scanning" && (
          <button
            onClick={() => onScanNow(repo)}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wider bg-[#bef264] text-black hover:bg-[#a3e635] transition-all cursor-pointer"
            title="Scan this repository immediately"
          >
            SCAN NOW
          </button>
        )}

        <button
          onClick={() => onAuthorize(repo.id, !repo.authorized)}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all cursor-pointer border ${
            repo.authorized
              ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300"
              : "bg-[var(--color-paper)] text-[var(--color-ink-muted)] border-[var(--color-border)] hover:bg-[#bef264]/20 hover:text-black hover:border-[#bef264]"
          }`}
        >
          {repo.authorized ? "AUTHORIZED (REVOKE)" : "AUTHORIZE SCAN"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Global Secret Exposure Page ───────────────────────────────────────
function APILOCKGlobalPage() {
  const agent = useAPILOCKAgent();

  const [activeTab, setActiveTab] = useState<"findings" | "repos" | "log">("findings");
  const [repoSearch, setRepoSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | SecretCategory>("all");
  const [targetRepoInput, setTargetRepoInput] = useState("");
  const [isSubmittingTarget, setIsSubmittingTarget] = useState(false);
  const [targetMessage, setTargetMessage] = useState<string | null>(null);

  const handleDiscoverTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRepoInput.trim()) return;
    setIsSubmittingTarget(true);
    setTargetMessage(null);
    try {
      const res = await agent.discoverAnyRepository(targetRepoInput.trim());
      setTargetMessage(res.message);
      if (res.success) {
        setTargetRepoInput("");
        setActiveTab("repos");
      }
    } finally {
      setIsSubmittingTarget(false);
    }
  };

  const filteredRepos = useMemo(() => {
    if (!repoSearch.trim()) return agent.repos;
    const q = repoSearch.toLowerCase();
    return agent.repos.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        (r.language && r.language.toLowerCase().includes(q)),
    );
  }, [agent.repos, repoSearch]);

  const filteredFindings = useMemo(() => {
    if (categoryFilter === "all") return agent.findings;
    return agent.findings.filter((f) => f.category === categoryFilter);
  }, [agent.findings, categoryFilter]);

  const latestFinding = agent.findings[agent.findings.length - 1];

  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] font-sans antialiased">
      {/* Ask Phill Style Header */}
      <AskPhillNavbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-10 sm:py-14 space-y-12">
        {/* Page Title & Scope Row */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--color-border)] bg-[var(--card)] text-xs font-bold tracking-wider text-[var(--color-marker)] uppercase mb-4 shadow-2xs">
            <span
              className={`w-2 h-2 rounded-full ${
                agent.isRunning
                  ? agent.isPaused
                    ? "bg-amber-500"
                    : "bg-[var(--color-marker)] animate-pulse"
                  : "bg-gray-400"
              }`}
            />
            {agent.isRunning
              ? agent.isPaused
                ? "Monitoring Paused"
                : "Active Worldwide Secret Monitoring"
              : "Global Exposure Intelligence"}
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[var(--color-ink)] leading-tight mb-4">
            Global Public GitHub <WordUnderlineAnimated>Secret Exposure Scanner</WordUnderlineAnimated>
          </h1>
          <p className="text-base sm:text-lg text-[var(--color-ink-muted)] leading-relaxed">
            Continuous discovery of public GitHub repositories worldwide. Inspects accessible source code and Git history
            for high-value AI, Cloud, and Payment API credentials with zero raw credential retention.
          </p>
        </div>

        {/* ── MANUALLY DISCOVER ANY PUBLIC GITHUB REPO (Section 1 Example) ── */}
        <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--card)] shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[var(--color-marker)]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink)]">
                Discover &amp; Ingest Any Public Repository
              </span>
            </div>
            <span className="text-[11px] text-[var(--color-ink-muted)]">
              Example: <code>https://github.com/tempoxyz/tempo</code> or <code>owner/repo</code>
            </span>
          </div>

          <form onSubmit={handleDiscoverTarget} className="flex flex-wrap sm:flex-nowrap gap-2">
            <div className="relative flex-1">
              <GitBranch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
              <input
                type="text"
                value={targetRepoInput}
                onChange={(e) => setTargetRepoInput(e.target.value)}
                placeholder="Enter GitHub repository URL or owner/repo (e.g. tempoxyz/tempo)..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] text-xs text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] outline-none focus:border-[var(--color-marker)] transition-colors font-mono"
              />
            </div>
            <Button
              type="submit"
              disabled={isSubmittingTarget || !targetRepoInput.trim()}
              className="bg-[#bef264] text-black hover:bg-[#a3e635] font-bold text-xs cursor-pointer shadow-xs px-5 flex-shrink-0"
            >
              {isSubmittingTarget ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <PlusCircle className="w-3.5 h-3.5 mr-1" />
                  Discover &amp; Queue
                </>
              )}
            </Button>
          </form>

          {targetMessage && (
            <div className="text-xs font-medium text-[var(--color-ink)] bg-[var(--color-accent)]/50 p-2.5 rounded-lg border border-[var(--color-border)]">
              {targetMessage}
            </div>
          )}
        </div>

        {/* Two-Column Grid: Context on Left, Live Telemetry & Latest Exposure on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (5 cols): Boundaries, Target Priorities & Mascot */}
          <div className="lg:col-span-5 space-y-6">
            <PixelShowcaseCard
              imageSrc="/pixel-detective.svg"
              imageAlt="APILOCK Cyber Surveillance Detective"
              title="Automated perimeter defense. Zero raw credentials exposed."
              description="Continuous discovery across public GitHub repositories worldwide. Strictly inspects high-value API secrets while excluding frontend config, public identifiers, and placeholder tokens."
              badge="Global Secret Intelligence"
            />

            {/* Strict Authorization Boundary Note */}
            <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--card)] space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-ink)]">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Authorization &amp; Zero-Credential Boundary</span>
              </div>
              <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed m-0">
                Global repository discovery operates automatically worldwide. Source-code scanning is strictly
                restricted to authorized repositories. Discovered credentials are never validated, tested, or authenticated with.
              </p>
            </div>

            {/* Targeted High-Value Credentials Summary */}
            <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--card)] space-y-3">
              <div className="text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider">
                Monitored Secret Priorities
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-[var(--color-ink)]">
                  <Bot className="w-3.5 h-3.5 text-purple-600" />
                  <span><strong>Priority A (AI):</strong> OpenAI, Anthropic Claude, Gemini, HuggingFace, Cohere, Mistral</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--color-ink)]">
                  <Cloud className="w-3.5 h-3.5 text-blue-600" />
                  <span><strong>Priority B (Cloud):</strong> AWS access &amp; secret keys, Azure connection strings, GCP keys</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--color-ink)]">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  <span><strong>Priority C (Payment):</strong> Stripe live secrets, SendGrid, Twilio auth tokens</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--color-ink)]">
                  <Database className="w-3.5 h-3.5 text-amber-600" />
                  <span><strong>Priority D (Databases):</strong> PostgreSQL, MongoDB Atlas, Redis AUTH, PEM keys</span>
                </div>
              </div>
              <div className="pt-2 border-t border-[var(--color-border)] text-[11px] text-[var(--color-ink-muted)] leading-normal">
                <em>Strictly excluded:</em> Firebase public config, Supabase anon keys, publishable payment tokens (<code>pk_live_</code>), client IDs, and placeholders.
              </div>
            </div>
          </div>

          {/* Right Column (7 cols): Control Station & Live Telemetry Card */}
          <div className="lg:col-span-7 space-y-6">
            {/* Control Station Card */}
            <div className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--card)] shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      agent.isRunning
                        ? agent.isPaused
                          ? "bg-amber-500"
                          : "bg-[#bef264] animate-pulse"
                        : "bg-gray-400"
                    }`}
                  />
                  <span className="font-bold text-xs uppercase tracking-wider text-[var(--color-ink)]">
                    Engine Status:{" "}
                    {agent.isRunning
                      ? agent.isPaused
                        ? "Paused"
                        : "Active Discovery & Scanning Pipeline"
                      : "Idle / Stopped"}
                  </span>
                </div>

                <div className="text-[11px] text-[var(--color-ink-muted)] font-mono">
                  Cycle #{agent.state.checkpoint.cycleCount}
                </div>
              </div>

              {/* Real-time Activity Ticker */}
              <div className="p-3 rounded-xl bg-[var(--color-paper)] border border-[var(--color-border)] flex items-center gap-3">
                <Terminal className="w-4 h-4 text-[var(--color-ink-muted)] flex-shrink-0" />
                <span className="text-xs text-[var(--color-ink)] font-mono truncate">
                  {agent.metrics.currentActivity}
                </span>
              </div>

              {/* Action Control Buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                {!agent.isRunning ? (
                  <Button
                    onClick={agent.startMonitoring}
                    className="bg-[#bef264] text-black hover:bg-[#a3e635] font-bold text-xs cursor-pointer shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5 mr-1" />
                    Start Monitoring
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={agent.stopMonitoring}
                    className="border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 mr-1" />
                    Stop
                  </Button>
                )}

                {agent.isRunning && !agent.isPaused && (
                  <Button
                    variant="outline"
                    onClick={agent.pauseMonitoring}
                    className="text-xs font-semibold cursor-pointer"
                  >
                    <Pause className="w-3.5 h-3.5 mr-1" />
                    Pause
                  </Button>
                )}

                {agent.isRunning && agent.isPaused && (
                  <Button
                    variant="outline"
                    onClick={agent.resumeMonitoring}
                    className="text-xs font-semibold cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 mr-1" />
                    Resume
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={agent.scanNow}
                  className="text-xs font-semibold cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 mr-1" />
                  Scan Eligible
                </Button>

                <Button
                  variant="outline"
                  onClick={agent.refresh}
                  className="text-xs font-semibold cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Refresh
                </Button>

                <Button
                  variant="outline"
                  onClick={agent.exportReport}
                  className="text-xs font-semibold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Export Report
                </Button>

                <button
                  onClick={agent.resetAgent}
                  title="Reset state and checkpoints"
                  className="p-2 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-accent)]/30 transition-colors cursor-pointer text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Latest Qualifying Exposure (Section 8 Format) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider">
                  Latest Qualifying Exposure
                </span>
                <span className="text-[11px] text-[var(--color-ink-muted)]">
                  {agent.findings.length > 0 ? `Showing 1 of ${agent.findings.length}` : "No exposures detected"}
                </span>
              </div>

              {latestFinding ? (
                <FindingCard finding={latestFinding} onUpdate={agent.updateFinding} />
              ) : (
                <div className="p-8 rounded-2xl border border-[var(--color-border)] bg-[var(--card)] text-center space-y-2">
                  <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto opacity-70" />
                  <div className="text-sm font-bold text-[var(--color-ink)]">
                    Zero Exposed Secrets Detected
                  </div>
                  <p className="text-xs text-[var(--color-ink-muted)] max-w-md mx-auto leading-relaxed">
                    Automated global repository discovery is operating worldwide. Discover a specific public repo
                    above or authorize public repositories in the list below to run authorized secret exposure sweeps.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── REAL BACKEND DASHBOARD METRICS (Section 11 Specification) ── */}
        <div className="pt-8 border-t border-[var(--color-border)] space-y-6">
          <div>
            <span className="text-xs font-bold text-[var(--color-marker)] uppercase tracking-widest block mb-1">
              Live Intelligence Telemetry
            </span>
            <h2 className="text-2xl font-bold text-[var(--color-ink)] tracking-tight">
              APILOCK Exposure Metrics
            </h2>
            <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
              Strict separation between discovered repositories, fully scanned coverage, and partially inspected files.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <MetricCard
              label="Discovered"
              value={agent.metrics.totalDiscovered}
              sub="Global public repos"
              icon={Globe}
            />
            <MetricCard
              label="Queued"
              value={agent.metrics.totalQueued}
              sub="Ready for scan"
              icon={ScanLine}
              accent="text-blue-600"
            />
            <MetricCard
              label="Fully Scanned"
              value={agent.metrics.totalFullyScanned}
              sub="Complete file tree"
              icon={ShieldCheck}
              accent="text-emerald-600"
            />
            <MetricCard
              label="Partially Scanned"
              value={agent.metrics.totalPartiallyScanned}
              sub="Large / capped repos"
              icon={AlertTriangle}
              accent="text-amber-600"
            />
            <MetricCard
              label="Failed Scans"
              value={agent.metrics.totalFailed}
              sub="API / network errors"
              icon={AlertTriangle}
              accent="text-rose-600"
            />
            <MetricCard
              label="Total Findings"
              value={agent.metrics.totalFindings}
              sub="Non-duplicate secrets"
              icon={ShieldAlert}
              accent="text-amber-600"
            />
            <MetricCard
              label="High Confidence"
              value={agent.metrics.highConfidenceFindings}
              sub="Strong provider matches"
              icon={CheckCircle2}
              accent="text-emerald-700"
            />
            <MetricCard
              label="Potential (Review)"
              value={agent.metrics.potentialFindings}
              sub="Pattern investigation"
              icon={Eye}
              accent="text-amber-700"
            />
            <MetricCard
              label="AI Credentials"
              value={agent.metrics.aiFindings}
              sub="OpenAI, Anthropic, GCP"
              icon={Bot}
              accent="text-purple-600"
            />
            <MetricCard
              label="Cloud Credentials"
              value={agent.metrics.cloudFindings}
              sub="AWS, Azure, GCP"
              icon={Cloud}
              accent="text-blue-600"
            />
            <MetricCard
              label="Payment Keys"
              value={agent.metrics.paymentFindings}
              sub="Stripe, Twilio, SendGrid"
              icon={CreditCard}
              accent="text-emerald-600"
            />
            <MetricCard
              label="Historical Exposures"
              value={agent.metrics.historicalExposures}
              sub="Git commit history"
              icon={GitBranch}
              accent="text-orange-600"
            />
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 p-1 bg-[var(--color-accent)]/30 rounded-xl w-fit border border-[var(--color-border)]">
            <button
              onClick={() => setActiveTab("findings")}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "findings"
                  ? "bg-[var(--color-ink)] text-[var(--color-paper)] shadow-xs"
                  : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Qualifying Findings ({agent.findings.length})
            </button>

            <button
              onClick={() => setActiveTab("repos")}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "repos"
                  ? "bg-[var(--color-ink)] text-[var(--color-paper)] shadow-xs"
                  : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Discovered Repositories ({agent.repos.length})
            </button>

            <button
              onClick={() => setActiveTab("log")}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "log"
                  ? "bg-[var(--color-ink)] text-[var(--color-paper)] shadow-xs"
                  : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Audit &amp; Activity Log
            </button>
          </div>

          {/* ── TAB 1: FINDINGS ─────────────────────────────────────── */}
          {activeTab === "findings" && (
            <div className="space-y-4">
              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[var(--color-border)]">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-[var(--color-ink-muted)] mr-1">Filter Category:</span>
                  {(
                    [
                      { id: "all", label: "All Categories" },
                      { id: "ai", label: "AI APIs" },
                      { id: "cloud", label: "Cloud Infra" },
                      { id: "payment", label: "Payment Services" },
                      { id: "database", label: "Databases" },
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                        categoryFilter === cat.id
                          ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                          : "bg-[var(--card)] text-[var(--color-ink-muted)] border border-[var(--color-border)] hover:bg-[var(--color-accent)]/30"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="text-xs text-[var(--color-ink-muted)]">
                  {filteredFindings.length} qualifying finding(s)
                </div>
              </div>

              {filteredFindings.length === 0 ? (
                <div className="p-12 text-center border border-[var(--color-border)] rounded-2xl bg-[var(--card)] space-y-2">
                  <ScanLine className="w-8 h-8 text-[var(--color-ink-muted)] mx-auto opacity-50" />
                  <div className="text-sm font-bold text-[var(--color-ink)]">
                    No matching findings recorded
                  </div>
                  <p className="text-xs text-[var(--color-ink-muted)] max-w-sm mx-auto">
                    Authorize repositories in the Discovered Repositories tab to initiate automated secret exposure scans.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredFindings
                    .slice()
                    .reverse()
                    .map((finding) => (
                      <FindingCard
                        key={finding.id}
                        finding={finding}
                        onUpdate={agent.updateFinding}
                      />
                    ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: REPOSITORIES ───────────────────────────────────── */}
          {activeTab === "repos" && (
            <div className="space-y-4">
              {/* Search & Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
                  <input
                    type="text"
                    value={repoSearch}
                    onChange={(e) => setRepoSearch(e.target.value)}
                    placeholder="Search discovered repositories by name or language..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--card)] text-xs text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] outline-none focus:border-[var(--color-marker)] transition-colors"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs text-[var(--color-ink-muted)]">
                    Showing {filteredRepos.length} of {agent.repos.length} worldwide repositories
                  </span>

                  {/* Scan All Option */}
                  <Button
                    onClick={() => {
                      if (agent.isScanningAll) {
                        agent.stopScanAll();
                      } else {
                        agent.scanAllRepositories(filteredRepos);
                      }
                    }}
                    disabled={filteredRepos.length === 0}
                    className={`font-bold text-xs cursor-pointer shadow-xs transition-all h-8 px-3.5 ${
                      agent.isScanningAll
                        ? "bg-rose-500 hover:bg-rose-600 text-white"
                        : "bg-[#bef264] text-black hover:bg-[#a3e635]"
                    }`}
                  >
                    {agent.isScanningAll ? (
                      <>
                        <Square className="w-3.5 h-3.5 mr-1" />
                        Stop Scan All
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 mr-1" />
                        Scan All ({filteredRepos.length})
                      </>
                    )}
                  </Button>

                  {/* Authorize All Option */}
                  <Button
                    variant="outline"
                    onClick={() => agent.authorizeAllRepos(true)}
                    disabled={filteredRepos.length === 0 || filteredRepos.every((r) => r.authorized)}
                    className="text-xs font-semibold h-8 px-3 cursor-pointer border-[var(--color-border)]"
                    title="Authorize all discovered repositories for source-code scanning"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Authorize All
                  </Button>
                </div>
              </div>

              {filteredRepos.length === 0 ? (
                <div className="p-12 text-center border border-[var(--color-border)] rounded-2xl bg-[var(--card)] space-y-2">
                  <Globe className="w-8 h-8 text-[var(--color-ink-muted)] mx-auto opacity-50" />
                  <div className="text-sm font-bold text-[var(--color-ink)]">
                    No repositories discovered yet
                  </div>
                  <p className="text-xs text-[var(--color-ink-muted)] max-w-sm mx-auto">
                    Click <strong>Start Monitoring</strong> or ingest a repository above (e.g. <code>tempoxyz/tempo</code>) to begin.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
                  {filteredRepos
                    .slice()
                    .sort((a, b) => b.scanPriority - a.scanPriority)
                    .map((repo) => (
                      <RepoRow
                        key={repo.id}
                        repo={repo}
                        onAuthorize={agent.authorizeRepo}
                        onScanNow={agent.scanRepository}
                      />
                    ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: AUDIT & ACTIVITY LOG ──────────────────────────── */}
          {activeTab === "log" && (
            <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--card)] font-mono text-xs max-h-[500px] overflow-y-auto space-y-1">
              {agent.metrics.scanLog.length === 0 ? (
                <div className="text-[var(--color-ink-muted)] py-6 text-center">
                  No activity recorded. Start monitoring to begin telemetry streaming.
                </div>
              ) : (
                agent.metrics.scanLog.map((line, i) => (
                  <div
                    key={i}
                    className={`leading-relaxed ${
                      line.includes("✗") || line.includes("failed")
                        ? "text-rose-600 font-bold"
                        : line.includes("⚠")
                        ? "text-amber-600 font-semibold"
                        : line.includes("✓") || line.includes("complete")
                        ? "text-emerald-600 font-medium"
                        : "text-[var(--color-ink-muted)]"
                    }`}
                  >
                    {line}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] py-8 mt-16 text-center text-xs text-[var(--color-ink-muted)]">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <span>APILOCK APILOCK — Global Public GitHub Secret Exposure Scanner</span>
          <Link to="/" className="hover:text-[var(--color-ink)] transition-colors font-medium">
            ← Return to Homepage
          </Link>
        </div>
      </footer>
    </div>
  );
}
