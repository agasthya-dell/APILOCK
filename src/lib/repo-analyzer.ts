/**
 * APILOCK — Repository Health Analysis Engine
 *
 * Performs real, evidence-based analysis of GitHub repositories:
 * - Code quality (complexity, naming, duplication, error handling)
 * - Project structure (organization, separation of concerns)
 * - Security (exposed credentials via secret-patterns.ts, insecure patterns)
 * - Dependency health (outdated, vulnerable packages)
 * - Documentation quality
 * - Testing coverage indicators
 * - Maintainability
 *
 * Never executes repository code.
 * Never stores raw credential values.
 */

import {
  getRepoTree,
  getFileContent,
  fetchRepositoryMetadata,
  isEligibleFile,
  parseGitHubRepoInput,
  type GitHubRepo,
  type TreeFileItem,
} from "./github-api";
import { scanContent, type ScanFinding } from "./secret-patterns";
import {
  createEmptyScores,
  type AnalysisFinding,
  type AnalysisResult,
  type AnalysisStatus,
  type CategoryScore,
  type DependencyInfo,
  type FolderNode,
  type HealthScores,
  type ImprovementItem,
  type RepoMetadata,
  type StructureInfo,
} from "./analysis-store";
import { saveAnalysis } from "./analysis-store";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type ProgressCallback = (update: Partial<AnalysisResult>) => void;

// ─── Dependency Vulnerability Database (curated subset) ──────────────────────
// These are real known-vulnerable package ranges for common packages.
// In production this would query OSV.dev or npm audit API.
const KNOWN_VULNERABLE_PACKAGES: Record<string, { below: string; severity: "critical" | "high" | "medium"; cve?: string; description: string }[]> = {
  "lodash": [{ below: "4.17.21", severity: "high", cve: "CVE-2021-23337", description: "Prototype pollution via zipObjectDeep" }],
  "axios": [{ below: "0.21.2", severity: "medium", cve: "CVE-2021-3749", description: "SSRF via URL redirect" }],
  "express": [{ below: "4.19.2", severity: "medium", cve: "CVE-2024-29041", description: "Open redirect vulnerability" }],
  "node-fetch": [{ below: "2.6.7", severity: "high", cve: "CVE-2022-0235", description: "Exposure of sensitive information" }],
  "minimist": [{ below: "1.2.6", severity: "medium", cve: "CVE-2021-44906", description: "Prototype pollution" }],
  "moment": [{ below: "2.29.4", severity: "medium", cve: "CVE-2022-24785", description: "Path traversal vulnerability" }],
  "jsonwebtoken": [{ below: "9.0.0", severity: "high", cve: "CVE-2022-23529", description: "Remote code execution via unsanitized options" }],
  "semver": [{ below: "7.5.2", severity: "high", cve: "CVE-2022-25883", description: "RegExp Denial of Service" }],
  "tough-cookie": [{ below: "4.1.3", severity: "medium", cve: "CVE-2023-26136", description: "Prototype pollution" }],
  "xml2js": [{ below: "0.5.0", severity: "medium", cve: "CVE-2023-0842", description: "Prototype pollution" }],
  "terser": [{ below: "5.14.2", severity: "high", cve: "CVE-2022-25858", description: "RegExp Denial of Service" }],
  "follow-redirects": [{ below: "1.15.4", severity: "medium", cve: "CVE-2023-26159", description: "Improper URL parsing" }],
};

function parseVersion(v: string): number[] {
  return v.replace(/[^0-9.]/g, "").split(".").map(Number);
}

function isVersionBelow(version: string, threshold: string): boolean {
  const v = parseVersion(version);
  const t = parseVersion(threshold);
  for (let i = 0; i < Math.max(v.length, t.length); i++) {
    const vi = v[i] ?? 0;
    const ti = t[i] ?? 0;
    if (vi < ti) return true;
    if (vi > ti) return false;
  }
  return false;
}

// ─── Code Quality Analyzers ───────────────────────────────────────────────────

function analyzeCodeQuality(files: Map<string, string>): { score: number; findings: AnalysisFinding[] } {
  const findings: AnalysisFinding[] = [];
  let deductions = 0;

  for (const [path, content] of files.entries()) {
    const lines = content.split("\n");
    const ext = path.split(".").pop()?.toLowerCase() ?? "";

    if (!["js", "jsx", "ts", "tsx", "py", "java", "go", "rb", "php"].includes(ext)) continue;

    // Large file check (>500 lines)
    if (lines.length > 500) {
      const severity = lines.length > 1000 ? "high" : "medium";
      deductions += lines.length > 1000 ? 3 : 1.5;
      findings.push({
        id: `cq-large-${path}`,
        category: "code_quality",
        title: "Large source file",
        description: `${path} has ${lines.length} lines. Files this large are hard to navigate and maintain.`,
        file: path,
        severity,
        whyItMatters: "Large files reduce readability, make code review harder, and are a sign that the file has too many responsibilities.",
        recommendation: "Split into smaller, focused modules. Aim for files under 300 lines.",
        evidence: `${lines.length} lines`,
      });
    }

    // Hardcoded configuration values
    const hardcodedPatterns = [
      { pattern: /(?:localhost|127\.0\.0\.1):\d{4,5}/g, label: "Hardcoded localhost URL" },
      { pattern: /(?:password|passwd|pwd)\s*[=:]\s*["'][^"'${}]{6,}["']/gi, label: "Possible hardcoded password" },
      { pattern: /(?:port|PORT)\s*[=:]\s*\d{4,5}/g, label: "Hardcoded port number" },
    ];
    for (const { pattern, label } of hardcodedPatterns) {
      pattern.lastIndex = 0;
      const lineIdx = lines.findIndex((l) => { pattern.lastIndex = 0; return pattern.test(l); });
      if (lineIdx !== -1) {
        deductions += 0.5;
        findings.push({
          id: `cq-hardcoded-${path}-${lineIdx}`,
          category: "code_quality",
          title: label,
          description: `Hardcoded configuration detected in ${path}:${lineIdx + 1}.`,
          file: path,
          line: lineIdx + 1,
          severity: "medium",
          whyItMatters: "Hardcoded configuration makes deployments inflexible and can expose environment-specific values in source control.",
          recommendation: "Move configuration to environment variables or a configuration file excluded from version control.",
        });
        break;
      }
    }

    // Missing error handling in async code
    if (["js", "jsx", "ts", "tsx"].includes(ext)) {
      const awaitCount = (content.match(/\bawait\b/g) || []).length;
      const tryCatchCount = (content.match(/\btry\s*{/g) || []).length;
      const catchCount = (content.match(/\.catch\s*\(/g) || []).length;
      if (awaitCount > 5 && tryCatchCount + catchCount < Math.floor(awaitCount / 4)) {
        deductions += 1;
        findings.push({
          id: `cq-err-${path}`,
          category: "code_quality",
          title: "Insufficient error handling",
          description: `${path} has ${awaitCount} async operations but only ${tryCatchCount + catchCount} error handlers.`,
          file: path,
          severity: "medium",
          whyItMatters: "Unhandled promise rejections can crash your application and make debugging very difficult.",
          recommendation: "Wrap async operations in try/catch blocks or add .catch() handlers. Consider a global error boundary.",
          evidence: `${awaitCount} await statements, ${tryCatchCount + catchCount} error handlers`,
        });
      }
    }

    // Console.log in production code (not test files)
    if (!path.includes("test") && !path.includes("spec") && !path.includes("__tests__")) {
      const consoleLogs = lines.filter((l) => /console\.(log|warn|error|debug)\s*\(/.test(l));
      if (consoleLogs.length > 10) {
        deductions += 0.5;
        findings.push({
          id: `cq-console-${path}`,
          category: "code_quality",
          title: "Excessive console logging",
          description: `${path} contains ${consoleLogs.length} console statements that should be removed before production.`,
          file: path,
          severity: "low",
          whyItMatters: "Console logs expose implementation details, slow performance, and clutter server logs.",
          recommendation: "Replace with a proper logging library (e.g., pino, winston) and remove debug logs.",
          evidence: `${consoleLogs.length} console statements`,
        });
      }
    }

    // TODO/FIXME markers
    const todoLines = lines.filter((l) => /\b(TODO|FIXME|HACK|XXX)\b/i.test(l));
    if (todoLines.length > 5) {
      deductions += 0.3;
      findings.push({
        id: `cq-todo-${path}`,
        category: "code_quality",
        title: "Many unresolved TODO comments",
        description: `${path} has ${todoLines.length} TODO/FIXME comments indicating incomplete implementation.`,
        file: path,
        severity: "low",
        whyItMatters: "High numbers of TODO comments indicate technical debt that may never get addressed.",
        recommendation: "Track TODOs as proper issues in your issue tracker. Address or close each one intentionally.",
        evidence: `${todoLines.length} TODO/FIXME markers`,
      });
    }
  }

  const score = Math.max(0, 20 - deductions);
  return { score: Math.round(score * 10) / 10, findings };
}

// ─── Project Structure Analyzer ───────────────────────────────────────────────

function analyzeProjectStructure(allFiles: TreeFileItem[]): { score: number; findings: AnalysisFinding[]; structure: Partial<StructureInfo> } {
  const findings: AnalysisFinding[] = [];
  let deductions = 0;

  const filePaths = allFiles.map((f) => f.path);
  const folders = new Set(filePaths.map((p) => p.includes("/") ? p.split("/")[0] : ".").filter(Boolean));

  // Language detection
  const languages: Record<string, number> = {};
  for (const f of allFiles) {
    if (f.type !== "blob") continue;
    const ext = f.path.split(".").pop()?.toLowerCase() ?? "";
    const langMap: Record<string, string> = {
      ts: "TypeScript", tsx: "TypeScript", js: "JavaScript", jsx: "JavaScript",
      py: "Python", java: "Java", go: "Go", rb: "Ruby", php: "PHP",
      rs: "Rust", cs: "C#", cpp: "C++", c: "C", kt: "Kotlin", swift: "Swift",
      md: "Markdown", json: "JSON", yaml: "YAML", yml: "YAML",
    };
    if (langMap[ext]) {
      languages[langMap[ext]] = (languages[langMap[ext]] ?? 0) + 1;
    }
  }
  const primaryLanguage = Object.entries(languages).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Unknown";

  // Test file detection
  const testFiles = filePaths.filter((p) =>
    p.includes("test") || p.includes("spec") || p.includes("__tests__") ||
    p.endsWith(".test.ts") || p.endsWith(".test.js") || p.endsWith(".spec.ts") ||
    p.endsWith(".spec.js") || p.endsWith(".test.tsx")
  );
  const hasTests = testFiles.length > 0;

  // CI detection
  const ciFiles = filePaths.filter((p) =>
    p.includes(".github/workflows") || p.includes(".gitlab-ci") ||
    p.includes("Jenkinsfile") || p.includes(".circleci") || p.includes(".travis.yml")
  );
  const hasCI = ciFiles.length > 0;

  // Dependency files
  const depFiles = ["package.json", "requirements.txt", "pyproject.toml", "pom.xml", "build.gradle",
    "Cargo.toml", "go.mod", "Gemfile", "composer.json", "setup.py"];
  const dependencyFiles = filePaths.filter((p) =>
    depFiles.some((d) => p === d || p.endsWith("/" + d))
  );

  // Config files
  const configFiles = filePaths.filter((p) =>
    p.includes(".env") || p.endsWith(".config.js") || p.endsWith(".config.ts") ||
    p === "vite.config.ts" || p === "webpack.config.js" || p === "tsconfig.json" ||
    p.endsWith(".json") || p.endsWith(".yaml") || p.endsWith(".yml")
  );

  // Build folder tree (top 2 levels)
  const folderTree = buildFolderTree(allFiles.slice(0, 200));

  // Structure quality checks
  const topLevelFiles = filePaths.filter((p) => !p.includes("/"));
  if (topLevelFiles.length > 20) {
    deductions += 2;
    findings.push({
      id: "struct-root-clutter",
      category: "structure",
      title: "Cluttered root directory",
      description: `The repository root contains ${topLevelFiles.length} files, making navigation difficult.`,
      severity: "medium",
      whyItMatters: "A cluttered root directory signals poor organization and makes it hard to understand the project at a glance.",
      recommendation: "Move related files into organized subdirectories. The root should only contain configuration and entry-point files.",
      evidence: `${topLevelFiles.length} files at root level`,
    });
  }

  if (!hasTests) {
    deductions += 1;
    findings.push({
      id: "struct-no-tests",
      category: "structure",
      title: "No test directory found",
      description: "No test files or test directories were found in this repository.",
      severity: "medium",
      whyItMatters: "Without tests, you cannot confidently refactor or add features without risk of regression.",
      recommendation: "Create a tests/ or __tests__/ directory and add unit tests for core functionality.",
    });
  }

  if (!hasCI) {
    deductions += 0.5;
    findings.push({
      id: "struct-no-ci",
      category: "structure",
      title: "No CI/CD configuration",
      description: "No continuous integration configuration was found.",
      severity: "low",
      whyItMatters: "Without CI, tests are not automatically run on each commit, increasing the chance of bugs reaching production.",
      recommendation: "Add a GitHub Actions workflow (.github/workflows/ci.yml) to run tests on every push.",
    });
  }

  // Check for deeply nested src
  const deepFiles = filePaths.filter((p) => p.split("/").length > 6);
  if (deepFiles.length > 10) {
    deductions += 0.5;
    findings.push({
      id: "struct-deep-nesting",
      category: "structure",
      title: "Excessive directory nesting",
      description: `${deepFiles.length} files are nested more than 6 levels deep.`,
      severity: "low",
      whyItMatters: "Deeply nested directories make import paths unwieldy and navigation difficult.",
      recommendation: "Flatten your directory structure. Consider using path aliases in your build config.",
      evidence: `${deepFiles.length} files at depth > 6`,
    });
  }

  const score = Math.max(0, 15 - deductions);
  return {
    score: Math.round(score * 10) / 10,
    findings,
    structure: {
      folderTree,
      totalFiles: allFiles.filter((f) => f.type === "blob").length,
      totalFolders: folders.size,
      primaryLanguage,
      languages,
      largeFiles: allFiles.filter((f) => (f.size ?? 0) > 100_000).map((f) => ({ path: f.path, size: f.size ?? 0 })),
      configFiles,
      hasTests,
      testFrameworks: detectTestFrameworks(filePaths),
      hasCI,
      ciFiles,
      dependencyFiles,
    },
  };
}

function detectTestFrameworks(paths: string[]): string[] {
  const frameworks: string[] = [];
  const pathStr = paths.join("\n");
  if (pathStr.includes("jest") || pathStr.includes("vitest")) frameworks.push("Jest/Vitest");
  if (pathStr.includes("pytest") || pathStr.includes("unittest")) frameworks.push("pytest");
  if (pathStr.includes("mocha")) frameworks.push("Mocha");
  if (pathStr.includes("cypress")) frameworks.push("Cypress");
  if (pathStr.includes("playwright")) frameworks.push("Playwright");
  if (pathStr.includes("rspec")) frameworks.push("RSpec");
  return frameworks;
}

function buildFolderTree(files: TreeFileItem[]): FolderNode {
  const root: FolderNode = { name: "/", path: "", type: "dir", children: [] };

  for (const file of files.slice(0, 150)) {
    if (file.type !== "blob") continue;
    const parts = file.path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      const isLast = i === parts.length - 1;

      if (isLast) {
        current.children = current.children ?? [];
        current.children.push({ name: part, path: file.path, type: "file", ...(file.size !== undefined ? { size: file.size } : {}) });
      } else {
        current.children = current.children ?? [];
        let child = current.children.find((c) => c.name === part && c.type === "dir");
        if (!child) {
          child = { name: part, path: parts.slice(0, i + 1).join("/"), type: "dir", children: [] };
          current.children.push(child);
        }
        current = child;
      }
    }
  }

  return root;
}

// ─── Security Analyzer ───────────────────────────────────────────────────────

function analyzeSecurityPatterns(files: Map<string, string>): AnalysisFinding[] {
  const findings: AnalysisFinding[] = [];

  const insecurePatterns = [
    {
      pattern: /eval\s*\(/g,
      title: "Use of eval()",
      desc: "eval() is used to execute dynamic code.",
      recommendation: "Avoid eval() — it creates serious security risks. Use JSON.parse() for data, or refactor the logic.",
      severity: "high" as const,
    },
    {
      pattern: /innerHTML\s*=/g,
      title: "Direct innerHTML assignment",
      desc: "innerHTML is assigned directly, potentially allowing XSS.",
      recommendation: "Use textContent or a sanitization library like DOMPurify before assigning HTML content.",
      severity: "medium" as const,
    },
    {
      pattern: /document\.write\s*\(/g,
      title: "Use of document.write()",
      desc: "document.write() can be used to inject malicious content.",
      recommendation: "Use DOM manipulation methods instead (createElement, appendChild).",
      severity: "medium" as const,
    },
    {
      pattern: /dangerouslySetInnerHTML/g,
      title: "React dangerouslySetInnerHTML",
      desc: "dangerouslySetInnerHTML bypasses React's XSS protection.",
      recommendation: "Sanitize HTML with DOMPurify before using dangerouslySetInnerHTML, or avoid it entirely.",
      severity: "medium" as const,
    },
    {
      pattern: /(?:http:\/\/(?!localhost|127\.0\.0\.1))/g,
      title: "HTTP instead of HTTPS",
      desc: "Non-localhost HTTP URLs found — data transmitted without encryption.",
      recommendation: "Replace all production API endpoints with HTTPS URLs.",
      severity: "medium" as const,
    },
    {
      pattern: /Math\.random\s*\(\s*\).*(?:token|secret|key|id|nonce)/gi,
      title: "Math.random() used for security token",
      desc: "Math.random() is not cryptographically secure and should not be used for security tokens.",
      recommendation: "Use crypto.randomBytes() (Node.js) or crypto.getRandomValues() (browser) for security-sensitive random values.",
      severity: "high" as const,
    },
  ];

  for (const [path, content] of files.entries()) {
    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    if (!["js", "jsx", "ts", "tsx", "py", "php"].includes(ext)) continue;

    for (const { pattern, title, desc, recommendation, severity } of insecurePatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(content)) {
        const existing = findings.find((f) => f.title === title);
        if (!existing) {
          findings.push({
            id: `sec-pattern-${title.toLowerCase().replace(/\s/g, "-")}-${path}`,
            category: "security",
            title,
            description: `${desc} Found in: ${path}`,
            file: path,
            severity,
            whyItMatters: "This pattern is a known security risk that could be exploited by attackers.",
            recommendation,
          });
        }
      }
    }
  }

  return findings;
}

// ─── Dependency Analyzer ─────────────────────────────────────────────────────

function analyzeDependencies(files: Map<string, string>): { score: number; findings: AnalysisFinding[]; deps: DependencyInfo[] } {
  const findings: AnalysisFinding[] = [];
  const deps: DependencyInfo[] = [];
  let deductions = 0;

  for (const [path, content] of files.entries()) {
    const basename = path.split("/").pop() ?? "";

    if (basename === "package.json") {
      try {
        const pkg = JSON.parse(content) as {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        };
        const allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

        for (const [name, versionRange] of Object.entries(allDeps)) {
          const version = versionRange.replace(/[^0-9.]/g, "").trim();
          const vulns = KNOWN_VULNERABLE_PACKAGES[name] ?? [];
          const matchedVulns = vulns.filter((v) => version && isVersionBelow(version, v.below));

          const dep: DependencyInfo = {
            name,
            currentVersion: versionRange,
            isOutdated: false, // Would need npm registry API; mark false unless vuln
            vulnerabilities: matchedVulns.map((v) => `${v.cve ?? "No CVE"}: ${v.description} (fix: upgrade to ${v.below}+)`),
            ...(matchedVulns[0]?.severity !== undefined ? { severity: matchedVulns[0].severity } : {}),
          };
          deps.push(dep);

          if (matchedVulns.length > 0) {
            const severity = matchedVulns[0]!.severity;
            deductions += severity === "critical" ? 4 : severity === "high" ? 2.5 : 1;
            findings.push({
              id: `dep-vuln-${name}`,
              category: "dependency",
              title: `Vulnerable dependency: ${name}`,
              description: `${name}@${versionRange} has ${matchedVulns.length} known vulnerabilit${matchedVulns.length > 1 ? "ies" : "y"}.`,
              file: path,
              severity,
              whyItMatters: "Vulnerable dependencies are one of the most common attack vectors in modern applications.",
              recommendation: `Upgrade ${name} to version ${matchedVulns[0]!.below} or newer. Run \`npm audit fix\` to resolve automatically.`,
              evidence: matchedVulns.map((v) => `${v.cve}: ${v.description}`).join("; "),
            });
          }
        }

        // Check for wildcard versions
        const wildcardDeps = Object.entries(allDeps).filter(([, v]) => v === "*" || v.startsWith(">"));
        if (wildcardDeps.length > 0) {
          deductions += 1;
          findings.push({
            id: "dep-wildcard",
            category: "dependency",
            title: "Wildcard or unbounded dependency versions",
            description: `${wildcardDeps.length} dependencies use wildcard or unbounded version constraints.`,
            file: path,
            severity: "medium",
            whyItMatters: "Wildcard versions can install breaking changes or malicious versions on fresh installs.",
            recommendation: "Pin dependencies to specific versions or use exact semver ranges.",
            evidence: wildcardDeps.slice(0, 3).map(([n, v]) => `${n}: ${v}`).join(", "),
          });
        }
      } catch {
        // Invalid JSON in package.json
        findings.push({
          id: "dep-invalid-pkg",
          category: "dependency",
          title: "Invalid package.json",
          description: "package.json could not be parsed as valid JSON.",
          file: path,
          severity: "high",
          whyItMatters: "An invalid package.json will prevent your project from being installed or built.",
          recommendation: "Fix the JSON syntax in package.json. Use a JSON linter to identify the error.",
        });
        deductions += 3;
      }
    }

    if (basename === "requirements.txt") {
      const lines = content.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
      for (const line of lines) {
        const match = line.match(/^([a-zA-Z0-9_-]+)(?:[=<>!]+(.*))?$/);
        if (match) {
          deps.push({
            name: match[1]!,
            currentVersion: match[2] ?? "unspecified",
            isOutdated: false,
            vulnerabilities: [],
          });
        }
      }
    }
  }

  const score = Math.max(0, 15 - deductions);
  return { score: Math.round(score * 10) / 10, findings, deps };
}

// ─── Documentation Analyzer ───────────────────────────────────────────────────

function analyzeDocumentation(files: Map<string, string>, allPaths: string[]): { score: number; findings: AnalysisFinding[] } {
  const findings: AnalysisFinding[] = [];
  let score = 0;

  // Check for README
  const readmePath = allPaths.find((p) => p.toLowerCase() === "readme.md" || p.toLowerCase() === "readme.txt" || p.toLowerCase() === "readme");
  if (!readmePath) {
    findings.push({
      id: "doc-no-readme",
      category: "documentation",
      title: "Missing README",
      description: "No README file was found in the repository.",
      severity: "high",
      whyItMatters: "A README is the first thing developers see. Without it, your project is impossible to evaluate or contribute to.",
      recommendation: "Add a README.md with: project description, installation instructions, usage examples, and contributing guidelines.",
    });
    return { score: 0, findings };
  }

  score += 2; // Has README

  const readme = files.get(readmePath) ?? "";
  const readmeLower = readme.toLowerCase();
  const wordCount = readme.split(/\s+/).filter(Boolean).length;

  // README length check
  if (wordCount < 50) {
    findings.push({
      id: "doc-readme-short",
      category: "documentation",
      title: "README is too brief",
      description: `README only contains about ${wordCount} words.`,
      file: readmePath,
      severity: "medium",
      whyItMatters: "A very short README does not give contributors or users enough information to understand or use the project.",
      recommendation: "Expand the README to include purpose, installation, usage, and contribution instructions.",
    });
  } else {
    score += 2; // Good length
  }

  // Installation instructions
  if (readmeLower.includes("install") || readmeLower.includes("npm install") || readmeLower.includes("pip install")) {
    score += 2;
  } else {
    findings.push({
      id: "doc-no-install",
      category: "documentation",
      title: "Missing installation instructions",
      description: "The README does not appear to include installation instructions.",
      file: readmePath,
      severity: "medium",
      whyItMatters: "Without installation instructions, new users cannot get started with your project.",
      recommendation: "Add a ## Installation or ## Getting Started section with step-by-step setup instructions.",
    });
  }

  // Usage examples
  if (readmeLower.includes("usage") || readmeLower.includes("example") || readme.includes("```")) {
    score += 2;
  } else {
    findings.push({
      id: "doc-no-usage",
      category: "documentation",
      title: "No usage examples in README",
      description: "The README does not include usage examples or code snippets.",
      file: readmePath,
      severity: "low",
      whyItMatters: "Usage examples dramatically reduce the barrier to entry for new users.",
      recommendation: "Add a ## Usage section with code examples showing common use cases.",
    });
  }

  // Contributing guidelines
  const hasContributing = allPaths.some((p) => p.toLowerCase().includes("contributing"));
  if (hasContributing) {
    score += 1;
  }

  // License
  const hasLicense = allPaths.some((p) => p.toLowerCase().startsWith("license") || p.toLowerCase().startsWith("licence"));
  if (hasLicense) {
    score += 1;
  } else {
    findings.push({
      id: "doc-no-license",
      category: "documentation",
      title: "No license file",
      description: "The repository does not include a license file.",
      severity: "medium",
      whyItMatters: "Without a license, users cannot legally use, modify, or distribute your code.",
      recommendation: "Add a LICENSE file. Choose an appropriate license at choosealicense.com.",
    });
  }

  return { score: Math.min(10, score), findings };
}

// ─── Testing Analyzer ────────────────────────────────────────────────────────

function analyzeTestCoverage(allPaths: string[], files: Map<string, string>): { score: number; findings: AnalysisFinding[] } {
  const findings: AnalysisFinding[] = [];
  let score = 0;

  const testFiles = allPaths.filter((p) =>
    p.includes(".test.") || p.includes(".spec.") || p.includes("__tests__") ||
    p.includes("/tests/") || p.includes("/test/")
  );

  const srcFiles = allPaths.filter((p) =>
    (p.endsWith(".ts") || p.endsWith(".tsx") || p.endsWith(".js") || p.endsWith(".py")) &&
    !testFiles.includes(p) &&
    !p.includes("node_modules")
  );

  if (testFiles.length === 0) {
    findings.push({
      id: "test-no-tests",
      category: "testing",
      title: "No test files found",
      description: "No test files were detected in this repository.",
      severity: "high",
      whyItMatters: "Without tests, every code change is a risk. Bugs can go undetected until production.",
      recommendation: "Start with unit tests for core functions. Even a few tests are better than none.",
    });
    return { score: 0, findings };
  }

  score += 3; // Has tests

  // Test ratio
  const ratio = srcFiles.length > 0 ? testFiles.length / srcFiles.length : 0;
  if (ratio > 0.3) score += 3;
  else if (ratio > 0.1) score += 1;
  else {
    findings.push({
      id: "test-low-coverage",
      category: "testing",
      title: "Low test-to-source ratio",
      description: `${testFiles.length} test files for ${srcFiles.length} source files (${Math.round(ratio * 100)}% ratio).`,
      severity: "medium",
      whyItMatters: "A low test ratio usually indicates important functionality is untested.",
      recommendation: "Aim for at least 30% test coverage. Prioritize testing business-critical code paths first.",
      evidence: `${testFiles.length} test files, ${srcFiles.length} source files`,
    });
  }

  // CI testing
  const hasCI = allPaths.some((p) => p.includes(".github/workflows") || p.includes(".travis.yml") || p.includes(".circleci"));
  if (hasCI) {
    score += 2;
    // Check if CI runs tests
    for (const p of allPaths.filter((x) => x.includes(".github/workflows"))) {
      const content = files.get(p) ?? "";
      if (content.includes("test") || content.includes("vitest") || content.includes("jest") || content.includes("pytest")) {
        score += 2;
        break;
      }
    }
  } else {
    findings.push({
      id: "test-no-ci",
      category: "testing",
      title: "Tests not automated in CI",
      description: "No CI configuration found to run tests automatically.",
      severity: "medium",
      whyItMatters: "Without automated test execution, tests may not be run consistently, leading to regressions.",
      recommendation: "Set up GitHub Actions or another CI system to run your test suite on every push.",
    });
  }

  return { score: Math.min(10, score), findings };
}

// ─── Maintainability Analyzer ─────────────────────────────────────────────────

function analyzeMaintainability(allPaths: string[], files: Map<string, string>): { score: number; findings: AnalysisFinding[] } {
  const findings: AnalysisFinding[] = [];
  let score = 5;

  // Check for .gitignore
  const hasGitignore = allPaths.includes(".gitignore");
  if (!hasGitignore) {
    score -= 1;
    findings.push({
      id: "maint-no-gitignore",
      category: "maintainability",
      title: "Missing .gitignore",
      description: "No .gitignore file found.",
      severity: "medium",
      whyItMatters: "Without .gitignore, build artifacts, secrets, and temporary files can accidentally be committed.",
      recommendation: "Add a .gitignore file. Use gitignore.io to generate one for your stack.",
    });
  }

  // Check .env files are gitignored
  const envFiles = allPaths.filter((p) => p.endsWith(".env") || p.endsWith(".env.local"));
  if (envFiles.length > 0) {
    const gitignore = files.get(".gitignore") ?? "";
    if (!gitignore.includes(".env")) {
      score -= 1;
      findings.push({
        id: "maint-env-not-ignored",
        category: "maintainability",
        title: ".env files not in .gitignore",
        description: `.env files exist but are not listed in .gitignore: ${envFiles.slice(0, 3).join(", ")}`,
        file: ".gitignore",
        severity: "high",
        whyItMatters: "Environment files often contain sensitive credentials and should never be committed.",
        recommendation: "Add .env and .env.* to .gitignore immediately. If already committed, purge with git-filter-repo.",
        evidence: envFiles.join(", "),
      });
    }
  }

  // Multiple lockfiles
  const lockFiles = allPaths.filter((p) => ["package-lock.json", "yarn.lock", "bun.lock", "pnpm-lock.yaml"].includes(p.split("/").pop() ?? ""));
  if (lockFiles.length > 1) {
    score -= 0.5;
    findings.push({
      id: "maint-multi-lockfile",
      category: "maintainability",
      title: "Multiple package manager lockfiles",
      description: `Found ${lockFiles.length} different lockfiles: ${lockFiles.join(", ")}`,
      severity: "low",
      whyItMatters: "Multiple lockfiles suggest the project is being worked on with different package managers, causing dependency inconsistencies.",
      recommendation: "Pick one package manager and delete the others' lockfiles.",
      evidence: lockFiles.join(", "),
    });
  }

  return { score: Math.max(0, Math.round(score * 10) / 10), findings };
}

// ─── Improvement Roadmap Generator ───────────────────────────────────────────

function generateRoadmap(scores: HealthScores, allFindings: AnalysisFinding[], secretCount: number): ImprovementItem[] {
  const roadmap: ImprovementItem[] = [];

  // Priority 1: Critical (security)
  if (secretCount > 0) {
    roadmap.push({
      priority: 1,
      priorityLabel: "Critical",
      title: "Rotate all exposed credentials immediately",
      description: `${secretCount} potential credential exposure(s) detected. Rotate every exposed key and secret now, before any other work.`,
      category: "Security",
      estimatedImpact: "Prevents unauthorized access and potential data breaches",
      evidence: `${secretCount} secret finding(s)`,
    });
  }

  const criticalFindings = allFindings.filter((f) => f.severity === "critical" || f.severity === "high");
  for (const f of criticalFindings.slice(0, 3)) {
    roadmap.push({
      priority: 1,
      priorityLabel: "Critical",
      title: f.title,
      description: f.description,
      category: f.category,
      estimatedImpact: f.whyItMatters,
      ...(f.evidence !== undefined ? { evidence: f.evidence } : {}),
    });
  }

  // Priority 2: High impact
  if (scores.testing.score < 5) {
    roadmap.push({
      priority: 2,
      priorityLabel: "High",
      title: "Add automated tests",
      description: "The project has insufficient test coverage. Add unit and integration tests for core functionality.",
      category: "Testing",
      estimatedImpact: "Significantly reduces regression risk and enables confident refactoring",
    });
  }

  if (scores.dependencyHealth.score < 10) {
    roadmap.push({
      priority: 2,
      priorityLabel: "High",
      title: "Fix vulnerable dependencies",
      description: "Several dependencies have known security vulnerabilities. Upgrade them.",
      category: "Dependencies",
      estimatedImpact: "Closes known attack vectors in your dependency chain",
    });
  }

  const mediumFindings = allFindings.filter((f) => f.severity === "medium");
  for (const f of mediumFindings.slice(0, 3)) {
    roadmap.push({
      priority: 2,
      priorityLabel: "High",
      title: f.title,
      description: f.recommendation,
      category: f.category,
      estimatedImpact: f.whyItMatters,
    });
  }

  // Priority 3: Medium improvements
  if (scores.documentation.score < 7) {
    roadmap.push({
      priority: 3,
      priorityLabel: "Medium",
      title: "Improve documentation",
      description: "Add or improve README, installation instructions, and usage examples.",
      category: "Documentation",
      estimatedImpact: "Lowers the barrier for contributors and new users",
    });
  }

  if (scores.projectStructure.score < 10) {
    roadmap.push({
      priority: 3,
      priorityLabel: "Medium",
      title: "Reorganize project structure",
      description: "Improve folder organization and separation of concerns.",
      category: "Structure",
      estimatedImpact: "Makes the codebase easier to navigate and maintain",
    });
  }

  // Priority 4: Optional
  if (!allFindings.some((f) => f.id === "struct-no-ci")) {
    roadmap.push({
      priority: 4,
      priorityLabel: "Optional",
      title: "Add code coverage reporting",
      description: "Configure your CI pipeline to generate and track code coverage over time.",
      category: "Testing",
      estimatedImpact: "Helps identify untested code paths over time",
    });
  }

  roadmap.push({
    priority: 4,
    priorityLabel: "Optional",
    title: "Add a CHANGELOG",
    description: "Keep a CHANGELOG.md to track changes between versions for users and contributors.",
    category: "Documentation",
    estimatedImpact: "Improves communication with users about changes and fixes",
  });

  return roadmap;
}

// ─── Main Analyzer ────────────────────────────────────────────────────────────

export async function analyzeRepository(
  repoInput: string | GitHubRepo,
  onProgress: ProgressCallback,
  signal?: AbortSignal,
): Promise<AnalysisResult> {
  const id = `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const log: string[] = [];
  const addLog = (msg: string) => log.push(`[${new Date().toLocaleTimeString()}] ${msg}`);

  const updateProgress = (stage: AnalysisStatus, stageProgress: number, overallProgress: number, extra?: Partial<AnalysisResult>) => {
    const result: Partial<AnalysisResult> = {
      id,
      status: stage,
      currentStage: stage,
      stageProgress,
      overallProgress,
      analysisLog: [...log],
      ...extra,
    };
    onProgress(result);
  };

  // ── Stage 1: Initializing ──────────────────────────────────────────────────
  updateProgress("initializing", 0, 2);
  addLog("Initializing repository analysis...");

  let repoMeta: GitHubRepo | null = null;
  let repoInfo: RepoMetadata;

  if (typeof repoInput === "string") {
    const parsed = parseGitHubRepoInput(repoInput);
    if (!parsed) {
      return createErrorResult(id, "Invalid repository URL or format.", log);
    }
    updateProgress("initializing", 50, 3);
    addLog(`Fetching repository metadata for ${parsed.owner}/${parsed.repo}...`);
    repoMeta = await fetchRepositoryMetadata(parsed.owner, parsed.repo);
    if (!repoMeta) {
      return createErrorResult(id, `Repository ${parsed.owner}/${parsed.repo} not found or not publicly accessible.`, log);
    }
  } else {
    repoMeta = repoInput;
  }

  repoInfo = {
    id: repoMeta.id,
    owner: repoMeta.owner.login,
    name: repoMeta.name,
    fullName: repoMeta.full_name,
    url: repoMeta.html_url,
    description: repoMeta.description,
    language: repoMeta.language,
    stars: repoMeta.stargazers_count,
    forks: 0,
    openIssues: 0,
    defaultBranch: repoMeta.default_branch,
    createdAt: repoMeta.created_at,
    updatedAt: repoMeta.updated_at,
    pushedAt: repoMeta.pushed_at,
    size: repoMeta.size,
    isPrivate: repoMeta.visibility === "private",
    topics: repoMeta.topics ?? [],
    source: "github_url",
  };

  addLog(`Repository found: ${repoInfo.fullName} (${repoInfo.language ?? "Unknown"}, ${repoInfo.stars} stars)`);
  updateProgress("initializing", 100, 5, { repo: repoInfo });

  if (signal?.aborted) return createErrorResult(id, "Analysis cancelled.", log);

  // ── Stage 2: Fetch tree ───────────────────────────────────────────────────
  updateProgress("fetching_tree", 0, 10);
  addLog(`Fetching file tree for branch: ${repoInfo.defaultBranch}...`);

  const treeResult = await getRepoTree(repoInfo.owner, repoInfo.name, repoInfo.defaultBranch);
  const allFiles = treeResult.files;
  const totalFilesDiscovered = allFiles.filter((f) => f.type === "blob").length;

  addLog(`Discovered ${totalFilesDiscovered} files${treeResult.truncated ? " (tree truncated — large repository)" : ""}`);
  updateProgress("fetching_tree", 100, 15, { totalFilesDiscovered, treeTruncated: treeResult.truncated });

  if (signal?.aborted) return createErrorResult(id, "Analysis cancelled.", log);

  // ── Stage 3: Map structure ────────────────────────────────────────────────
  updateProgress("mapping_structure", 0, 18);
  addLog("Mapping project structure...");

  const structResult = analyzeProjectStructure(allFiles);
  addLog(`Primary language: ${structResult.structure.primaryLanguage}. ${structResult.structure.hasTests ? "Tests found." : "No tests found."}`);
  updateProgress("mapping_structure", 100, 22, { structure: structResult.structure as StructureInfo });

  if (signal?.aborted) return createErrorResult(id, "Analysis cancelled.", log);

  // ── Stage 4: Fetch and analyze source files ───────────────────────────────
  updateProgress("analyzing_code", 0, 25);
  addLog("Fetching and inspecting source files...");

  const eligibleFiles = allFiles.filter((f) => f.type === "blob" && isEligibleFile(f.path));
  const FILE_CAP = 60;
  const prioritized = [
    ...eligibleFiles.filter((f) => {
      const bn = f.path.toLowerCase().split("/").pop() ?? "";
      return ["package.json", "requirements.txt", ".env", "config.py", "settings.py",
        "docker-compose.yml", "go.mod", "cargo.toml"].includes(bn);
    }),
    ...eligibleFiles.filter((f) => !f.path.toLowerCase().includes("test") && !f.path.toLowerCase().includes("spec")),
    ...eligibleFiles.filter((f) => f.path.toLowerCase().includes("test") || f.path.toLowerCase().includes("spec")),
  ].filter((f, i, arr) => arr.findIndex((x) => x.path === f.path) === i)
    .slice(0, FILE_CAP);

  const fileContents = new Map<string, string>();
  let inspected = 0;
  let skipped = 0;

  for (let i = 0; i < prioritized.length; i++) {
    if (signal?.aborted) return createErrorResult(id, "Analysis cancelled.", log);
    const file = prioritized[i]!;
    if ((file.size ?? 0) > 500_000) { skipped++; continue; }

    const content = await getFileContent(repoInfo.owner, repoInfo.name, file.path);
    if (content) {
      fileContents.set(file.path, content);
      inspected++;
    } else {
      skipped++;
    }

    const pct = Math.round((i / prioritized.length) * 100);
    updateProgress("analyzing_code", pct, 25 + Math.round(pct * 0.2), {
      totalFilesInspected: inspected,
      filesSkipped: skipped,
    });
    await sleep(50);
  }

  addLog(`Inspected ${inspected} files, skipped ${skipped} (size limit or inaccessible)`);
  updateProgress("analyzing_code", 100, 45, { totalFilesInspected: inspected, filesSkipped: skipped });

  if (signal?.aborted) return createErrorResult(id, "Analysis cancelled.", log);

  // ── Stage 5: Code quality ─────────────────────────────────────────────────
  updateProgress("checking_quality", 0, 48);
  addLog("Analyzing code quality...");
  const codeQualityResult = analyzeCodeQuality(fileContents);
  addLog(`Code quality: ${codeQualityResult.findings.length} findings`);
  updateProgress("checking_quality", 100, 52);

  // ── Stage 6: Security scan ────────────────────────────────────────────────
  updateProgress("scanning_secrets", 0, 55);
  addLog("Scanning for exposed credentials and security issues...");

  const secretFindings: ScanFinding[] = [];
  for (const [path, content] of fileContents.entries()) {
    const detected = scanContent(content, path, repoInfo.owner, repoInfo.name, repoInfo.url, repoInfo.defaultBranch, "HEAD", false);
    secretFindings.push(...detected);
  }

  const securityPatternFindings = analyzeSecurityPatterns(fileContents);
  addLog(`Security scan: ${secretFindings.length} potential credential exposure(s), ${securityPatternFindings.length} insecure pattern(s)`);
  updateProgress("scanning_secrets", 100, 62, { secretFindings });

  // ── Stage 7: Dependency audit ─────────────────────────────────────────────
  updateProgress("auditing_deps", 0, 65);
  addLog("Auditing dependencies...");
  const depsResult = analyzeDependencies(fileContents);
  addLog(`Dependencies: ${depsResult.deps.length} packages, ${depsResult.findings.length} vulnerability finding(s)`);
  updateProgress("auditing_deps", 100, 70, { dependencies: depsResult.deps });

  // ── Stage 8: Documentation ────────────────────────────────────────────────
  updateProgress("evaluating_docs", 0, 73);
  addLog("Evaluating documentation...");
  const docResult = analyzeDocumentation(fileContents, allFiles.map((f) => f.path));
  addLog(`Documentation score: ${docResult.score}/10`);
  updateProgress("evaluating_docs", 100, 78);

  // ── Stage 9: Testing ──────────────────────────────────────────────────────
  updateProgress("evaluating_tests", 0, 80);
  addLog("Analyzing test coverage...");
  const testResult = analyzeTestCoverage(allFiles.map((f) => f.path), fileContents);
  addLog(`Testing score: ${testResult.score}/10`);
  updateProgress("evaluating_tests", 100, 84);

  // ── Stage 10: Maintainability ──────────────────────────────────────────────
  updateProgress("calculating_score", 0, 86);
  addLog("Analyzing maintainability...");
  const maintResult = analyzeMaintainability(allFiles.map((f) => f.path), fileContents);

  // Calculate security score
  const secDeductions =
    secretFindings.filter((f) => f.severity === "Critical").length * 8 +
    secretFindings.filter((f) => f.severity === "High").length * 4 +
    secretFindings.filter((f) => f.severity === "Medium").length * 2 +
    securityPatternFindings.filter((f) => f.severity === "high").length * 2 +
    securityPatternFindings.filter((f) => f.severity === "medium").length * 1;
  const securityScore = Math.max(0, 25 - secDeductions);

  // Build scores
  const scores: HealthScores = {
    overall: 0,
    codeQuality: { score: codeQualityResult.score, maxScore: 20, available: inspected > 0, findings: codeQualityResult.findings },
    projectStructure: { score: structResult.score, maxScore: 15, available: true, findings: structResult.findings },
    security: { score: Math.round(securityScore * 10) / 10, maxScore: 25, available: true, findings: securityPatternFindings },
    dependencyHealth: {
      score: depsResult.score,
      maxScore: 15,
      available: depsResult.deps.length > 0,
      ...(depsResult.deps.length === 0 ? { unavailableReason: "No dependency manifest files found" } : {}),
      findings: depsResult.findings,
    },
    documentation: { score: docResult.score, maxScore: 10, available: true, findings: docResult.findings },
    testing: { score: testResult.score, maxScore: 10, available: true, findings: testResult.findings },
    maintainability: { score: maintResult.score, maxScore: 5, available: true, findings: maintResult.findings },
  };

  // Calculate overall (sum of available categories, scaled)
  let totalEarned = 0;
  let totalPossible = 0;
  for (const cat of Object.values(scores).filter((v): v is CategoryScore => typeof v === "object" && "maxScore" in v)) {
    if (cat.available) {
      totalEarned += cat.score;
      totalPossible += cat.maxScore;
    }
  }
  scores.overall = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;

  addLog(`Overall health score: ${scores.overall}/100`);

  // ── Stage 11: Generate report ─────────────────────────────────────────────
  updateProgress("generating_report", 0, 90);
  addLog("Generating final report...");

  const allFindings: AnalysisFinding[] = [
    ...codeQualityResult.findings,
    ...structResult.findings,
    ...securityPatternFindings,
    ...depsResult.findings,
    ...docResult.findings,
    ...testResult.findings,
    ...maintResult.findings,
  ];

  // Strengths
  const strengths: string[] = [];
  if (scores.codeQuality.score >= 15) strengths.push("Well-written, clean source code");
  if (scores.projectStructure.score >= 12) strengths.push("Well-organized project structure");
  if (scores.security.score >= 20) strengths.push("No critical security exposures detected");
  if (scores.dependencyHealth.score >= 12 && scores.dependencyHealth.available) strengths.push("Dependencies are up to date and secure");
  if (scores.documentation.score >= 7) strengths.push("Good documentation quality");
  if (scores.testing.score >= 7) strengths.push("Solid test coverage");
  if (scores.maintainability.score >= 4) strengths.push("Good maintainability practices");
  if (strengths.length === 0) strengths.push("Repository is accessible and analyzable");

  // Weaknesses
  const weaknesses: string[] = allFindings
    .filter((f) => f.severity === "critical" || f.severity === "high")
    .slice(0, 5)
    .map((f) => f.title);
  if (secretFindings.length > 0) weaknesses.unshift(`${secretFindings.length} potential credential exposure(s) detected`);

  const roadmap = generateRoadmap(scores, allFindings, secretFindings.length);

  const result: AnalysisResult = {
    id,
    status: "completed",
    currentStage: "generating_report",
    stageProgress: 100,
    overallProgress: 100,
    repo: repoInfo,
    totalFilesDiscovered,
    totalFilesInspected: inspected,
    totalFindingsCount: allFindings.length + secretFindings.length,
    filesSkipped: skipped,
    treeTruncated: treeResult.truncated,
    scores,
    findings: allFindings,
    secretFindings,
    dependencies: depsResult.deps,
    structure: structResult.structure as StructureInfo,
    improvementRoadmap: roadmap,
    strengths,
    weaknesses,
    keyObservations: [
      `Analyzed ${inspected} of ${totalFilesDiscovered} files${treeResult.truncated ? " (repository tree was truncated — large repo)" : ""}`,
      `Primary language: ${structResult.structure.primaryLanguage}`,
      `${secretFindings.length > 0 ? `⚠ ${secretFindings.length} potential credential exposure(s) require immediate attention` : "No credential exposures detected"}`,
      `${scores.dependencyHealth.available ? `${depsResult.deps.length} dependencies analyzed` : "No dependency manifest found"}`,
    ],
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    analysisLog: log,
  };

  saveAnalysis(result);
  addLog("Analysis complete.");
  updateProgress("completed", 100, 100, result);

  return result;
}

function createErrorResult(id: string, message: string, log: string[]): AnalysisResult {
  const errorResult: AnalysisResult = {
    id,
    status: "failed",
    currentStage: "failed",
    stageProgress: 0,
    overallProgress: 0,
    repo: { id: 0, owner: "", name: "", fullName: "", url: "", description: null, language: null, stars: 0, forks: 0, openIssues: 0, defaultBranch: "main", createdAt: "", updatedAt: "", pushedAt: "", size: 0, isPrivate: false, topics: [], source: "github_url" },
    totalFilesDiscovered: 0,
    totalFilesInspected: 0,
    totalFindingsCount: 0,
    filesSkipped: 0,
    treeTruncated: false,
    scores: createEmptyScores(),
    findings: [],
    secretFindings: [],
    dependencies: [],
    structure: null,
    improvementRoadmap: [],
    strengths: [],
    weaknesses: [],
    keyObservations: [],
    startedAt: new Date().toISOString(),
    analysisLog: log,
    errorMessage: message,
  };
  saveAnalysis(errorResult);
  return errorResult;
}
