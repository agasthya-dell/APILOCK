/**
 * APILOCK — Repository Health Analysis Store
 *
 * Persistent storage for analysis jobs, health scores, findings, and history.
 * All data is stored in localStorage — no raw credentials are ever stored.
 */

import type { ScanFinding } from "./secret-patterns";

export type AnalysisStatus =
  | "queued"
  | "initializing"
  | "fetching_tree"
  | "mapping_structure"
  | "analyzing_code"
  | "checking_quality"
  | "scanning_secrets"
  | "auditing_deps"
  | "evaluating_docs"
  | "evaluating_tests"
  | "calculating_score"
  | "generating_report"
  | "completed"
  | "failed"
  | "partial";

export interface AnalysisStage {
  id: AnalysisStatus;
  label: string;
  description: string;
}

export const ANALYSIS_STAGES: AnalysisStage[] = [
  { id: "initializing", label: "Initializing", description: "Setting up repository analysis..." },
  { id: "fetching_tree", label: "File Discovery", description: "Retrieving repository file tree..." },
  { id: "mapping_structure", label: "Structure Mapping", description: "Mapping project structure and architecture..." },
  { id: "analyzing_code", label: "Source Analysis", description: "Inspecting source code files..." },
  { id: "checking_quality", label: "Code Quality", description: "Evaluating code quality and complexity..." },
  { id: "scanning_secrets", label: "Security Scan", description: "Detecting exposed credentials and security issues..." },
  { id: "auditing_deps", label: "Dependency Audit", description: "Auditing dependency manifests..." },
  { id: "evaluating_docs", label: "Documentation", description: "Evaluating documentation quality..." },
  { id: "evaluating_tests", label: "Testing Analysis", description: "Analyzing test coverage and organization..." },
  { id: "calculating_score", label: "Health Score", description: "Calculating overall repository health score..." },
  { id: "generating_report", label: "Report Generation", description: "Generating final analysis report..." },
];

export interface CategoryScore {
  score: number;
  maxScore: number;
  available: boolean;
  unavailableReason?: string | undefined;
  findings: AnalysisFinding[];
}

export interface HealthScores {
  overall: number; // 0-100
  codeQuality: CategoryScore; // 20 pts
  projectStructure: CategoryScore; // 15 pts
  security: CategoryScore; // 25 pts
  dependencyHealth: CategoryScore; // 15 pts
  documentation: CategoryScore; // 10 pts
  testing: CategoryScore; // 10 pts
  maintainability: CategoryScore; // 5 pts
}

export type FindingSeverity = "critical" | "high" | "medium" | "low" | "info";

export interface AnalysisFinding {
  id: string;
  category: "code_quality" | "structure" | "security" | "dependency" | "documentation" | "testing" | "maintainability";
  title: string;
  description: string;
  file?: string;
  line?: number;
  severity: FindingSeverity;
  whyItMatters: string;
  recommendation: string;
  evidence?: string;
}

export interface DependencyInfo {
  name: string;
  currentVersion: string;
  latestVersion?: string | undefined;
  isOutdated: boolean;
  vulnerabilities: string[];
  severity?: FindingSeverity | undefined;
}

export interface StructureInfo {
  folderTree: FolderNode;
  totalFiles: number;
  totalFolders: number;
  primaryLanguage: string;
  languages: Record<string, number>; // language -> file count
  largeFiles: Array<{ path: string; size: number; lines?: number }>;
  configFiles: string[];
  hasTests: boolean;
  testFrameworks: string[];
  hasCI: boolean;
  ciFiles: string[];
  dependencyFiles: string[];
}

export interface FolderNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FolderNode[] | undefined;
  size?: number | undefined;
}

export interface RepoMetadata {
  id: number;
  owner: string;
  name: string;
  fullName: string;
  url: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  size: number;
  isPrivate: boolean;
  topics: string[];
  source: "github_url" | "github_oauth" | "zip_upload";
}

export interface ImprovementItem {
  priority: 1 | 2 | 3 | 4;
  priorityLabel: "Critical" | "High" | "Medium" | "Optional";
  title: string;
  description: string;
  category: string;
  estimatedImpact: string;
  evidence?: string | undefined;
}

export interface AnalysisResult {
  id: string;
  status: AnalysisStatus;
  currentStage: AnalysisStatus;
  stageProgress: number; // 0-100 within current stage
  overallProgress: number; // 0-100

  // Repository info
  repo: RepoMetadata;

  // Stats
  totalFilesDiscovered: number;
  totalFilesInspected: number;
  totalFindingsCount: number;
  filesSkipped: number;
  treeTruncated: boolean;

  // Analysis results
  scores: HealthScores;
  findings: AnalysisFinding[];
  secretFindings: ScanFinding[];
  dependencies: DependencyInfo[];
  structure: StructureInfo | null;
  improvementRoadmap: ImprovementItem[];

  // Overview
  strengths: string[];
  weaknesses: string[];
  keyObservations: string[];

  // Timestamps
  startedAt: string;
  completedAt?: string;
  analysisLog: string[];

  // Error
  errorMessage?: string;
}

export interface UserAnalysisHistory {
  analyses: AnalysisResult[];
  userId?: string; // For future auth integration
}

const HISTORY_KEY = "APILOCK_analysis_history";
const MAX_STORED_ANALYSES = 20;

export function loadAnalysisHistory(): AnalysisResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AnalysisResult[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAnalysis(analysis: AnalysisResult): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadAnalysisHistory();
    const filtered = existing.filter((a) => a.id !== analysis.id);
    const updated = [analysis, ...filtered].slice(0, MAX_STORED_ANALYSES);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify([analysis]));
    } catch {}
  }
}

export function getAnalysis(id: string): AnalysisResult | null {
  const history = loadAnalysisHistory();
  return history.find((a) => a.id === id) ?? null;
}

export function deleteAnalysis(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadAnalysisHistory().filter((a) => a.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(existing));
  } catch {}
}

export function createEmptyScores(): HealthScores {
  return {
    overall: 0,
    codeQuality: { score: 0, maxScore: 20, available: false, findings: [] },
    projectStructure: { score: 0, maxScore: 15, available: false, findings: [] },
    security: { score: 0, maxScore: 25, available: false, findings: [] },
    dependencyHealth: { score: 0, maxScore: 15, available: false, findings: [] },
    documentation: { score: 0, maxScore: 10, available: false, findings: [] },
    testing: { score: 0, maxScore: 10, available: false, findings: [] },
    maintainability: { score: 0, maxScore: 5, available: false, findings: [] },
  };
}

export function getHealthLabel(score: number): { label: string; color: string; bgColor: string } {
  if (score >= 85) return { label: "Excellent", color: "text-emerald-700", bgColor: "bg-emerald-50 border-emerald-200" };
  if (score >= 70) return { label: "Good", color: "text-lime-700", bgColor: "bg-lime-50 border-lime-200" };
  if (score >= 55) return { label: "Fair", color: "text-yellow-700", bgColor: "bg-yellow-50 border-yellow-200" };
  if (score >= 40) return { label: "Needs Improvement", color: "text-orange-700", bgColor: "bg-orange-50 border-orange-200" };
  return { label: "Poor", color: "text-red-700", bgColor: "bg-red-50 border-red-200" };
}

export function getSeverityColor(severity: FindingSeverity): string {
  switch (severity) {
    case "critical": return "text-red-700 bg-red-50 border-red-200";
    case "high": return "text-orange-700 bg-orange-50 border-orange-200";
    case "medium": return "text-yellow-700 bg-yellow-50 border-yellow-200";
    case "low": return "text-blue-700 bg-blue-50 border-blue-200";
    case "info": return "text-gray-600 bg-gray-50 border-gray-200";
  }
}
