import { useEffect, useRef, useState, useCallback } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileCode2,
  Loader2,
  Radar,
  Shield,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AskPhillNavbar } from "@/components/AskPhillNavbar";
import { getStoredUser, syncSessionFromSupabase } from "@/lib/auth-store";
import { ANALYSIS_STAGES, getAnalysis, type AnalysisResult, type AnalysisStatus } from "@/lib/analysis-store";
import { analyzeRepository } from "@/lib/repo-analyzer";

const searchSchema = z.object({
  repoUrl: z.string().optional(),
  zipName: z.string().optional(),
  zipSize: z.string().optional(),
});

export const Route = createFileRoute("/scan/$id")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [{ title: "Scanning Repository — APILOCK" }],
  }),
  component: ScanPage,
});

const STAGE_ORDER: AnalysisStatus[] = [
  "initializing",
  "fetching_tree",
  "mapping_structure",
  "analyzing_code",
  "checking_quality",
  "scanning_secrets",
  "auditing_deps",
  "evaluating_docs",
  "evaluating_tests",
  "calculating_score",
  "generating_report",
  "completed",
];

function getStageIndex(stage: AnalysisStatus): number {
  return STAGE_ORDER.indexOf(stage);
}

export function ScanPage() {
  const { id } = Route.useParams();
  const { repoUrl, zipName } = Route.useSearch();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false); // true once session resolved
  const [state, setState] = useState<Partial<AnalysisResult>>({
    id,
    status: "queued",
    currentStage: "initializing",
    stageProgress: 0,
    overallProgress: 0,
    totalFilesDiscovered: 0,
    totalFilesInspected: 0,
    totalFindingsCount: 0,
    analysisLog: [],
  });
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const analysisStarted = useRef(false);

  // ── Auth guard: wait for async session before doing anything ──
  useEffect(() => {
    syncSessionFromSupabase().then((liveUser) => {
      const user = liveUser ?? getStoredUser();
      if (!user) { navigate({ to: "/auth" }); return; }

      // If analysis already finished, go straight to the report
      const existing = getAnalysis(id);
      if (existing && (existing.status === "completed" || existing.status === "partial")) {
        navigate({ to: "/report/$id", params: { id } });
        return;
      }
      setReady(true);
    });
  }, [id, navigate]);

  useEffect(() => {
    if (!ready || analysisStarted.current) return;
    if (!repoUrl) {
      if (zipName) {
        setError("ZIP file analysis requires server-side processing. Please use the GitHub URL method for now, or check back when this feature is fully deployed.");
      } else {
        setError("No repository source provided. Please go back and select a repository.");
      }
      return;
    }

    analysisStarted.current = true;
    abortRef.current = new AbortController();

    analyzeRepository(
      repoUrl,
      (update) => {
        setState((prev) => ({ ...prev, ...update }));
      },
      abortRef.current.signal,
    ).then((result) => {
      if (result.status === "failed") {
        setError(result.errorMessage ?? "Analysis failed.");
      } else {
        navigate({ to: "/report/$id", params: { id: result.id } });
      }
    }).catch((err) => {
      if ((err as Error).name !== "AbortError") {
        setError("An unexpected error occurred during analysis.");
      }
    });

    return () => {
      abortRef.current?.abort();
    };
  }, [ready, repoUrl, id, navigate]);

  if (!ready && !error) {
    return (
      <div className="min-h-screen bg-[var(--color-paper)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Radar className="w-8 h-8 text-[#bef264] animate-pulse" />
          <p className="text-sm text-[var(--color-ink-muted)]">Preparing analysis…</p>
        </div>
      </div>
    );
  }

  const currentStageIndex = getStageIndex(state.currentStage ?? "initializing");
  const totalStages = ANALYSIS_STAGES.length;
  const currentStageInfo = ANALYSIS_STAGES.find((s) => s.id === state.currentStage) ?? ANALYSIS_STAGES[0]!;

  return (
    <div className="min-h-screen bg-[var(--color-paper)]">
      {/* Ask Phill Style Navbar matching Homepage */}
      <AskPhillNavbar />

      <main className="max-w-3xl mx-auto px-6 py-12">
        {error ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-[var(--color-ink)] mb-2">Analysis Failed</h1>
            <p className="text-sm text-[var(--color-ink-muted)] mb-6 max-w-sm mx-auto">{error}</p>
            <Button onClick={() => navigate({ to: "/analyze" })} className="bg-[#bef264] text-black hover:bg-[#a3e635] font-bold">
              Try Again <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        ) : (
          <>
            {/* Repository info */}
            {state.repo && (
              <div className="bg-[var(--card)] border border-[var(--color-border)] rounded-2xl p-5 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#bef264]/20 border border-[#bef264]/30 flex items-center justify-center flex-shrink-0">
                    <FileCode2 className="w-5 h-5 text-[#5a7a00]" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[var(--color-ink)]">{state.repo.fullName}</div>
                    <div className="text-xs text-[var(--color-ink-muted)]">
                      {state.repo.language ?? "Unknown"} · {state.repo.stars.toLocaleString()} stars
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Overall progress */}
            <div className="bg-[var(--card)] border border-[var(--color-border)] rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-[#5a7a00] animate-spin" />
                  <span className="text-sm font-bold text-[var(--color-ink)]">Analysis in Progress</span>
                </div>
                <span className="text-sm font-black text-[#5a7a00]">{state.overallProgress ?? 0}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 bg-[var(--color-accent)] rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-[#bef264] rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${state.overallProgress ?? 0}%` }}
                />
              </div>

              {/* Current stage */}
              <div className="flex items-center gap-2 text-sm text-[var(--color-ink)]">
                <Clock className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
                <span className="font-medium">{currentStageInfo.label}</span>
                <span className="text-[var(--color-ink-muted)]">— {currentStageInfo.description}</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: "Files Discovered", value: state.totalFilesDiscovered ?? 0, icon: FileCode2 },
                { label: "Files Inspected", value: state.totalFilesInspected ?? 0, icon: Shield },
                { label: "Findings", value: state.totalFindingsCount ?? 0, icon: AlertTriangle },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-[var(--card)] border border-[var(--color-border)] rounded-xl p-3.5 text-center">
                  <Icon className="w-4 h-4 text-[var(--color-ink-muted)] mx-auto mb-1.5" />
                  <div className="text-xl font-black text-[var(--color-ink)]">{value}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">{label}</div>
                </div>
              ))}
            </div>

            {/* Stage checklist */}
            <div className="bg-[var(--card)] border border-[var(--color-border)] rounded-2xl p-5 mb-6">
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink-muted)] mb-4">Analysis Stages</div>
              <div className="space-y-2.5">
                {ANALYSIS_STAGES.map((stage, i) => {
                  const isCompleted = i < currentStageIndex;
                  const isCurrent = stage.id === state.currentStage;
                  const isPending = i > currentStageIndex;

                  return (
                    <div key={stage.id} className={`flex items-center gap-3 text-sm transition-all ${
                      isCurrent ? "opacity-100" : isPending ? "opacity-40" : "opacity-70"
                    }`}>
                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : isCurrent ? (
                          <Loader2 className="w-4 h-4 text-[#5a7a00] animate-spin" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-[var(--color-border)]" />
                        )}
                      </div>
                      <span className={`flex-1 ${isCurrent ? "font-semibold text-[var(--color-ink)]" : "text-[var(--color-ink-muted)]"}`}>
                        {stage.label}
                      </span>
                      {isCurrent && (
                        <span className="text-xs text-[#5a7a00] font-bold">{state.stageProgress ?? 0}%</span>
                      )}
                      {isCompleted && (
                        <span className="text-xs text-emerald-600 font-semibold">Done</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Analysis log */}
            {(state.analysisLog?.length ?? 0) > 0 && (
              <div className="bg-[var(--card)] border border-[var(--color-border)] rounded-2xl p-5">
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink-muted)] mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#bef264] animate-pulse" />
                  Live Analysis Log
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {(state.analysisLog ?? []).slice(-10).reverse().map((entry, i) => (
                    <div key={i} className="text-xs font-mono text-[var(--color-ink-muted)] leading-relaxed">
                      {entry}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-center text-xs text-[var(--color-ink-muted)] mt-6">
              You can leave this page and return — the analysis will continue.
              Check your <Link to="/dashboard" className="underline hover:text-[var(--color-ink)]">dashboard</Link> for results.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
