# Security CI Baseline

> Codified security checks enforced in CI on every push and PR.

## CI Jobs

### 1. `security-scan` (runs on every push/PR)

| Step | What it does | Blocks CI? |
|------|-------------|-----------|
| Dependency audit | `npm audit --audit-level=high --omit=dev` | No (continue-on-error) |
| Secret scan | Grep for Stripe live keys, PEM private keys, webhook secrets | **Yes** |
| Forbidden patterns | Grep for `eval()`, `document.write()` in production code | **Yes** |

### 2. `audit` (existing job)

Runs `npm audit --audit-level=high` with `continue-on-error: true`.
The security-scan job adds a stricter pass focused on production deps only.

## Security Baseline Rules

### Forbidden Code Patterns

| Pattern | Severity | Why |
|---------|----------|-----|
| `eval()` | error | Arbitrary code execution (CWE-95) |
| `.innerHTML =` | error | XSS injection (CWE-79) |
| `dangerouslySetInnerHTML` | warn | Bypasses React XSS protection |
| `document.write()` | error | DOM-based XSS |
| Hardcoded secrets | error | Credential exposure (CWE-798) |
| `console.log/debug/trace` | warn | Use structured logger |

All patterns are excepted in test files (`*.test.*`, `*.spec.*`).

### Secret Scan Patterns

| Pattern | Description |
|---------|-------------|
| `sk_live_*` / `sk_test_*` | Stripe secret keys |
| `whsec_*` | Stripe webhook secrets |
| `eyJhbGci...` JWT | Supabase service role / anon keys |
| `PRIVATE_KEY = "..."` | Generic API key assignment |
| `-----BEGIN PRIVATE KEY-----` | PEM private keys |

### Required Security Headers

| Header | Expected Value | Reference |
|--------|---------------|-----------|
| `X-Content-Type-Options` | `nosniff` | OWASP MIME Sniffing |
| `X-Frame-Options` | `DENY` | OWASP Clickjacking |
| `Referrer-Policy` | `strict-origin*` or `no-referrer` | OWASP |
| `Strict-Transport-Security` | `max-age≥10M` | OWASP HSTS |

### Environment Variable Hygiene

These variables must NEVER be prefixed with `NEXT_PUBLIC_`:

- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `REDIS_URL`
- `DATABASE_URL`
- `SENTRY_AUTH_TOKEN`

The `checkEnvHygiene()` function validates this at test time.

## Library: `lib/security-baseline.ts`

Exports:

| Export | Type | Usage |
|--------|------|-------|
| `DEPENDENCY_AUDIT_POLICY` | config | Defines blocking severity |
| `FORBIDDEN_PATTERNS` | array | Code pattern definitions |
| `REQUIRED_HEADERS` | array | Header requirements |
| `SECRET_PATTERNS` | array | Regex patterns for secrets |
| `SENSITIVE_ENV_VARS` | array | Env vars that must stay server-only |
| `validateSecurityHeaders()` | function | Validate response headers |
| `scanForSecrets()` | function | Scan text for secrets |
| `checkEnvHygiene()` | function | Check env var exposure |
| `checkForbiddenPatterns()` | function | Scan source for bad patterns |

## Test Coverage

`tests/lib/security-baseline.test.ts` — 28+ tests covering:

- Dependency audit policy defaults
- All 6 forbidden patterns (detection + exceptions)
- Security header validation (pass/fail/lowercase)
- Secret scanning (Stripe, PEM, clean content)
- Env hygiene (safe/violations/multi-violation)
- Cross-module integration (HSTS alignment, Stripe pattern alignment)

## See Also

- [SECURITY.md](SECURITY.md) — application security layers
- [SECURITY-AUDIT-REPORT.md](SECURITY-AUDIT-REPORT.md) — full audit findings
- [OBSERVABILITY.md](OBSERVABILITY.md) — monitoring and alerting
