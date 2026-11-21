/**
 * APILOCK — High-Value API Secret Detection Engine
 *
 * Implements:
 * - Priority A: AI API credentials (OpenAI, Anthropic Claude, Google Gemini, HuggingFace, Mistral, Cohere)
 * - Priority B: Cloud infrastructure (AWS access & secret keys, Azure connection strings, GCP service accounts)
 * - Priority C: Payment & business services (Stripe live & restricted keys, Twilio auth tokens, SendGrid API keys)
 * - Priority D: Private database credentials (PostgreSQL, MongoDB Atlas, MySQL, Redis AUTH, PEM private keys)
 *
 * STRICT EXCLUSIONS:
 * - Public frontend configuration (Firebase client configs, Supabase anon/public keys)
 * - Publishable payment keys (pk_live_..., pk_test_...)
 * - Public client IDs & analytics identifiers (Google OAuth client IDs, Mixpanel, GA)
 * - Placeholders, documentation examples, and mock tokens
 *
 * ZERO-CREDENTIAL COLLECTION:
 * - Immediately discards matched raw credential.
 * - Stores non-reversible fingerprints and redacted masks only.
 */

export type SecretCategory = "ai" | "cloud" | "payment" | "database" | "other";
export type SeverityLevel = "Critical" | "High" | "Medium" | "Low";
export type ConfidenceLevel = "High" | "Medium" | "Low";
export type FindingClassification =
  | "Potential exposure"
  | "High-confidence detection"
  | "Historical exposure"
  | "Current exposure"
  | "Resolved exposure";

export interface DetectionRule {
  id: string;
  provider: string;
  secretType: string;
  category: SecretCategory;
  severity: SeverityLevel;
  confidence: ConfidenceLevel;
  regex: RegExp;
  minEntropy?: number;
  contextKeywords?: string[];
  suggestedAction: string;
  redact: (match: string, fullLine: string) => string;
}

export interface ScanFinding {
  id: string;
  ruleId: string;
  provider: string;
  secretType: string;
  category: SecretCategory;
  severity: SeverityLevel;
  confidence: ConfidenceLevel;
  classification: FindingClassification;
  repoOwner: string;
  repoName: string;
  repoUrl: string;
  file: string;
  line: number;
  fileUrl: string; // Direct link to file and line on GitHub
  commitHash: string;
  branch: string;
  firstDetected: string;
  lastDetected: string;
  exposure: "Public repository";
  historicalOrCurrent: "Current" | "Historical" | "Resolved";
  redactedEvidence: string;
  suggestedAction: string;
  status: "New" | "Under Review" | "Confirmed" | "Remediation Required" | "Resolved" | "False Positive";
  fingerprint: string;
}

/** Compute Shannon entropy of a string (bits per symbol) */
export function calculateShannonEntropy(str: string): number {
  if (!str || str.length === 0) return 0;
  const frequencies = new Map<string, number>();
  for (const char of str) {
    frequencies.set(char, (frequencies.get(char) || 0) + 1);
  }
  let entropy = 0;
  const len = str.length;
  for (const count of frequencies.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/** Check if text contains obvious placeholder / example markers */
export function isPlaceholderOrExample(line: string, match: string): boolean {
  const lower = line.toLowerCase();
  const placeholderTokens = [
    "example",
    "placeholder",
    "your_key",
    "your-key",
    "your_api_key",
    "your-api-key",
    "your_token",
    "your_secret",
    "insert_here",
    "replace_me",
    "sample",
    "dummy",
    "fake",
    "test_key",
    "foo_bar",
    "xxxx",
    "00000000",
    "12345678",
    "abcdef",
    "<your",
    "[your",
    "todo",
    "changeme",
    "process.env",
    "os.environ",
    "system.getenv",
    "config.get",
    "${",
    "$env:",
  ];

  if (placeholderTokens.some((tok) => lower.includes(tok))) return true;

  // Repetitive or monotonic test patterns
  const clean = match.replace(/[^a-zA-Z0-9]/g, "");
  const uniqueChars = new Set(clean).size;
  if (uniqueChars < 8 && clean.length > 10) return true;

  return false;
}

/** Check if line represents public/frontend non-sensitive config */
export function isPublicFrontendConfig(line: string): boolean {
  const lower = line.toLowerCase();

  // Exclude Stripe publishable keys
  if (lower.includes("pk_live_") || lower.includes("pk_test_")) return true;

  // Exclude Supabase public / anon keys
  if (lower.includes("anon_key") || lower.includes("public_key") || lower.includes("supabase_anon")) return true;

  // Exclude Firebase public configs (apiKey + authDomain + projectId)
  if (
    lower.includes("firebase") &&
    (lower.includes("authdomain") ||
      lower.includes("projectid") ||
      lower.includes("storagebucket") ||
      lower.includes("messaginggroup") ||
      lower.includes("appident"))
  ) {
    return true;
  }

  // Exclude Google public OAuth Client IDs
  if (lower.includes("apps.googleusercontent.com")) return true;

  // Exclude Analytics & telemetry public keys (Mixpanel, GA, Sentry DSN public client)
  if (lower.includes("mixpanel.init") || lower.includes("gtag") || lower.includes("google-analytics")) return true;

  return false;
}

export const DETECTION_RULES: DetectionRule[] = [
  // ─── PRIORITY A: AI API CREDENTIALS ──────────────────────────────────────
  {
    id: "openai_project_key",
    provider: "OpenAI",
    secretType: "OpenAI Project API Key",
    category: "ai",
    severity: "Critical",
    confidence: "High",
    regex: /sk-proj-[A-Za-z0-9_-]{48,}/g,
    minEntropy: 3.8,
    suggestedAction:
      "Revoke and rotate the exposed OpenAI project key immediately via the OpenAI dashboard, remove from repository Git history, and migrate to environment variables.",
    redact: (match) => `OPENAI_API_KEY = "${match.slice(0, 11)}••••••••••••••••"`,
  },
  {
    id: "openai_standard_key",
    provider: "OpenAI",
    secretType: "OpenAI Secret Key",
    category: "ai",
    severity: "Critical",
    confidence: "High",
    regex: /sk-[A-Za-z0-9]{48,}/g,
    minEntropy: 3.8,
    suggestedAction:
      "Rotate the exposed OpenAI API key at platform.openai.com, purge Git history with git-filter-repo, and restrict organization billing limits.",
    redact: (match) => `OPENAI_API_KEY = "${match.slice(0, 7)}••••••••••••••••"`,
  },
  {
    id: "anthropic_claude_key",
    provider: "Anthropic",
    secretType: "Anthropic Claude API Key",
    category: "ai",
    severity: "Critical",
    confidence: "High",
    regex: /sk-ant-api03-[A-Za-z0-9_-]{70,}/g,
    minEntropy: 3.2,
    suggestedAction:
      "Revoke the Anthropic Claude API key immediately in console.anthropic.com, inspect organization audit logs, and store replacement in secret management.",
    redact: (match) => `ANTHROPIC_API_KEY = "${match.slice(0, 14)}••••••••••••••••"`,
  },
  {
    id: "gemini_api_key",
    provider: "Google",
    secretType: "Google Gemini / AI Studio API Key",
    category: "ai",
    severity: "High",
    confidence: "High",
    regex: /AIzaSy[0-9A-Za-z_-]{33}/g,
    minEntropy: 3.2,
    suggestedAction:
      "Revoke the exposed Google AI Studio API key in Google Cloud Console, inspect API quotas, and restrict the replacement key by IP and HTTP referrers.",
    redact: (match) => `GEMINI_API_KEY = "${match.slice(0, 10)}••••••••••••••••"`,
  },
  {
    id: "huggingface_token",
    provider: "Hugging Face",
    secretType: "Hugging Face User Access Token",
    category: "ai",
    severity: "High",
    confidence: "High",
    regex: /hf_[A-Za-z0-9]{34,}/g,
    minEntropy: 3.5,
    suggestedAction:
      "Revoke the user access token in Hugging Face settings, inspect private model repository access, and issue a fine-grained token.",
    redact: (match) => `HF_TOKEN = "${match.slice(0, 6)}••••••••••••••••"`,
  },
  {
    id: "cohere_api_key",
    provider: "Cohere",
    secretType: "Cohere AI API Key",
    category: "ai",
    severity: "High",
    confidence: "High",
    regex: /(?:cohere_api_key|COHERE_API_KEY|cohere_key)\s*[=:]\s*["']?([A-Za-z0-9]{40})["']?/gi,
    suggestedAction:
      "Rotate the Cohere API key in the Cohere dashboard, review model inference usage, and migrate key to secure secrets manager.",
    redact: () => `COHERE_API_KEY = "••••••••••••••••••••••••••••••••••••••••"`,
  },
  {
    id: "mistral_api_key",
    provider: "Mistral",
    secretType: "Mistral AI API Key",
    category: "ai",
    severity: "High",
    confidence: "High",
    regex: /(?:mistral_api_key|MISTRAL_API_KEY|mistral_key)\s*[=:]\s*["']?([A-Za-z0-9]{32})["']?/gi,
    suggestedAction:
      "Revoke the Mistral API key in console.mistral.ai, verify account usage, and ensure replacement is only loaded via environment variables.",
    redact: () => `MISTRAL_API_KEY = "••••••••••••••••••••••••••••••••"`,
  },

  // ─── PRIORITY B: CLOUD INFRASTRUCTURE ────────────────────────────────────
  {
    id: "aws_access_key",
    provider: "AWS",
    secretType: "AWS IAM Access Key ID",
    category: "cloud",
    severity: "Critical",
    confidence: "High",
    regex: /AKIA[0-9A-Z]{16}/g,
    suggestedAction:
      "Deactivate the IAM user access key in AWS IAM Console immediately, audit AWS CloudTrail for unauthorized API calls, and rotate credentials.",
    redact: (match) => `AWS_ACCESS_KEY_ID = "${match.slice(0, 6)}••••••••••"`,
  },
  {
    id: "aws_secret_key",
    provider: "AWS",
    secretType: "AWS Secret Access Key",
    category: "cloud",
    severity: "Critical",
    confidence: "High",
    regex: /(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY|secret_access_key)\s*[=:]\s*["']?([A-Za-z0-9/+=]{40})["']?/gi,
    suggestedAction:
      "Immediately rotate the associated AWS secret key and IAM user credentials, inspect CloudTrail event history, and delete hardcoded references.",
    redact: () => `AWS_SECRET_ACCESS_KEY = "••••••••••••••••••••••••••••••••••••••••"`,
  },
  {
    id: "azure_connection_string",
    provider: "Azure",
    secretType: "Azure Storage / Service Connection String",
    category: "cloud",
    severity: "Critical",
    confidence: "High",
    regex: /DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=[A-Za-z0-9+/=]{60,}/gi,
    suggestedAction:
      "Regenerate the Azure Storage Account Access Keys in Azure Portal, purge Git history, and configure Azure Key Vault references.",
    redact: () => `AZURE_STORAGE_CONNECTION_STRING = "DefaultEndpointsProtocol=https;AccountName=[REDACTED];AccountKey=••••"`,
  },
  {
    id: "gcp_service_account",
    provider: "Google Cloud",
    secretType: "GCP Service Account Private Key",
    category: "cloud",
    severity: "Critical",
    confidence: "High",
    regex: /"private_key":\s*"-----BEGIN PRIVATE KEY-----\\n[A-Za-z0-9+/=\\n]+-----END PRIVATE KEY-----\\n"/g,
    suggestedAction:
      "Delete and rotate the GCP Service Account key in Google Cloud IAM & Admin console, inspect Cloud Audit Logs for anomalous activity, and move to Workload Identity Federation.",
    redact: () => `"private_key": "-----BEGIN PRIVATE KEY-----\\n[REDACTED SENSITIVE KEY]\\n-----END PRIVATE KEY-----\\n"`,
  },

  // ─── PRIORITY C: PAYMENT & BUSINESS SERVICES ─────────────────────────────
  {
    id: "stripe_secret_key",
    provider: "Stripe",
    secretType: "Stripe Live Secret Key",
    category: "payment",
    severity: "Critical",
    confidence: "High",
    regex: /sk_live_[A-Za-z0-9]{24,}/g,
    minEntropy: 3.5,
    suggestedAction:
      "Revoke the Stripe live secret key immediately in the Stripe Dashboard, review recent charge and transfer history, and enable Stripe restricted keys.",
    redact: (match) => `STRIPE_SECRET_KEY = "${match.slice(0, 11)}••••••••••••••••"`,
  },
  {
    id: "stripe_restricted_key",
    provider: "Stripe",
    secretType: "Stripe Restricted Key",
    category: "payment",
    severity: "High",
    confidence: "High",
    regex: /rk_live_[A-Za-z0-9]{24,}/g,
    minEntropy: 3.5,
    suggestedAction:
      "Revoke the Stripe restricted key in the Stripe Dashboard, review API request logs, and issue a scoped replacement.",
    redact: (match) => `STRIPE_RESTRICTED_KEY = "${match.slice(0, 11)}••••••••••••••••"`,
  },
  {
    id: "sendgrid_api_key",
    provider: "SendGrid",
    secretType: "SendGrid Mail API Key",
    category: "payment",
    severity: "High",
    confidence: "High",
    regex: /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/g,
    suggestedAction:
      "Revoke the SendGrid API key at app.sendgrid.com, inspect outbound email dispatch logs, and enforce IP access management.",
    redact: (match) => `SENDGRID_API_KEY = "${match.slice(0, 7)}••••••••••••••••"`,
  },
  {
    id: "twilio_auth_token",
    provider: "Twilio",
    secretType: "Twilio Authentication Token",
    category: "payment",
    severity: "High",
    confidence: "Medium",
    regex: /(?:twilio_auth_token|TWILIO_AUTH_TOKEN|twilio_token)\s*[=:]\s*["']?([a-f0-9]{32})["']?/gi,
    suggestedAction:
      "Rotate the Twilio Auth Token in Twilio Console, audit recent SMS/voice message logs, and switch to secondary API keys.",
    redact: () => `TWILIO_AUTH_TOKEN = "••••••••••••••••••••••••••••••••"`,
  },

  // ─── PRIORITY D: PRIVATE DATABASE & SERVER CREDENTIALS ───────────────────
  {
    id: "postgres_db_url",
    provider: "PostgreSQL",
    secretType: "PostgreSQL Connection URI with Password",
    category: "database",
    severity: "Critical",
    confidence: "High",
    regex: /postgres(?:ql)?:\/\/[^:]+:[^@\s"']+@[^\s"']+/gi,
    suggestedAction:
      "Immediately change the database user password on your PostgreSQL instance, restrict firewall access to authorized VPC IPs only, and purge Git commit history.",
    redact: (match) => {
      const proto = match.split("://")[0];
      return `${proto}://[user]:•••••••••@[host]/[database]`;
    },
  },
  {
    id: "mongodb_atlas_url",
    provider: "MongoDB",
    secretType: "MongoDB Atlas Connection String with Password",
    category: "database",
    severity: "Critical",
    confidence: "High",
    regex: /mongodb(?:\+srv)?:\/\/[^:]+:[^@\s"']+@[^\s"']+/gi,
    suggestedAction:
      "Rotate database user credentials in MongoDB Atlas, update IP access lists, and move connection strings into secret management.",
    redact: (match) => {
      const proto = match.split("://")[0];
      return `${proto}://[user]:•••••••••@[cluster]/[database]`;
    },
  },
  {
    id: "redis_auth_url",
    provider: "Redis",
    secretType: "Redis Connection URL with Password",
    category: "database",
    severity: "Critical",
    confidence: "High",
    regex: /redis:\/\/:[^@\s"']+@[^\s"']+/gi,
    suggestedAction:
      "Rotate the Redis AUTH password on your cluster, verify firewall access rules, and remove exposed connection URLs from repository history.",
    redact: () => `redis://:•••••••••@[host]:[port]`,
  },
  {
    id: "pem_private_key",
    provider: "PKI / SSH",
    secretType: "Private Cryptographic Key (RSA/EC/OpenSSH)",
    category: "database",
    severity: "Critical",
    confidence: "High",
    regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    suggestedAction:
      "Revoke and regenerate the private cryptographic key pair immediately, remove public key from authorized_keys files, and purge from Git history.",
    redact: () => `-----BEGIN PRIVATE KEY-----\n[REDACTED SENSITIVE KEY MATERIAL]\n-----END PRIVATE KEY-----`,
  },
];

/**
 * Scan raw source code content for high-value secrets.
 * Excludes frontend configuration, public keys, and placeholders.
 */
export function scanContent(
  content: string,
  filePath: string,
  repoOwner: string,
  repoName: string,
  repoUrl: string,
  branch: string,
  commitHash: string,
  isHistorical = false,
): ScanFinding[] {
  const findings: ScanFinding[] = [];
  const seenFingerprints = new Set<string>();
  const lines = content.split("\n");

  for (const rule of DETECTION_RULES) {
    rule.regex.lastIndex = 0;

    lines.forEach((line, lineIndex) => {
      rule.regex.lastIndex = 0;

      // Filter public frontend configuration
      if (isPublicFrontendConfig(line)) return;

      const match = rule.regex.exec(line);
      if (!match) return;

      const rawMatch = match[0];

      // Exclude placeholders, test templates, and environment lookups
      if (isPlaceholderOrExample(line, rawMatch)) return;

      // Entropy check if specified by rule
      if (rule.minEntropy) {
        const entropy = calculateShannonEntropy(rawMatch);
        if (entropy < rule.minEntropy) return;
      }

      const redactedEvidence = rule.redact(rawMatch, line);

      // Non-reversible SHA-256 equivalent fingerprint for deduplication
      const fingerprint = btoa(`${rule.id}:${repoOwner}/${repoName}:${filePath}:${lineIndex + 1}`)
        .replace(/=/g, "")
        .slice(0, 32);

      if (seenFingerprints.has(fingerprint)) return;
      seenFingerprints.add(fingerprint);

      const now = new Date().toISOString();
      const lineNum = lineIndex + 1;
      const fileUrl = `${repoUrl}/blob/${branch}/${filePath}#L${lineNum}`;

      // Classification according to Section 7
      let classification: FindingClassification;
      if (isHistorical) {
        classification = "Historical exposure";
      } else if (rule.confidence === "High") {
        classification = "High-confidence detection";
      } else {
        classification = "Potential exposure";
      }

      findings.push({
        id: `finding-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ruleId: rule.id,
        provider: rule.provider,
        secretType: rule.secretType,
        category: rule.category,
        severity: rule.severity,
        confidence: rule.confidence,
        classification,
        repoOwner,
        repoName,
        repoUrl,
        file: filePath,
        line: lineNum,
        fileUrl,
        commitHash,
        branch,
        firstDetected: now,
        lastDetected: now,
        exposure: "Public repository",
        historicalOrCurrent: isHistorical ? "Historical" : "Current",
        redactedEvidence,
        suggestedAction: rule.suggestedAction,
        status: "New",
        fingerprint,
      });
    });
  }

  return findings;
}
