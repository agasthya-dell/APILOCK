/**
 * APILOCK — Continuous Global API Secret Exposure Monitoring Agent
 *
 * Implements:
 * 1. Global Public Repository Discovery (multi-query, pagination checkpoints)
 * 2. Manual Public Repository Ingestion (e.g., https://github.com/tempoxyz/tempo)
 * 3. Recursive File Tree Enumeration & Eligible Source Inspection
 * 4. Accessible Git History & Commit Diff Inspection
 * 5. Accurate Complete vs. Partial Scan Coverage Reporting
 * 6. High-Value Secret Detection with Zero-Credential Storage
 * 7. Finding Deduplication (non-reversible fingerprints) & Classification
 * 8. Real-time Dashboard Telemetry Updates
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  discoverNextBatch,
  fetchRepositoryMetadata,
  getFileContent,
  getRecentCommitDetails,
  getRepoTree,
  HIGH_VALUE_CONFIG_FILES,
  isEligibleFile,
  parseGitHubRepoInput,
} from "@/lib/github-api";
import { scanContent, type ScanFinding } from "@/lib/secret-patterns";
import {
  defaultMetrics,
  defaultState,
  loadState,
  recomputeMetrics,
  saveState,
  toTrackedRepo,
  type AgentState,
  type TrackedRepo,
} from "@/lib/agent-store";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useAPILOCKAgent() {
  // Always initialize with defaultState() so SSR and initial client render match identically
  const [state, setState] = useState<AgentState>(() => defaultState());
  const [isClient, setIsClient] = useState(false);
  const [isScanningAll, setIsScanningAll] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const scanAllAbortRef = useRef(false);

  const agentRef = useRef<{ running: boolean; paused: boolean }>({
    running: false,
    paused: false,
  });

  // Client hydration: safely load persisted state once mounted
  useEffect(() => {
    setIsClient(true);
    const persisted = loadState();
    setState(persisted);
  }, []);

  // Persist state to localStorage on every change (only after client mounted)
  useEffect(() => {
    if (isClient) {
      saveState(state);
    }
  }, [state, isClient]);

  const log = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setState((prev) => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        currentActivity: msg,
        scanLog: [`[${timestamp}] ${msg}`, ...prev.metrics.scanLog].slice(0, 250),
      },
    }));
  }, []);

  const updateRepo = useCallback((id: number, patch: Partial<TrackedRepo>) => {
    setState((prev) => {
      const repos = prev.repos.map((r) => (r.id === id ? { ...r, ...patch } : r));
      return { ...prev, repos, metrics: recomputeMetrics({ ...prev, repos }) };
    });
  }, []);

  const addFindings = useCallback((newFindings: ScanFinding[]) => {
    setState((prev) => {
      const existing = new Set(prev.findings.map((f) => f.fingerprint));
      const unique = newFindings.filter((f) => !existing.has(f.fingerprint));
      const findings = [...prev.findings, ...unique];
      return { ...prev, findings, metrics: recomputeMetrics({ ...prev, findings }) };
    });
  }, []);

  const updateFinding = useCallback((id: string, patch: Partial<ScanFinding>) => {
    setState((prev) => {
      const findings = prev.findings.map((f) => (f.id === id ? { ...f, ...patch } : f));
      return { ...prev, findings, metrics: recomputeMetrics({ ...prev, findings }) };
    });
  }, []);

  /**
   * INGEST & DISCOVER A SPECIFIC PUBLIC GITHUB REPO
   * (e.g. https://github.com/tempoxyz/tempo or tempoxyz/tempo)
   */
  const discoverAnyRepository = useCallback(
    async (repoInput: string): Promise<{ success: boolean; message: string }> => {
      const parsed = parseGitHubRepoInput(repoInput);
      if (!parsed) {
        return { success: false, message: "Invalid GitHub repository URL or format. Use owner/repo or full URL." };
      }

      log(`Fetching public repository metadata for ${parsed.owner}/${parsed.repo}...`);
      const meta = await fetchRepositoryMetadata(parsed.owner, parsed.repo);
      if (!meta) {
        log(`✗ Repository ${parsed.owner}/${parsed.repo} not found or not publicly accessible.`);
        return { success: false, message: `Repository ${parsed.owner}/${parsed.repo} not found on GitHub.` };
      }

      const tracked = toTrackedRepo(meta, true); // Automatically authorize manually targeted repo for scanning
      tracked.status = "Queued";

      setState((prev) => {
        const filtered = prev.repos.filter((r) => r.id !== tracked.id);
        const repos = [tracked, ...filtered];
        return { ...prev, repos, metrics: recomputeMetrics({ ...prev, repos }) };
      });

      log(`✓ Discovered & queued public repository: ${meta.full_name} (${meta.stargazers_count.toLocaleString()} stars)`);
      return { success: true, message: `Discovered and queued ${meta.full_name} for scanning.` };
    },
    [log],
  );

  /**
   * COMPLETE REPOSITORY FILE & GIT HISTORY INSPECTION
   * Accurately tracks complete vs. partial scan coverage.
   */
  const scanRepository = useCallback(
    async (repo: TrackedRepo) => {
      if (!repo.authorized) return;

      updateRepo(repo.id, { status: "Scanning" });
      log(`Scanning repository: ${repo.fullName} [branch: ${repo.defaultBranch}]...`);

      try {
        const repoFindings: ScanFinding[] = [];

        // 1. Recursive Tree Enumeration
        const treeResult = await getRepoTree(repo.owner, repo.name, repo.defaultBranch);
        const allFiles = treeResult.files.filter((f) => f.type === "blob");
        const eligibleFiles = allFiles.filter((f) => isEligibleFile(f.path));

        const totalEligibleFiles = eligibleFiles.length;
        let scannedFilesCount = 0;
        let skippedFilesCount = 0;

        // Prioritize high-value config files first, then eligible source code
        const prioritizedFiles = [
          ...eligibleFiles.filter((f) => HIGH_VALUE_CONFIG_FILES.some((cf) => f.path.toLowerCase().endsWith(cf.toLowerCase()))),
          ...eligibleFiles.filter((f) => !HIGH_VALUE_CONFIG_FILES.some((cf) => f.path.toLowerCase().endsWith(cf.toLowerCase()))),
        ];

        // Safe inspection cap per repository to avoid API abuse (50 files per sweep)
        const FILE_SCAN_CAP = 50;
        const targetBatch = prioritizedFiles.slice(0, FILE_SCAN_CAP);
        skippedFilesCount = Math.max(0, eligibleFiles.length - targetBatch.length);

        for (const file of targetBatch) {
          if (!agentRef.current.running) break;

          // Skip large files (> 400KB)
          if (file.size && file.size > 400_000) {
            skippedFilesCount++;
            continue;
          }

          const content = await getFileContent(repo.owner, repo.name, file.path);
          if (!content) {
            skippedFilesCount++;
            continue;
          }

          scannedFilesCount++;
          const detected = scanContent(
            content,
            file.path,
            repo.owner,
            repo.name,
            repo.url,
            repo.defaultBranch,
            "HEAD",
            false,
          );

          if (detected.length > 0) {
            repoFindings.push(...detected);
            log(`⚠ ${detected.length} secret exposure(s) detected in ${repo.fullName}/${file.path}`);
          }

          await sleep(150);
        }

        // 2. Git Commit History Inspection (Accessible recent commits)
        let scannedCommitsCount = 0;
        try {
          const commits = await getRecentCommitDetails(repo.owner, repo.name, repo.defaultBranch, 3);
          scannedCommitsCount = commits.length;
          for (const c of commits) {
            if (!agentRef.current.running) break;
            for (const file of c.files || []) {
              if (file.patch && isEligibleFile(file.filename)) {
                const patchFindings = scanContent(
                  file.patch,
                  file.filename,
                  repo.owner,
                  repo.name,
                  repo.url,
                  repo.defaultBranch,
                  c.sha.slice(0, 7),
                  true,
                );
                if (patchFindings.length > 0) {
                  repoFindings.push(...patchFindings);
                  log(`⚠ Historical exposure detected in commit ${c.sha.slice(0, 7)}: ${file.filename}`);
                }
              }
            }
          }
        } catch {
          // Commit inspection completed with partial history
        }

        addFindings(repoFindings);

        // Determine complete vs. partial coverage strictly (Section 3G)
        const isPartial =
          treeResult.truncated ||
          skippedFilesCount > 0 ||
          scannedFilesCount < totalEligibleFiles;

        const finalStatus = isPartial ? "Partially Scanned" : "Completed";
        const finalCoverage = isPartial ? "Partial" : "Full";

        updateRepo(repo.id, {
          status: finalStatus,
          scanCoverage: finalCoverage,
          totalEligibleFiles,
          scannedFilesCount,
          skippedFilesCount,
          scanHistoryCommitsCount: scannedCommitsCount,
          lastScannedAt: new Date().toISOString(),
          findingCount: repoFindings.length,
        });

        log(
          `✓ ${finalCoverage} scan completed: ${repo.fullName} (${scannedFilesCount}/${totalEligibleFiles} files, ${repoFindings.length} finding(s))`
        );
      } catch (err) {
        updateRepo(repo.id, { status: "Failed" });
        log(`✗ Scan failed for ${repo.fullName}`);
      }
    },
    [updateRepo, addFindings, log],
  );

  /**
   * GLOBAL REPOSITORY DISCOVERY CYCLE
   */
  const runDiscoveryCycle = useCallback(async () => {
    log("Running global repository discovery sweep across public sectors...");

    const currentCheckpoint = state.checkpoint;
    const { repos: discovered, nextCheckpoint } = await discoverNextBatch(
      currentCheckpoint,
      20,
      log,
    );

    setState((prev) => {
      const existingIds = new Set(prev.repos.map((r) => r.id));
      const newRepos = discovered
        .filter((r) => !existingIds.has(r.id))
        .map((r) => toTrackedRepo(r, true));

      log(`Discovered ${newRepos.length} new public repositories worldwide (total discovered: ${prev.repos.length + newRepos.length})`);

      const repos = [...prev.repos, ...newRepos];
      return {
        ...prev,
        repos,
        checkpoint: {
          ...nextCheckpoint,
          cycleCount: prev.checkpoint.cycleCount + 1,
          lastDiscoveredAt: new Date().toISOString(),
        },
        metrics: recomputeMetrics({ ...prev, repos }),
      };
    });
  }, [state.checkpoint, log]);

  /**
   * CONTINUOUS MONITORING PIPELINE
   */
  const startMonitoring = useCallback(async () => {
    if (agentRef.current.running) return;
    agentRef.current.running = true;
    agentRef.current.paused = false;

    setState((prev) => ({
      ...prev,
      metrics: { ...prev.metrics, isRunning: true, isPaused: false },
    }));

    log("▶ APILOCK agent started. Beginning continuous discovery and authorized scanning...");

    try {
      while (agentRef.current.running) {
        while (agentRef.current.paused && agentRef.current.running) {
          await sleep(500);
        }
        if (!agentRef.current.running) break;

        // 1. First process any queued or authorized repositories (including pre-seeded existing repositories like tempoxyz/tempo)
        let queued = stateRef.current.repos
          .filter((r) => r.authorized && (r.status === "Queued" || r.status === "Authorized" || r.status === "Discovered"))
          .sort((a, b) => b.scanPriority - a.scanPriority);

        // If no repositories are ready, run a discovery cycle to discover public repositories worldwide
        if (queued.length === 0) {
          await runDiscoveryCycle();
          queued = stateRef.current.repos
            .filter((r) => r.authorized && (r.status === "Queued" || r.status === "Authorized"))
            .sort((a, b) => b.scanPriority - a.scanPriority);
        }

        // 2. Scan queued existing repositories one by one with rate-limit pauses
        for (const repo of queued) {
          if (!agentRef.current.running) break;
          while (agentRef.current.paused && agentRef.current.running) await sleep(500);
          await scanRepository(repo);
          await sleep(350);
        }

        // 3. Discover more public repositories worldwide for the next round
        if (agentRef.current.running) {
          await runDiscoveryCycle();
        }

        setState((prev) => ({
          ...prev,
          metrics: {
            ...prev.metrics,
            lastCycleAt: new Date().toISOString(),
            currentActivity: "Cycle completed. Standing by for next discovery cycle...",
          },
        }));

        log("Discovery & scan cycle complete. Next cycle in 3 minutes...");
        for (let i = 0; i < 180; i++) {
          if (!agentRef.current.running) break;
          await sleep(1000);
        }
      }
    } finally {
      agentRef.current.running = false;
      setState((prev) => ({
        ...prev,
        metrics: { ...prev.metrics, isRunning: false, isPaused: false, currentActivity: "Stopped" },
      }));
      log("■ Monitoring agent stopped.");
    }
  }, [runDiscoveryCycle, scanRepository, log]);

  const stopMonitoring = useCallback(() => {
    agentRef.current.running = false;
    agentRef.current.paused = false;
    log("■ Stopping monitoring agent...");
  }, [log]);

  const pauseMonitoring = useCallback(() => {
    agentRef.current.paused = true;
    setState((prev) => ({
      ...prev,
      metrics: { ...prev.metrics, isPaused: true, currentActivity: "Paused" },
    }));
    log("⏸ Monitoring paused.");
  }, [log]);

  const resumeMonitoring = useCallback(() => {
    agentRef.current.paused = false;
    setState((prev) => ({
      ...prev,
      metrics: { ...prev.metrics, isPaused: false },
    }));
    log("▶ Monitoring resumed.");
  }, [log]);

  /** Manual scan trigger for existing repositories */
  const scanNow = useCallback(async () => {
    log("⚡ Manual scan triggered for existing repositories...");
    let toScan = stateRef.current.repos
      .filter((r) => r.status !== "Scanning" && (r.status === "Queued" || r.status === "Authorized" || r.status === "Discovered" || r.status === "Partially Scanned"))
      .slice(0, 5);

    if (toScan.length === 0 && stateRef.current.repos.length > 0) {
      toScan = stateRef.current.repos.slice(0, 5);
    }

    if (toScan.length === 0) {
      log("Discovering public repositories worldwide...");
      await runDiscoveryCycle();
      toScan = stateRef.current.repos.slice(0, 5);
    }

    for (const repo of toScan) {
      const target = { ...repo, authorized: true };
      await scanRepository(target);
      await sleep(300);
    }
  }, [runDiscoveryCycle, scanRepository, log]);

  /** Scan all discovered/filtered repositories in sequence */
  const scanAllRepositories = useCallback(
    async (targetRepos?: TrackedRepo[]) => {
      if (isScanningAll) return;
      scanAllAbortRef.current = false;
      setIsScanningAll(true);

      const list = targetRepos && targetRepos.length > 0 ? targetRepos : stateRef.current.repos;
      const toScan = list.filter((r) => r.status !== "Scanning");
      log(`⚡ Initiating full sweep: scanning all ${toScan.length} repositories...`);

      try {
        for (let i = 0; i < toScan.length; i++) {
          if (scanAllAbortRef.current) {
            log("■ Scan All batch interrupted by user.");
            break;
          }
          const repo = toScan[i];
          if (!repo) continue;
          log(`[${i + 1}/${toScan.length}] Scanning ${repo.fullName}...`);
          const target: TrackedRepo = { ...repo, authorized: true };
          await scanRepository(target);
          await sleep(250);
        }
        if (!scanAllAbortRef.current) {
          log(`✓ Batch scan completed across all ${toScan.length} repositories.`);
        }
      } finally {
        setIsScanningAll(false);
        scanAllAbortRef.current = false;
      }
    },
    [isScanningAll, scanRepository, log],
  );

  const stopScanAll = useCallback(() => {
    scanAllAbortRef.current = true;
    setIsScanningAll(false);
    log("■ Stopping Scan All process...");
  }, [log]);

  /** Authorize all discovered repositories in one click */
  const authorizeAllRepos = useCallback(
    (authorized = true) => {
      setState((prev) => {
        const repos = prev.repos.map((r) => ({
          ...r,
          authorized,
          status: (authorized
            ? r.status === "Discovered" || r.status === "Awaiting Authorization"
              ? "Queued"
              : r.status
            : "Discovered") as TrackedRepo["status"],
        }));
        return { ...prev, repos, metrics: recomputeMetrics({ ...prev, repos }) };
      });
      log(
        authorized
          ? `✓ All ${stateRef.current.repos.length} repositories authorized for scanning`
          : `All repository authorizations revoked`,
      );
    },
    [log],
  );

  /** Authorize / revoke repository scanning authorization */
  const authorizeRepo = useCallback(
    (id: number, authorized: boolean) => {
      updateRepo(id, {
        authorized,
        status: authorized ? "Authorized" : "Discovered",
      });
      log(authorized ? `✓ Repository authorized for source-code scanning` : `Repository authorization revoked`);
    },
    [updateRepo, log],
  );

  /** Refresh telemetry from state */
  const refresh = useCallback(() => {
    setState((prev) => ({ ...prev, metrics: recomputeMetrics(prev) }));
    log("↺ Dashboard telemetry refreshed");
  }, [log]);

  /**
   * EXPORT STRUCTURED SECURITY REPORT (Section 8 Specification)
   */
  const exportReport = useCallback(() => {
    const snap = loadState();
    const lines: string[] = [
      "═════════════════════════════════════════════════════════════════════════",
      "  APILOCK — GLOBAL PUBLIC GITHUB SECRET EXPOSURE AUDIT REPORT",
      `  Generated: ${new Date().toLocaleString()}`,
      "═════════════════════════════════════════════════════════════════════════",
      "",
      "EXECUTIVE SUMMARY",
      "─────────────────────────────────────────────────────────────────────────",
      `Total Repositories Discovered:       ${snap.metrics.totalDiscovered}`,
      `Repositories Queued for Scan:        ${snap.metrics.totalQueued}`,
      `Repositories Inspected:              ${snap.metrics.totalInspected}`,
      `  Fully Scanned (Complete Coverage): ${snap.metrics.totalFullyScanned}`,
      `  Partially Scanned (Capped/Large):  ${snap.metrics.totalPartiallyScanned}`,
      `Failed Repository Scans:             ${snap.metrics.totalFailed}`,
      `Total Qualifying Secret Exposures:   ${snap.metrics.totalFindings}`,
      `  High-Confidence Detections:        ${snap.metrics.highConfidenceFindings}`,
      `  Potential Exposures (Review):      ${snap.metrics.potentialFindings}`,
      `  AI API Credentials:                ${snap.metrics.aiFindings}`,
      `  Cloud Infrastructure Credentials:  ${snap.metrics.cloudFindings}`,
      `  Payment & Communication:           ${snap.metrics.paymentFindings}`,
      `  Private Database Credentials:      ${snap.metrics.databaseFindings}`,
      `  Historical Commit Exposures:       ${snap.metrics.historicalExposures}`,
      `  Current Source Exposures:          ${snap.metrics.currentExposures}`,
      "",
      "QUALIFYING FINDINGS (REDACTED EVIDENCE ONLY — ZERO RAW CREDENTIALS STORED)",
      "─────────────────────────────────────────────────────────────────────────",
      "",
    ];

    for (const f of snap.findings) {
      lines.push(
        `Repository:         ${f.repoOwner}/${f.repoName}`,
        `Repository URL:     ${f.repoUrl}`,
        `Provider:           ${f.provider}`,
        `Secret Type:        ${f.secretType}`,
        `File:               ${f.file}`,
        `Line:               ${f.line}`,
        `Direct Link:        ${f.fileUrl}`,
        `Commit:             ${f.commitHash}`,
        `Exposure Status:    ${f.historicalOrCurrent} Exposure (${f.classification})`,
        `Severity:           ${f.severity}`,
        `Confidence:         ${f.confidence}`,
        `Credential Value:   Not collected (Redacted Evidence: ${f.redactedEvidence})`,
        `First Detected:     ${new Date(f.firstDetected).toLocaleString()}`,
        `Last Detected:      ${new Date(f.lastDetected).toLocaleString()}`,
        `Recommended Action:`,
        `  - ${f.suggestedAction}`,
        "",
        "─────────────────────────────────────────────────────────────────────────",
        "",
      );
    }

    if (snap.findings.length === 0) {
      lines.push("No secret exposures detected in currently scanned repositories.");
      lines.push("Discovery is active across global public repositories.");
    }

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `APILOCK-audit-report-${Date.now()}.txt`;
    a.click();
    log("📄 Structured security report exported successfully.");
  }, [log]);

  /** Reset state and checkpoints */
  const resetAgent = useCallback(() => {
    agentRef.current.running = false;
    setState(() => {
      const fresh: AgentState = {
        repos: [],
        findings: [],
        metrics: defaultMetrics(),
        checkpoint: { queryIndex: 0, page: 1, cycleCount: 0, lastDiscoveredAt: null },
      };
      saveState(fresh);
      return fresh;
    });
    log("↺ Agent state, metrics, and checkpoints reset.");
  }, [log]);

  return {
    state,
    isRunning: state.metrics.isRunning,
    isPaused: state.metrics.isPaused,
    isScanningAll,
    metrics: state.metrics,
    repos: state.repos,
    findings: state.findings,
    discoverAnyRepository,
    startMonitoring,
    stopMonitoring,
    pauseMonitoring,
    resumeMonitoring,
    scanNow,
    scanAllRepositories,
    stopScanAll,
    authorizeAllRepos,
    scanRepository,
    authorizeRepo,
    updateFinding,
    refresh,
    exportReport,
    resetAgent,
    log,
  };
}

export { useAPILOCKAgent as useSecretRadarAgent };
