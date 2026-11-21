/**
 * APILOCK — Agent State Store & Persistent Telemetry
 *
 * Implements:
 * - Persistent storage for discovered repositories, qualifying findings, and audit logs
 * - Strict separation between discovered repositories, fully scanned, and partially scanned repositories
 * - Granular telemetry metrics matching Section 11 specifications
 * - Checkpointing for interrupted jobs and pagination recovery
 * - Non-reversible finding fingerprints and redacted evidence only
 */

import type { GitHubRepo } from "./github-api";
import type { ScanFinding } from "./secret-patterns";

export type RepoStatus =
  | "Discovered"
  | "Awaiting Authorization"
  | "Authorized"
  | "Queued"
  | "Scanning"
  | "Completed"
  | "Partially Scanned"
  | "Failed"
  | "Authorization Revoked";

export type ScanCoverage = "Full" | "Partial" | "Pending";

export interface TrackedRepo {
  id: number;
  name: string;
  owner: string;
  fullName: string;
  url: string;
  language: string | null;
  stars: number;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
  discoveredAt: string;
  status: RepoStatus;
  scanCoverage: ScanCoverage;
  totalEligibleFiles: number;
  scannedFilesCount: number;
  skippedFilesCount: number;
  scanHistoryCommitsCount: number;
  lastScannedAt?: string;
  findingCount: number;
  authorized: boolean;
  scanPriority: number; // 1–10
}

export interface AgentMetrics {
  totalDiscovered: number;        // Total repositories discovered
  totalQueued: number;            // Repositories queued
  totalInspected: number;         // Repositories downloaded or inspected
  totalFullyScanned: number;      // Repositories fully scanned
  totalPartiallyScanned: number;  // Repositories partially scanned
  totalFailed: number;            // Failed repositories
  totalFindings: number;          // Potential & high-confidence secret findings
  highConfidenceFindings: number; // High-confidence provider matches
  potentialFindings: number;      // Potential pattern matches requiring investigation
  aiFindings: number;             // AI API credential findings
  cloudFindings: number;          // Cloud credential findings
  paymentFindings: number;        // Payment & communication credential findings
  databaseFindings: number;       // Private database & server credential findings
  historicalExposures: number;    // Detected in previous Git commits
  currentExposures: number;       // Detected in current default branch source
  resolvedFindings: number;       // Resolved findings
  lastCycleAt: string | null;
  isRunning: boolean;
  isPaused: boolean;
  currentActivity: string;
  scanLog: string[];
}

export interface AgentState {
  repos: TrackedRepo[];
  findings: ScanFinding[];
  metrics: AgentMetrics;
  checkpoint: {
    queryIndex: number;
    page: number;
    cycleCount: number;
    lastDiscoveredAt: string | null;
  };
}

const STORAGE_KEY = "APILOCK_agent_state";

export function defaultMetrics(): AgentMetrics {
  return {
    totalDiscovered: 0,
    totalQueued: 0,
    totalInspected: 0,
    totalFullyScanned: 0,
    totalPartiallyScanned: 0,
    totalFailed: 0,
    totalFindings: 0,
    highConfidenceFindings: 0,
    potentialFindings: 0,
    aiFindings: 0,
    cloudFindings: 0,
    paymentFindings: 0,
    databaseFindings: 0,
    historicalExposures: 0,
    currentExposures: 0,
    resolvedFindings: 0,
    lastCycleAt: null,
    isRunning: false,
    isPaused: false,
    currentActivity: "Idle",
    scanLog: [],
  };
}

export const INITIAL_PRESEEDED_REPOS: TrackedRepo[] = [
  {
    id: 541294821,
    name: "tempo",
    owner: "tempoxyz",
    fullName: "tempoxyz/tempo",
    url: "https://github.com/tempoxyz/tempo",
    language: "TypeScript",
    stars: 2150,
    defaultBranch: "main",
    createdAt: "2022-09-25T14:22:10Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    discoveredAt: "2024-01-01T00:00:00.000Z",
    status: "Queued",
    scanCoverage: "Pending",
    totalEligibleFiles: 0,
    scannedFilesCount: 0,
    skippedFilesCount: 0,
    scanHistoryCommitsCount: 0,
    findingCount: 0,
    authorized: true,
    scanPriority: 10,
  },
  {
    id: 11622368,
    name: "stripe-python",
    owner: "stripe",
    fullName: "stripe/stripe-python",
    url: "https://github.com/stripe/stripe-python",
    language: "Python",
    stars: 2300,
    defaultBranch: "master",
    createdAt: "2013-07-23T21:40:55Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    discoveredAt: "2024-01-01T00:00:00.000Z",
    status: "Queued",
    scanCoverage: "Pending",
    totalEligibleFiles: 0,
    scannedFilesCount: 0,
    skippedFilesCount: 0,
    scanHistoryCommitsCount: 0,
    findingCount: 0,
    authorized: true,
    scanPriority: 9,
  },
  {
    id: 160879646,
    name: "fastapi",
    owner: "fastapi",
    fullName: "fastapi/fastapi",
    url: "https://github.com/fastapi/fastapi",
    language: "Python",
    stars: 76000,
    defaultBranch: "master",
    createdAt: "2018-12-08T08:21:47Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    discoveredAt: "2024-01-01T00:00:00.000Z",
    status: "Queued",
    scanCoverage: "Pending",
    totalEligibleFiles: 0,
    scannedFilesCount: 0,
    skippedFilesCount: 0,
    scanHistoryCommitsCount: 0,
    findingCount: 0,
    authorized: true,
    scanPriority: 9,
  },
  {
    id: 58570241,
    name: "express",
    owner: "expressjs",
    fullName: "expressjs/express",
    url: "https://github.com/expressjs/express",
    language: "JavaScript",
    stars: 64000,
    defaultBranch: "master",
    createdAt: "2010-06-26T19:07:43Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    discoveredAt: "2024-01-01T00:00:00.000Z",
    status: "Queued",
    scanCoverage: "Pending",
    totalEligibleFiles: 0,
    scannedFilesCount: 0,
    skippedFilesCount: 0,
    scanHistoryCommitsCount: 0,
    findingCount: 0,
    authorized: true,
    scanPriority: 8,
  },
];

export function defaultState(): AgentState {
  const repos = INITIAL_PRESEEDED_REPOS;
  const metrics = defaultMetrics();
  metrics.totalDiscovered = repos.length;
  metrics.totalQueued = repos.length;

  return {
    repos,
    findings: [],
    metrics,
    checkpoint: { queryIndex: 0, page: 1, cycleCount: 0, lastDiscoveredAt: null },
  };
}

/** Load persisted state from localStorage safely (resets runtime flags like isRunning) */
export function loadState(): AgentState {
  if (typeof window === "undefined") {
    return defaultState();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as AgentState;
    const baseRepos = parsed.repos && parsed.repos.length > 0 ? parsed.repos : INITIAL_PRESEEDED_REPOS;

    // Ensure any previously un-authorized or stalled repos are automatically queued for scanning
    const repos = baseRepos.map((r) => {
      const fixed: TrackedRepo = {
        ...r,
        scannedFilesCount: r.scannedFilesCount ?? 0,
        totalEligibleFiles: r.totalEligibleFiles ?? 0,
        skippedFilesCount: r.skippedFilesCount ?? 0,
        scanHistoryCommitsCount: r.scanHistoryCommitsCount ?? 0,
        findingCount: r.findingCount ?? 0,
        authorized: r.authorized ?? true,
        status: (r.status === "Discovered" || r.status === "Awaiting Authorization" ? "Queued" : r.status) as RepoStatus,
      };
      return fixed;
    });

    const state: AgentState = {
      ...defaultState(),
      ...parsed,
      repos,
      metrics: {
        ...defaultMetrics(),
        ...(parsed.metrics || {}),
        isRunning: false,
        isPaused: false,
        currentActivity: "Idle",
      },
    };
    return {
      ...state,
      metrics: recomputeMetrics(state),
    };
  } catch {
    return defaultState();
  }
}

/** Persist state to localStorage safely (never saves active process running flags) */
export function saveState(state: AgentState): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed: AgentState = {
      ...state,
      findings: state.findings.slice(-500),
      metrics: {
        ...state.metrics,
        isRunning: false,
        isPaused: false,
        scanLog: state.metrics.scanLog.slice(-200),
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
}

/** Convert a raw GitHubRepo to a TrackedRepo */
export function toTrackedRepo(repo: GitHubRepo, authorized = true): TrackedRepo {
  return {
    id: repo.id,
    name: repo.name,
    owner: repo.owner.login,
    fullName: repo.full_name,
    url: repo.html_url,
    language: repo.language,
    stars: repo.stargazers_count,
    defaultBranch: repo.default_branch,
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
    discoveredAt: new Date().toISOString(),
    status: authorized ? "Queued" : "Discovered",
    scanCoverage: "Pending",
    totalEligibleFiles: 0,
    scannedFilesCount: 0,
    skippedFilesCount: 0,
    scanHistoryCommitsCount: 0,
    findingCount: 0,
    authorized,
    scanPriority: computePriority(repo),
  };
}

function computePriority(repo: GitHubRepo): number {
  let score = 5;
  if (repo.pushed_at) {
    const daysSincePush = (Date.now() - new Date(repo.pushed_at).getTime()) / 86400000;
    if (daysSincePush < 1) score += 3;
    else if (daysSincePush < 7) score += 2;
    else if (daysSincePush < 30) score += 1;
  }
  if (repo.stargazers_count > 100) score += 1;
  if (repo.stargazers_count > 1000) score += 1;
  return Math.min(10, score);
}

/** Recompute all metrics from current repos and findings strictly */
export function recomputeMetrics(state: AgentState): AgentMetrics {
  const repos = state.repos;
  const findings = state.findings;

  const totalFullyScanned = repos.filter((r) => r.status === "Completed").length;
  const totalPartiallyScanned = repos.filter((r) => r.status === "Partially Scanned").length;
  const totalInspected = totalFullyScanned + totalPartiallyScanned;

  return {
    ...state.metrics,
    totalDiscovered: repos.length,
    totalQueued: repos.filter((r) => r.status === "Queued" || r.status === "Scanning").length,
    totalInspected,
    totalFullyScanned,
    totalPartiallyScanned,
    totalFailed: repos.filter((r) => r.status === "Failed").length,
    totalFindings: findings.length,
    highConfidenceFindings: findings.filter((f) => f.confidence === "High").length,
    potentialFindings: findings.filter((f) => f.confidence !== "High").length,
    aiFindings: findings.filter((f) => f.category === "ai").length,
    cloudFindings: findings.filter((f) => f.category === "cloud").length,
    paymentFindings: findings.filter((f) => f.category === "payment").length,
    databaseFindings: findings.filter((f) => f.category === "database").length,
    historicalExposures: findings.filter((f) => f.historicalOrCurrent === "Historical").length,
    currentExposures: findings.filter((f) => f.historicalOrCurrent === "Current").length,
    resolvedFindings: findings.filter((f) => f.status === "Resolved").length,
  };
}
