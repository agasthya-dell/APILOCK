import { useState } from "react";
import { Check, Copy, Eye, EyeOff, Play, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Preset {
  id: string;
  name: string;
  provider: string;
  file: string;
  raw: string;
  redacted: string;
  severity: "High" | "Critical" | "Medium";
  line: number;
}

const PRESETS: Preset[] = [
  {
    id: "stripe",
    name: "Stripe Secret Key",
    provider: "Stripe Payments",
    file: "backend/services/billing.py",
    raw: 'STRIPE_SECRET_KEY = "' + ["sk", "live", "51Msz82KlmA9f83Kls921Kjd982Kmsa"].join("_") + '"',
    redacted: `STRIPE_SECRET_KEY = "sk_live_••••••••••••••••••••••••••••••••"`,
    severity: "High",
    line: 14,
  },
  {
    id: "aws",
    name: "AWS IAM Secret Key",
    provider: "Amazon Web Services",
    file: "infra/deploy_s3.tf",
    raw: `aws_secret_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"`,
    redacted: `aws_secret_key = "wJal••••••••••••••••••••••••••••••••"`,
    severity: "Critical",
    line: 28,
  },
  {
    id: "github",
    name: "GitHub Fine-Grained Token",
    provider: "GitHub VCS",
    file: ".github/workflows/ci.yml",
    raw: `AUTH_TOKEN: "github_pat_11ABX89284jklmsa_9218kmsalkfjk982"`,
    redacted: `AUTH_TOKEN: "github_pat_••••••••••••••••••••••••••••"`,
    severity: "High",
    line: 42,
  },
  {
    id: "postgres",
    name: "Database Credentials",
    provider: "PostgreSQL Database",
    file: "docker-compose.yml",
    raw: `DATABASE_URL: "postgres://postgres:SuperSecretP@ss2026@db:5432/app"`,
    redacted: `DATABASE_URL: "postgres://postgres:••••••••••••••••••@db:5432/app"`,
    severity: "Critical",
    line: 19,
  },
];

export function InteractiveScannerDemo() {
  const [selectedPreset, setSelectedPreset] = useState<Preset>(PRESETS[0]!);
  const [isRedacted, setIsRedacted] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [copied, setCopied] = useState(false);

  const runScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setIsRedacted(true);
    }, 700);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedPreset.redacted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--card)] shadow-lg overflow-hidden my-4 transition-all">
      {/* Top control bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 border-b border-[var(--color-border)] bg-[var(--color-paper)]/70">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--color-marker)] animate-pulse" />
          <span className="font-sans text-xs font-bold tracking-wide text-[var(--color-ink)]">
            Interactive Secret Detection
          </span>
        </div>

        {/* Preset Selector tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPreset(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-sans font-medium transition-all cursor-pointer ${
                selectedPreset.id === p.id
                  ? "bg-[var(--color-ink)] text-[var(--color-paper)] font-semibold shadow-xs"
                  : "bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] border border-[var(--color-border)] hover:bg-[var(--color-accent)]/30"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main interactive inspection display */}
      <div className="p-5 sm:p-6 space-y-4">
        {/* File and severity row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-sans text-[var(--color-ink-muted)]">Target File:</span>
            <span className="font-sans text-xs font-semibold text-[var(--color-ink)] bg-[var(--color-accent)]/60 px-2.5 py-1 rounded-md border border-[var(--color-border)]">
              {selectedPreset.file}
            </span>
            <span className="font-sans text-xs text-[var(--color-ink-muted)]">
              (line {selectedPreset.line})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-sans font-semibold tracking-wide flex items-center gap-1.5 ${
                selectedPreset.severity === "Critical"
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${selectedPreset.severity === "Critical" ? "bg-rose-500" : "bg-amber-500"}`} />
              {selectedPreset.severity} Severity
            </span>

            <button
              onClick={() => setIsRedacted(!isRedacted)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[var(--color-border)] bg-[var(--color-paper)] text-xs font-sans font-medium text-[var(--color-ink)] hover:border-[var(--color-marker)] transition-colors cursor-pointer"
            >
              {isRedacted ? <EyeOff className="w-3.5 h-3.5 text-emerald-600" /> : <Eye className="w-3.5 h-3.5 text-rose-500" />}
              <span>{isRedacted ? "Redacted" : "Raw Secret"}</span>
            </button>
          </div>
        </div>

        {/* Code display with simulated scanner beam */}
        <div className="relative rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] p-4 sm:p-5 overflow-hidden">
          {/* Animated Scanning Laser Beam */}
          {isScanning && (
            <div
              className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-[var(--color-marker)]/25 to-transparent pointer-events-none"
              style={{
                animation: "scanPass 0.7s cubic-bezier(0.4, 0, 0.2, 1) infinite",
              }}
            >
              <div className="w-0.5 h-full bg-[var(--color-marker)] mx-auto shadow-[0_0_12px_var(--color-marker)]" />
            </div>
          )}

          <div className="space-y-2">
            <div className="text-xs font-sans text-[var(--color-ink-muted)] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Pattern Match Verified
              </span>
              <span className="text-xs text-[var(--color-ink-muted)] font-sans">
                {selectedPreset.provider}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-[var(--card)] border border-[var(--color-border)] overflow-x-auto text-xs sm:text-sm font-sans font-medium text-[var(--color-ink)] leading-relaxed select-all">
              {isRedacted ? selectedPreset.redacted : selectedPreset.raw}
            </div>
          </div>
        </div>

        {/* Action row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <Button
            onClick={runScan}
            disabled={isScanning}
            className="button-ink inline-flex items-center gap-2 cursor-pointer font-sans text-xs px-4 py-2"
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Scanning Repository...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Run Scanner Sweep</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={handleCopy}
            className="border-[var(--color-border)] hover:bg-[var(--color-accent)] font-sans text-xs inline-flex items-center gap-2 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy Redacted"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
