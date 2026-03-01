/**
 * Security CI Baseline — codified security checks that run in CI.
 *
 * Defines the project's security posture as code:
 *  1. Dependency audit thresholds (which severities block CI)
 *  2. Forbidden code patterns (eval, innerHTML, dangerouslySetInnerHTML)
 *  3. Required security headers for API routes
 *  4. Secret scan patterns (hardcoded credentials detection)
 *  5. Environment variable hygiene (no NEXT_PUBLIC_ leaking secrets)
 *
 * Usage:
 *   import { FORBIDDEN_PATTERNS, REQUIRED_HEADERS, ... } from '@/lib/security-baseline';
 */

// ── Dependency Audit ─────────────────────────────────────────

export type AuditSeverity = 'info' | 'low' | 'moderate' | 'high' | 'critical';

export interface DependencyAuditPolicy {
  /** Minimum severity that blocks CI. */
  blockingSeverity: AuditSeverity;
  /** Whether devDependencies are included in the audit. */
  includeDevDeps: boolean;
  /** Package names to exclude from blocking (known accepted risks). */
  allowList: string[];
}

export const DEPENDENCY_AUDIT_POLICY: DependencyAuditPolicy = {
  blockingSeverity: 'high',
  includeDevDeps: false,
  allowList: [],
};

// ── Forbidden Code Patterns ──────────────────────────────────

export interface ForbiddenPattern {
  /** Human-readable name. */
  name: string;
  /** Regex pattern (applied to source files). */
  pattern: RegExp;
  /** Why this pattern is forbidden. */
  reason: string;
  /** Severity: 'error' blocks CI, 'warn' only alerts. */
  severity: 'error' | 'warn';
  /** File globs where this pattern is excepted (e.g., test files). */
  exceptions: string[];
}

export const FORBIDDEN_PATTERNS: ForbiddenPattern[] = [
  {
    name: 'eval-usage',
    pattern: /\beval\s*\(/,
    reason: 'eval() enables arbitrary code execution (CWE-95)',
    severity: 'error',
    exceptions: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**'],
  },
  {
    name: 'innerHTML-assignment',
    pattern: /\.innerHTML\s*=/,
    reason: 'Direct innerHTML assignment enables XSS (CWE-79)',
    severity: 'error',
    exceptions: ['**/*.test.*', '**/*.spec.*'],
  },
  {
    name: 'dangerouslySetInnerHTML',
    pattern: /dangerouslySetInnerHTML/,
    reason: 'dangerouslySetInnerHTML bypasses React XSS protection',
    severity: 'warn',
    exceptions: ['**/*.test.*', '**/*.spec.*'],
  },
  {
    name: 'document-write',
    pattern: /document\.write\s*\(/,
    reason: 'document.write can be exploited for DOM-based XSS',
    severity: 'error',
    exceptions: ['**/*.test.*', '**/*.spec.*'],
  },
  {
    name: 'hardcoded-secret-pattern',
    pattern: /(?:password|secret|api_key|apikey|token)\s*[:=]\s*['"][^'"]{8,}['"]/i,
    reason: 'Potential hardcoded secret/credential (CWE-798)',
    severity: 'error',
    exceptions: [
      '**/*.test.*',
      '**/*.spec.*',
      '**/lib/security-baseline.ts',
      '**/.github/**',
      '**/docs/**',
    ],
  },
  {
    name: 'console-log-in-production',
    pattern: /\bconsole\.(log|debug|trace)\b/,
    reason: 'Use structured logger instead of console.log in production code',
    severity: 'warn',
    exceptions: [
      '**/*.test.*',
      '**/*.spec.*',
      '**/scripts/**',
      '**/instrumentation*',
      '**/sentry.*',
      '**/next.config.*',
    ],
  },
];

// ── Required Security Headers ────────────────────────────────

export interface RequiredHeader {
  /** Header name. */
  name: string;
  /** Expected value (exact match or regex). */
  expectedValue: string | RegExp;
  /** OWASP reference or CWE. */
  reference: string;
}

export const REQUIRED_HEADERS: RequiredHeader[] = [
  {
    name: 'X-Content-Type-Options',
    expectedValue: 'nosniff',
    reference: 'OWASP Secure Headers - MIME Sniffing',
  },
  {
    name: 'X-Frame-Options',
    expectedValue: 'DENY',
    reference: 'OWASP Clickjacking Defense',
  },
  {
    name: 'Referrer-Policy',
    expectedValue: /strict-origin|no-referrer/,
    reference: 'OWASP Referrer-Policy',
  },
  {
    name: 'Strict-Transport-Security',
    expectedValue: /max-age=\d{7,}/,
    reference: 'OWASP HSTS - minimum max-age 10M seconds',
  },
];

/**
 * Validate that a set of response headers includes all required security headers.
 */
export function validateSecurityHeaders(
  headers: Record<string, string>,
): { valid: boolean; missing: string[]; invalid: string[] } {
  const missing: string[] = [];
  const invalid: string[] = [];

  for (const req of REQUIRED_HEADERS) {
    const value = headers[req.name] ?? headers[req.name.toLowerCase()];
    if (!value) {
      missing.push(req.name);
      continue;
    }

    if (typeof req.expectedValue === 'string') {
      if (value !== req.expectedValue) {
        invalid.push(`${req.name}: expected "${req.expectedValue}", got "${value}"`);
      }
    } else {
      if (!req.expectedValue.test(value)) {
        invalid.push(`${req.name}: does not match ${req.expectedValue}`);
      }
    }
  }

  return {
    valid: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
  };
}

// ── Secret Scan Patterns ─────────────────────────────────────

export interface SecretPattern {
  name: string;
  pattern: RegExp;
  description: string;
}

export const SECRET_PATTERNS: SecretPattern[] = [
  {
    name: 'supabase-service-role-key',
    pattern: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
    description: 'Supabase JWT (service role key or anon key)',
  },
  {
    name: 'stripe-secret-key',
    pattern: /sk_(live|test)_[A-Za-z0-9]{20,}/,
    description: 'Stripe secret key',
  },
  {
    name: 'stripe-webhook-secret',
    pattern: /whsec_[A-Za-z0-9]{20,}/,
    description: 'Stripe webhook secret',
  },
  {
    name: 'generic-api-key',
    pattern: /(?:PRIVATE|SECRET|API)_KEY\s*=\s*['"][A-Za-z0-9_\-]{20,}['"]/i,
    description: 'Generic API key assignment',
  },
  {
    name: 'private-key-pem',
    pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,
    description: 'PEM-encoded private key',
  },
];

/**
 * Scan text content for hardcoded secrets.
 */
export function scanForSecrets(
  content: string,
): { found: boolean; matches: { pattern: string; description: string }[] } {
  const matches: { pattern: string; description: string }[] = [];

  for (const sp of SECRET_PATTERNS) {
    if (sp.pattern.test(content)) {
      matches.push({ pattern: sp.name, description: sp.description });
    }
  }

  return { found: matches.length > 0, matches };
}

// ── Environment Variable Hygiene ─────────────────────────────

/**
 * Environment variable names that MUST NOT be exposed via NEXT_PUBLIC_.
 * If any of these appear as NEXT_PUBLIC_ prefixed, it's a configuration bug.
 */
export const SENSITIVE_ENV_VARS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'REDIS_URL',
  'DATABASE_URL',
  'SENTRY_AUTH_TOKEN',
] as const;

/**
 * Check that no sensitive env vars are accidentally exposed as NEXT_PUBLIC_.
 */
export function checkEnvHygiene(
  envVars: Record<string, string | undefined>,
): { safe: boolean; violations: string[] } {
  const violations: string[] = [];

  for (const varName of SENSITIVE_ENV_VARS) {
    const publicKey = `NEXT_PUBLIC_${varName}`;
    if (publicKey in envVars && envVars[publicKey]) {
      violations.push(
        `${publicKey} is set — "${varName}" must not be exposed to the client`,
      );
    }
  }

  return { safe: violations.length === 0, violations };
}

// ── Pattern Matching Helper ──────────────────────────────────

/**
 * Check if source code contains any forbidden patterns.
 */
export function checkForbiddenPatterns(
  source: string,
  fileName: string,
): { clean: boolean; violations: { name: string; reason: string; severity: 'error' | 'warn' }[] } {
  const violations: { name: string; reason: string; severity: 'error' | 'warn' }[] = [];

  for (const fp of FORBIDDEN_PATTERNS) {
    // Check if this file is excepted
    const isExcepted = fp.exceptions.some((glob) => {
      // Simple glob matching: convert ** and * to regex
      const regex = new RegExp(
        '^' +
          glob
            .replace(/\*\*/g, '___DOUBLESTAR___')
            .replace(/\*/g, '[^/]*')
            .replace(/___DOUBLESTAR___/g, '.*') +
          '$',
      );
      return regex.test(fileName);
    });

    if (isExcepted) continue;

    if (fp.pattern.test(source)) {
      violations.push({ name: fp.name, reason: fp.reason, severity: fp.severity });
    }
  }

  return { clean: violations.length === 0, violations };
}
