# Threat Model (STRIDE)

**Domain:** Vercel-deployed Next.js e-commerce, Supabase DB, Stripe payments.  
**Date:** 2026-03-01  
**Author:** Security Review (Automated)  
**Status:** Active  

## Overview

This threat model uses the [STRIDE](https://docs.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats) framework to identify and mitigate threats across the Donut Shop application.

## Architecture Summary

```
[Browser] → [Vercel Edge/CDN] → [Next.js App (SSR/API)] → [Supabase (Auth + DB)]
                                        ↓                        ↑
                                  [Stripe API] ←── [Webhooks] ──┘
                                        ↓
                                  [Redis Cache]
```

## STRIDE Analysis

### S — Spoofing (Identity)

| Threat | Description | Severity | Likelihood |
|--------|-------------|----------|------------|
| S-1 | Attacker logs in with stolen credentials | High | Medium |
| S-2 | Session hijacking via stolen JWT | High | Low |
| S-3 | CSRF-based actions on behalf of user | Medium | Low |

**Existing Mitigations:**
- Supabase Auth with bcrypt password hashing + JWT tokens
- CSRF / origin validation middleware (`lib/middleware.ts`)
- HttpOnly cookies for session tokens
- Rate limiting on auth endpoints (`lib/redis/rate-limit.ts`)

**Additional Mitigations (Implemented):**
- ✅ Refresh token rotation with reuse detection (`lib/token-rotation.ts`)
- ✅ Session/device anomaly detection (`lib/session-anomaly.ts`)
- ✅ Step-up authentication for anomalous sessions

**Residual Risk:** Acceptable. Credential stuffing is mitigated by rate limiting. Phishing is out of scope (user education).

---

### T — Tampering (Data Integrity)

| Threat | Description | Severity | Likelihood |
|--------|-------------|----------|------------|
| T-1 | Cart/price manipulation via client-side | High | Medium |
| T-2 | API response shape mutation | Medium | Low |
| T-3 | Order status manipulation | High | Low |

**Existing Mitigations:**
- Server-side price calculation (Stripe session created server-side)
- Contract tests freeze API response shapes (`tests/contract/`)
- RLS policies prevent unauthorized data modification
- Idempotency keys for checkout (`lib/idempotency.ts`)

**Additional Mitigations:**
- ✅ ABAC policy engine enforces resource-level access (`lib/abac.ts`)
- ✅ Audit log table (insert-only) for order state changes

**Residual Risk:** Low. Price tampering is impossible since Stripe sessions are server-generated.

---

### R — Repudiation (Non-Repudiation)

| Threat | Description | Severity | Likelihood |
|--------|-------------|----------|------------|
| R-1 | User claims "I never placed this order" | Medium | Low |
| R-2 | Admin denies making configuration changes | Low | Low |

**Existing Mitigations:**
- `stripe_events` table stores all webhook events
- Idempotency keys link requests to outcomes
- Structured logging with request IDs (`lib/logger.ts`)

**Additional Mitigations:**
- ✅ Audit log table with immutable insert-only policy (migration 005)
- ✅ All admin actions logged with user ID and timestamp

**Residual Risk:** Acceptable. Stripe provides independent transaction records.

---

### I — Information Disclosure (Confidentiality)

| Threat | Description | Severity | Likelihood |
|--------|-------------|----------|------------|
| I-1 | PII leakage in logs/errors | High | Medium |
| I-2 | Unauthorized access to user data | High | Low |
| I-3 | API returning data of other users | High | Low |

**Existing Mitigations:**
- Sentry PII scrubbing configured (`sentry.*.config.ts`)
- GDPR module for data export/deletion (`lib/gdpr.ts`)
- RLS policies on all tables (`docs/RLS.md`)
- Structured error responses (no stack traces in production)

**Additional Mitigations:**
- ✅ ABAC policy engine prevents cross-user data access (`lib/abac.ts`)
- ✅ Standard API error contract hides internal details (`lib/api-error.ts`)

**Residual Risk:** Low. RLS + ABAC provide defense-in-depth.

---

### D — Denial of Service (Availability)

| Threat | Description | Severity | Likelihood |
|--------|-------------|----------|------------|
| D-1 | API endpoint flooding | Medium | Medium |
| D-2 | Database connection exhaustion | High | Low |
| D-3 | Redis memory exhaustion | Medium | Low |

**Existing Mitigations:**
- Redis-based rate limiting with sliding window (`lib/redis/rate-limit.ts`)
- Queue reliability with backoff + DLQ (`lib/queue-reliability.ts`)
- Vercel Edge network provides DDoS protection
- Circuit breaker pattern (`lib/circuit-breaker.ts`)

**Additional Mitigations:**
- ✅ Cache observability for eviction monitoring (`lib/cache-observability.ts`)
- ✅ SLO monitoring for availability tracking (`lib/slo.ts`)

**Residual Risk:** Accepted. Multi-region DDoS protection handled by Vercel Edge. No additional WAF needed.

---

### E — Elevation of Privilege (Authorization)

| Threat | Description | Severity | Likelihood |
|--------|-------------|----------|------------|
| E-1 | Normal user accesses admin endpoints | Critical | Low |
| E-2 | User accesses another user's resources | High | Low |
| E-3 | JWT role claim manipulation | Medium | Low |

**Existing Mitigations:**
- `admin_users` table + middleware check (`lib/auth/admin.ts`)
- RLS with `EXISTS (SELECT 1 FROM admin_users)` pattern
- Admin paths protected at middleware level (`lib/middleware.ts`)
- JWT validation via Supabase Auth (server-side verification)

**Additional Mitigations:**
- ✅ ABAC with context-aware enforcement (`lib/abac.ts`)
- ✅ Token family revocation on reuse detection
- ✅ Session anomaly detection flags suspicious access

**Residual Risk:** Low. Defense-in-depth: middleware → RLS → ABAC.

---

## Risk Acceptance Register

| Risk | Decision | Rationale |
|------|----------|-----------|
| Multi-region DDoS | Accept | Vercel Edge handles this; additional WAF is cost-prohibitive for CV project |
| Physical access | Accept | Cloud-only deployment; no on-premise infrastructure |
| Credential stuffing at scale | Accept | Rate limiting + account lockout is sufficient for this scale |
| Supply chain attacks | Mitigated | Security CI baseline with dependency scanning (`.github/workflows/ci.yml`) |

## Attack Surface Summary

| Surface | Entry Point | Protection |
|---------|------------|------------|
| Public API | `/api/*` routes | Rate limiting, auth, ABAC, input validation |
| Admin API | `/api/admin/*` | `requireAdmin()` guard, RLS, ABAC |
| Webhooks | `/api/webhooks/stripe` | Stripe signature verification |
| Auth endpoints | `/api/auth/*` | Rate limiting, CSRF validation |
| Static assets | `/_next/static/*` | CDN, no auth needed |
| Client-side | Browser JS | CSP headers, XSS prevention |

## Monitoring & Detection

| Signal | Alert Condition | Response |
|--------|----------------|----------|
| Auth failures spike | >10 failures/min per IP | Auto rate limit |
| Token reuse detected | Any occurrence | Revoke family, alert |
| Session anomaly | New device + IP change | Step-up auth required |
| Admin action on unusual hours | Logged but not blocked | Manual review |
| Error rate spike | >1% checkout errors | SLO process triggers |

## Review Schedule

- **Quarterly:** Review threat model for new features/endpoints
- **Per-PR:** Security checklist in PR rubric (see `docs/PR-REVIEW-RUBRIC.md`)
- **On incident:** Update mitigations if threat model gap identified

## References

- [STRIDE Model](https://docs.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [RLS Policy Reference](./RLS.md)
- [Security CI Baseline](./SECURITY-CI-BASELINE.md)
- [Incident Severity Model](./INCIDENT-SEVERITY.md)
