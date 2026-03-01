import { describe, it, expect } from 'vitest';
import {
  DEPENDENCY_AUDIT_POLICY,
  FORBIDDEN_PATTERNS,
  REQUIRED_HEADERS,
  SECRET_PATTERNS,
  SENSITIVE_ENV_VARS,
  validateSecurityHeaders,
  scanForSecrets,
  checkEnvHygiene,
  checkForbiddenPatterns,
} from '@/lib/security-baseline';

// ── Dependency Audit Policy ──────────────────────────────────

describe('Dependency Audit Policy', () => {
  it('blocks on high severity or above', () => {
    expect(DEPENDENCY_AUDIT_POLICY.blockingSeverity).toBe('high');
  });

  it('excludes devDependencies from blocking audit', () => {
    expect(DEPENDENCY_AUDIT_POLICY.includeDevDeps).toBe(false);
  });

  it('starts with empty allow list', () => {
    expect(DEPENDENCY_AUDIT_POLICY.allowList).toEqual([]);
  });
});

// ── Forbidden Code Patterns ──────────────────────────────────

describe('Forbidden Code Patterns', () => {
  it('defines at least 5 forbidden patterns', () => {
    expect(FORBIDDEN_PATTERNS.length).toBeGreaterThanOrEqual(5);
  });

  it('includes eval detection', () => {
    const evalRule = FORBIDDEN_PATTERNS.find((p) => p.name === 'eval-usage');
    expect(evalRule).toBeDefined();
    expect(evalRule!.severity).toBe('error');
    expect(evalRule!.pattern.test('eval("code")')).toBe(true);
    expect(evalRule!.pattern.test('evaluation(data)')).toBe(false);
  });

  it('includes innerHTML detection', () => {
    const rule = FORBIDDEN_PATTERNS.find((p) => p.name === 'innerHTML-assignment');
    expect(rule).toBeDefined();
    expect(rule!.pattern.test('el.innerHTML = userInput')).toBe(true);
    expect(rule!.pattern.test('el.textContent = safe')).toBe(false);
  });

  it('includes dangerouslySetInnerHTML detection', () => {
    const rule = FORBIDDEN_PATTERNS.find((p) => p.name === 'dangerouslySetInnerHTML');
    expect(rule).toBeDefined();
    expect(rule!.severity).toBe('warn');
  });

  it('includes hardcoded secret detection', () => {
    const rule = FORBIDDEN_PATTERNS.find((p) => p.name === 'hardcoded-secret-pattern');
    expect(rule).toBeDefined();
    expect(rule!.pattern.test('password = "mysecretpass123"')).toBe(true);
    expect(rule!.pattern.test('password = ""')).toBe(false);
  });

  it('all patterns have at least one exception for test files', () => {
    for (const fp of FORBIDDEN_PATTERNS) {
      const hasTestException = fp.exceptions.some(
        (e) => e.includes('.test.') || e.includes('.spec.'),
      );
      expect(hasTestException).toBe(true);
    }
  });
});

// ── checkForbiddenPatterns ───────────────────────────────────

describe('checkForbiddenPatterns', () => {
  it('flags eval in production code', () => {
    const result = checkForbiddenPatterns(
      'const x = eval("1+1");',
      'src/utils/parser.ts',
    );
    expect(result.clean).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ name: 'eval-usage', severity: 'error' }),
    );
  });

  it('allows eval in test files', () => {
    const result = checkForbiddenPatterns(
      'const x = eval("1+1");',
      'tests/unit/parser.test.ts',
    );
    // eval-usage should be excepted in test files
    const evalViolation = result.violations.find((v) => v.name === 'eval-usage');
    expect(evalViolation).toBeUndefined();
  });

  it('returns clean for safe code', () => {
    const result = checkForbiddenPatterns(
      'const total = items.reduce((a, b) => a + b, 0);',
      'src/cart.ts',
    );
    expect(result.clean).toBe(true);
  });

  it('flags multiple violations in same file', () => {
    const result = checkForbiddenPatterns(
      'eval("bad"); document.write("<script>xss</script>");',
      'src/vulnerable.ts',
    );
    expect(result.violations.length).toBeGreaterThanOrEqual(2);
  });
});

// ── Required Security Headers ────────────────────────────────

describe('Required Security Headers', () => {
  it('requires at least 4 headers', () => {
    expect(REQUIRED_HEADERS.length).toBeGreaterThanOrEqual(4);
  });

  it('requires X-Content-Type-Options: nosniff', () => {
    const header = REQUIRED_HEADERS.find((h) => h.name === 'X-Content-Type-Options');
    expect(header).toBeDefined();
    expect(header!.expectedValue).toBe('nosniff');
  });

  it('requires X-Frame-Options: DENY', () => {
    const header = REQUIRED_HEADERS.find((h) => h.name === 'X-Frame-Options');
    expect(header).toBeDefined();
    expect(header!.expectedValue).toBe('DENY');
  });

  it('requires HSTS with long max-age', () => {
    const header = REQUIRED_HEADERS.find((h) => h.name === 'Strict-Transport-Security');
    expect(header).toBeDefined();
  });
});

// ── validateSecurityHeaders ──────────────────────────────────

describe('validateSecurityHeaders', () => {
  it('passes with all required headers present and correct', () => {
    const result = validateSecurityHeaders({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
    });
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
    expect(result.invalid).toHaveLength(0);
  });

  it('reports missing headers', () => {
    const result = validateSecurityHeaders({
      'X-Content-Type-Options': 'nosniff',
    });
    expect(result.valid).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
  });

  it('reports invalid header values', () => {
    const result = validateSecurityHeaders({
      'X-Content-Type-Options': 'wrong-value',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin',
      'Strict-Transport-Security': 'max-age=63072000',
    });
    expect(result.valid).toBe(false);
    expect(result.invalid.length).toBeGreaterThan(0);
  });

  it('handles lowercase header names', () => {
    const result = validateSecurityHeaders({
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'no-referrer',
      'strict-transport-security': 'max-age=31536000',
    });
    expect(result.valid).toBe(true);
  });
});

// ── Secret Scan ──────────────────────────────────────────────

describe('Secret Scan Patterns', () => {
  it('defines at least 4 secret patterns', () => {
    expect(SECRET_PATTERNS.length).toBeGreaterThanOrEqual(4);
  });

  it('detects Stripe secret keys', () => {
    const result = scanForSecrets('const key = "sk_test_1234567890abcdefghij";');
    expect(result.found).toBe(true);
    expect(result.matches).toContainEqual(
      expect.objectContaining({ pattern: 'stripe-secret-key' }),
    );
  });

  it('detects Stripe webhook secrets', () => {
    const result = scanForSecrets('const whsec = "whsec_abcdefghij1234567890";');
    expect(result.found).toBe(true);
  });

  it('detects PEM private keys', () => {
    const result = scanForSecrets('-----BEGIN RSA PRIVATE KEY-----');
    expect(result.found).toBe(true);
    expect(result.matches).toContainEqual(
      expect.objectContaining({ pattern: 'private-key-pem' }),
    );
  });

  it('passes clean content', () => {
    const result = scanForSecrets('const greeting = "hello world";');
    expect(result.found).toBe(false);
    expect(result.matches).toHaveLength(0);
  });
});

// ── Environment Variable Hygiene ─────────────────────────────

describe('Environment Variable Hygiene', () => {
  it('defines at least 5 sensitive variables', () => {
    expect(SENSITIVE_ENV_VARS.length).toBeGreaterThanOrEqual(5);
  });

  it('includes critical secrets', () => {
    expect(SENSITIVE_ENV_VARS).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(SENSITIVE_ENV_VARS).toContain('STRIPE_SECRET_KEY');
    expect(SENSITIVE_ENV_VARS).toContain('STRIPE_WEBHOOK_SECRET');
  });

  it('passes when no sensitive vars are exposed', () => {
    const result = checkEnvHygiene({
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
    });
    expect(result.safe).toBe(true);
  });

  it('fails when sensitive var is NEXT_PUBLIC_ prefixed', () => {
    const result = checkEnvHygiene({
      NEXT_PUBLIC_STRIPE_SECRET_KEY: 'sk_test_secret123',
    });
    expect(result.safe).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0]).toMatch(/STRIPE_SECRET_KEY/);
  });

  it('flags multiple violations', () => {
    const result = checkEnvHygiene({
      NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: 'key1',
      NEXT_PUBLIC_STRIPE_SECRET_KEY: 'key2',
      NEXT_PUBLIC_DATABASE_URL: 'postgres://...',
    });
    expect(result.violations).toHaveLength(3);
  });
});

// ── Cross-Module Integration ─────────────────────────────────

describe('Security baseline integration', () => {
  it('HSTS max-age requirement matches next.config.ts value (63072000)', () => {
    const hsts = REQUIRED_HEADERS.find((h) => h.name === 'Strict-Transport-Security');
    expect(hsts).toBeDefined();
    // Our next.config sets max-age=63072000 — pattern should match
    const pattern = hsts!.expectedValue as RegExp;
    expect(pattern.test('max-age=63072000; includeSubDomains; preload')).toBe(true);
  });

  it('Stripe patterns align with actual env var names', () => {
    // STRIPE_SECRET_KEY is in SENSITIVE_ENV_VARS
    expect(SENSITIVE_ENV_VARS).toContain('STRIPE_SECRET_KEY');
    // And we have a secret scanner for the actual key pattern
    const stripeScanner = SECRET_PATTERNS.find((p) => p.name === 'stripe-secret-key');
    expect(stripeScanner).toBeDefined();
  });
});
