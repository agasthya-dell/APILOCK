import { describe, expect, it } from "vitest";
import {
  calculateShannonEntropy,
  isPlaceholderOrExample,
  isPublicFrontendConfig,
  scanContent,
} from "../lib/secret-patterns";
import {
  isEligibleFile,
  parseGitHubRepoInput,
} from "../lib/github-api";
import {
  defaultMetrics,
  recomputeMetrics,
  toTrackedRepo,
  type AgentState,
} from "../lib/agent-store";

describe("APILOCK High-Value Secret Detection Engine", () => {
  const dummyRepo = {
    owner: "example-org",
    name: "ai-backend",
    url: "https://github.com/example-org/ai-backend",
    branch: "main",
    commit: "a1b2c3d",
  };

  // 1. OpenAI Detection
  it("detects OpenAI project and legacy keys with zero raw value storage", () => {
    // Deliberately generated synthetic test key (not real)
    const testContent = `
      # Configuration
      OPENAI_API_KEY = "sk-proj-9999888877776666555544443333222211110000aAbBcCdDeEfFgG"
    `;

    const findings = scanContent(
      testContent,
      "config/ai.py",
      dummyRepo.owner,
      dummyRepo.name,
      dummyRepo.url,
      dummyRepo.branch,
      dummyRepo.commit,
      false,
    );

    expect(findings.length).toBe(1);
    expect(findings[0]?.provider).toBe("OpenAI");
    expect(findings[0]?.severity).toBe("Critical");
    expect(findings[0]?.historicalOrCurrent).toBe("Current");
    // Verify zero raw credential retention
    expect(findings[0]?.redactedEvidence).toContain("••••••••");
    expect(findings[0]?.redactedEvidence).not.toContain("99998888777766665555444433332222");
  });

  // 2. Anthropic Detection
  it("detects Anthropic Claude keys", () => {
    // Synthetic test token (75 chars after prefix)
    const testContent = `
      anthropic_key = "sk-ant-api03-ab83Kls921Kjd982KmsaL92kP01mZ83bQ71nV54cX62jR99tY31wM45eN78uK12vB90aC34dE56f"
    `;

    const findings = scanContent(
      testContent,
      "server/claude.ts",
      dummyRepo.owner,
      dummyRepo.name,
      dummyRepo.url,
      dummyRepo.branch,
      dummyRepo.commit,
      false,
    );

    expect(findings.length).toBe(1);
    expect(findings[0]?.provider).toBe("Anthropic");
    expect(findings[0]?.severity).toBe("Critical");
    expect(findings[0]?.redactedEvidence).toContain("ANTHROPIC_API_KEY");
  });

  // 3. Gemini Detection
  it("detects Google Gemini / AI Studio keys", () => {
    // Synthetic test key (AIzaSy + exactly 33 chars)
    const testContent = `
      const GEMINI_API_KEY = "AIzaSyBv9xK3mP8rT1wZ7qN4yL6jH0cD2fG5sA9";
    `;

    const findings = scanContent(
      testContent,
      "src/gemini.ts",
      dummyRepo.owner,
      dummyRepo.name,
      dummyRepo.url,
      dummyRepo.branch,
      dummyRepo.commit,
      false,
    );

    expect(findings.length).toBe(1);
    expect(findings[0]?.provider).toBe("Google");
    expect(findings[0]?.category).toBe("ai");
  });

  // 4. AWS Detection
  it("detects AWS Access Keys and Secret Access Keys", () => {
    // Synthetic test keys (avoiding literal word "EXAMPLE" and placeholder "abcdef")
    const testContent = `
      AWS_ACCESS_KEY_ID = "AKIAT4Z8M2K9P1R7V3X5"
      aws_secret_access_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCY9876543210"
    `;

    const findings = scanContent(
      testContent,
      "deploy/terraform.tf",
      dummyRepo.owner,
      dummyRepo.name,
      dummyRepo.url,
      dummyRepo.branch,
      dummyRepo.commit,
      false,
    );

    expect(findings.length).toBe(2);
    expect(findings.some((f) => f.secretType.includes("Access Key ID"))).toBe(true);
    expect(findings.some((f) => f.secretType.includes("Secret Access Key"))).toBe(true);
  });

  // 5. Stripe Detection
  it("detects live Stripe secret keys and restricted keys", () => {
    // Synthetic test keys constructed dynamically to avoid GitHub push protection false-positives
    const fakeStripeKey = ["sk", "live", "51Msz82KlmA9f83Kls921Kjd982Kmsa"].join("_");
    const fakeRestrictedKey = ["rk", "live", "998877665544332211aabbcc"].join("_");
    const testContent = `
      STRIPE_SECRET_KEY = "${fakeStripeKey}"
      RESTRICTED = "${fakeRestrictedKey}"
    `;

    const findings = scanContent(
      testContent,
      "backend/billing.py",
      dummyRepo.owner,
      dummyRepo.name,
      dummyRepo.url,
      dummyRepo.branch,
      dummyRepo.commit,
      false,
    );

    expect(findings.length).toBe(2);
    expect(findings.every((f) => f.provider === "Stripe")).toBe(true);
  });

  // 6. Public Frontend Key Exclusion (Section 5)
  it("strictly excludes public frontend configs, Supabase anon keys, and publishable tokens", () => {
    const safeContent = `
      // Safe public configuration
      const stripePublishable = "pk_live_51Msz82KlmA9f83Kls921Kjd982Kmsa";
      const testPublishable = "pk_test_TYooMQauvdEDq54NiTphI7jx";
      const supabaseAnon = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon_key";
      const firebaseConfig = {
        apiKey: "AIzaSyD9876543210ZYXWVUTSRQPONMLKJIH",
        authDomain: "my-app.firebaseapp.com",
        projectId: "my-app-12345"
      };
      const googleOAuthClientId = "123456789-abcdefgh.apps.googleusercontent.com";
      const mixpanelToken = mixpanel.init("abc123456789");
    `;

    expect(isPublicFrontendConfig('const stripePublishable = "pk_live_51Msz82KlmA9f83Kls";')).toBe(true);
    expect(isPublicFrontendConfig('const supabaseAnon = "anon_key_12345";')).toBe(true);
    expect(isPublicFrontendConfig('apiKey: "AIzaSy", authDomain: "firebase"')).toBe(true);
    expect(isPublicFrontendConfig('client_id: "xyz.apps.googleusercontent.com"')).toBe(true);

    const findings = scanContent(
      safeContent,
      "src/client.ts",
      dummyRepo.owner,
      dummyRepo.name,
      dummyRepo.url,
      dummyRepo.branch,
      dummyRepo.commit,
      false,
    );

    // None of these public tokens should be flagged as secret exposures
    expect(findings.length).toBe(0);
  });

  // 7. Placeholder and Example Exclusion
  it("excludes documentation placeholders, test dummy strings, and process.env lookups", () => {
    const placeholderContent = `
      OPENAI_API_KEY = "sk-proj-your_api_key_here_placeholder_example"
      OPENAI_KEY = process.env.OPENAI_API_KEY
      const key = "sk-proj-000000000000000000000000000000000000000000000000"
      ANTHROPIC_KEY = "sk-ant-api03-insert_here_sample_test_key_placeholder"
    `;

    expect(isPlaceholderOrExample("OPENAI_KEY = process.env.KEY", "sk-123")).toBe(true);
    expect(isPlaceholderOrExample("key = 'your_api_key'", "your_api_key")).toBe(true);

    const findings = scanContent(
      placeholderContent,
      "docs/readme.py",
      dummyRepo.owner,
      dummyRepo.name,
      dummyRepo.url,
      dummyRepo.branch,
      dummyRepo.commit,
      false,
    );

    expect(findings.length).toBe(0);
  });

  // 8. Historical Exposure vs Current Exposure Classification (Section 7)
  it("classifies findings correctly as Historical vs Current", () => {
    const fakeStripe = ["sk", "live", "51Msz82KlmA9f83Kls921Kjd982Kmsa"].join("_");
    const leakContent = `
      STRIPE_SECRET_KEY = "${fakeStripe}"
    `;

    const currentFindings = scanContent(
      leakContent,
      "billing.py",
      dummyRepo.owner,
      dummyRepo.name,
      dummyRepo.url,
      dummyRepo.branch,
      dummyRepo.commit,
      false, // Current
    );
    expect(currentFindings[0]?.historicalOrCurrent).toBe("Current");
    expect(currentFindings[0]?.classification).toBe("High-confidence detection");

    const historicalFindings = scanContent(
      leakContent,
      "billing.py",
      dummyRepo.owner,
      dummyRepo.name,
      dummyRepo.url,
      dummyRepo.branch,
      dummyRepo.commit,
      true, // Historical
    );
    expect(historicalFindings[0]?.historicalOrCurrent).toBe("Historical");
    expect(historicalFindings[0]?.classification).toBe("Historical exposure");
  });

  // 9. Non-Reversible Fingerprint & Duplicate Prevention (Section 6)
  it("generates deterministic non-reversible fingerprints and prevents duplicates", () => {
    const fakeKey = ["sk", "live", "51Msz82KlmA9f83Kls921Kjd982Kmsa"].join("_");
    const content = `STRIPE_SECRET_KEY = "${fakeKey}"`;

    const sweep1 = scanContent(
      content,
      "billing.py",
      dummyRepo.owner,
      dummyRepo.name,
      dummyRepo.url,
      dummyRepo.branch,
      dummyRepo.commit,
    );
    const sweep2 = scanContent(
      content,
      "billing.py",
      dummyRepo.owner,
      dummyRepo.name,
      dummyRepo.url,
      dummyRepo.branch,
      dummyRepo.commit,
    );

    expect(sweep1[0]?.fingerprint).toBeDefined();
    expect(sweep1[0]?.fingerprint).toBe(sweep2[0]?.fingerprint);
  });

  // 10. Direct File URL linking to GitHub at exact line number (Section 8)
  it("creates direct GitHub file links pointing to the exact line number", () => {
    const content = `\n\n\nOPENAI_API_KEY = "sk-proj-9999888877776666555544443333222211110000aAbBcCdDeEfFgG"`;

    const findings = scanContent(
      content,
      "src/service/api.py",
      dummyRepo.owner,
      dummyRepo.name,
      dummyRepo.url,
      dummyRepo.branch,
      dummyRepo.commit,
    );

    expect(findings[0]?.line).toBe(4);
    expect(findings[0]?.fileUrl).toBe("https://github.com/example-org/ai-backend/blob/main/src/service/api.py#L4");
  });

  // 11. Parse Arbitrary Public GitHub Repository Input (Section 1 Example)
  it("parses diverse GitHub repository URLs and identifiers including tempoxyz/tempo", () => {
    expect(parseGitHubRepoInput("https://github.com/tempoxyz/tempo")).toEqual({
      owner: "tempoxyz",
      repo: "tempo",
    });
    expect(parseGitHubRepoInput("https://github.com/tempoxyz/tempo.git")).toEqual({
      owner: "tempoxyz",
      repo: "tempo",
    });
    expect(parseGitHubRepoInput("github.com/tempoxyz/tempo/")).toEqual({
      owner: "tempoxyz",
      repo: "tempo",
    });
    expect(parseGitHubRepoInput("tempoxyz/tempo")).toEqual({
      owner: "tempoxyz",
      repo: "tempo",
    });
    expect(parseGitHubRepoInput("invalid-format")).toBeNull();
  });

  // 12. Eligible File Classification (Section 3E)
  it("classifies eligible source and configuration files while rejecting binaries and build directories", () => {
    expect(isEligibleFile("backend/config.py")).toBe(true);
    expect(isEligibleFile("src/services/api.ts")).toBe(true);
    expect(isEligibleFile("docker-compose.yml")).toBe(true);
    expect(isEligibleFile(".env.production")).toBe(true);
    expect(isEligibleFile("infra/main.tf")).toBe(true);
    expect(isEligibleFile("Dockerfile")).toBe(true);
    expect(isEligibleFile("app/models.java")).toBe(true);

    // Disqualified
    expect(isEligibleFile("assets/logo.png")).toBe(false);
    expect(isEligibleFile("node_modules/package/index.js")).toBe(false);
    expect(isEligibleFile("dist/bundle.min.js")).toBe(false);
    expect(isEligibleFile("build/output.map")).toBe(false);
  });

  // 13. Telemetry & Metrics Isolation (Section 11)
  it("keeps discovered, fully scanned, and partially scanned repository counts strictly separated", () => {
    const rawRepo1 = {
      id: 1,
      name: "repo-1",
      full_name: "org/repo-1",
      owner: { login: "org", avatar_url: "" },
      html_url: "https://github.com/org/repo-1",
      description: null,
      language: "Python",
      stargazers_count: 50,
      default_branch: "main",
      created_at: "",
      updated_at: "",
      pushed_at: "",
      size: 100,
      topics: [],
      visibility: "public" as const,
    };

    const tracked1 = toTrackedRepo(rawRepo1, true);
    tracked1.status = "Completed"; // Fully scanned

    const tracked2 = toTrackedRepo({ ...rawRepo1, id: 2, name: "repo-2" }, true);
    tracked2.status = "Partially Scanned"; // Partial scan

    const tracked3 = toTrackedRepo({ ...rawRepo1, id: 3, name: "repo-3" }, false);
    tracked3.status = "Discovered"; // Discovered only

    const testState: AgentState = {
      repos: [tracked1, tracked2, tracked3],
      findings: [],
      metrics: defaultMetrics(),
      checkpoint: { queryIndex: 0, page: 1, cycleCount: 1, lastDiscoveredAt: null },
    };

    const metrics = recomputeMetrics(testState);
    expect(metrics.totalDiscovered).toBe(3);
    expect(metrics.totalFullyScanned).toBe(1);
    expect(metrics.totalPartiallyScanned).toBe(1);
    expect(metrics.totalInspected).toBe(2);
    // Never mix discovered with fully scanned
    expect(metrics.totalFullyScanned).not.toBe(metrics.totalDiscovered);
  });

  // 14. Shannon Entropy
  it("calculates Shannon entropy accurately to distinguish high-entropy secrets from low-entropy strings", () => {
    const lowEntropy = "aaaaaaaaaaaaaaaaaaaa";
    const mediumEntropy = "hello_world_variable_name";
    const highEntropy = "sk-proj-4k8H9zL1mN3pQ6rT8vX0wY2bA5cD7eF";

    const eLow = calculateShannonEntropy(lowEntropy);
    const eMed = calculateShannonEntropy(mediumEntropy);
    const eHigh = calculateShannonEntropy(highEntropy);

    expect(eLow).toBeLessThan(1.0);
    expect(eMed).toBeLessThan(eHigh);
    expect(eHigh).toBeGreaterThan(4.0);
  });
});
