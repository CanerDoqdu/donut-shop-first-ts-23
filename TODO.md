# TODO — Ultimate Update

> PR-by-PR checklist. Each section maps to one PR.
> Verification commands at the end of each section.

---

## PR 1 — CI + Repo Discipline + Scripts
- [ ] Upgrade `.github/workflows/ci.yml` (npm cache, security audit step, fail-on-warnings)
- [ ] Create `.github/PULL_REQUEST_TEMPLATE.md`
- [ ] Create `.env.example` documenting all required env vars
- [ ] Add `typecheck` and `lint:fix` npm scripts to `package.json`
- [ ] Deduplicate ADRs: delete `docs/adr/001-zustand-client-state.md`, `002-singleton-supabase.md`, `003-debounced-search.md`
- [ ] Delete duplicate `components/shared/error-boundary.tsx`
- [ ] Delete empty `features/` folder
- [ ] Delete empty `tests/` folder
- [ ] Remove 10 root-level barrel folders: `config/`, `constants/`, `core/`, `error/`, `shared/`, `types/`, `validators/`, `monitoring/`, `logger/` (root), `middleware/` (root)
- [ ] Move `logger/index.ts` logic → `lib/logger.ts`
- [ ] Move `middleware/auth.ts` helpers → `lib/middleware.ts`
- [ ] Update `proxy.ts` imports to use `@/lib/logger` and `@/lib/middleware`
- [ ] Clean `tsconfig.json` path aliases (remove all enterprise folder aliases)
- [ ] Update any imports across codebase that used barrel re-exports
- [ ] Verify: `npm run lint && npx tsc --noEmit && npm run build`

## PR 2 — Environment Validation + Config Hardening
- [ ] Create `lib/env.ts` with fail-fast validation (throw on missing vars)
- [ ] Add feature flags to `lib/config.ts`
- [ ] Add `NEXT_PUBLIC_APP_VERSION` build-time injection
- [ ] Verify `.env.local` in `.gitignore`
- [ ] Verify: `npm run lint && npx tsc --noEmit && npm run build`

## PR 3 — Payment Security (Server-Truth Pricing)
- [ ] Refactor `createCheckoutSession()` to accept `{ id, quantity }[]` only
- [ ] Look up prices from `lib/data.ts` server-side in checkout route
- [ ] Remove `price` from client-sent payload
- [ ] Add idempotency key to Stripe checkout session
- [ ] Add 30-min expiry on Stripe session
- [ ] Verify: `npm run lint && npx tsc --noEmit && npm run build`

## PR 4 — Webhook Hardening
- [ ] Add `stripe_events` idempotency check (INSERT ON CONFLICT DO NOTHING)
- [ ] Wrap order update + loyalty in transaction
- [ ] Add structured logging to webhook handlers
- [ ] Handle `payment_intent.succeeded` event
- [ ] Verify: `npm run lint && npx tsc --noEmit && npm run build`

## PR 5 — Auth / RBAC + Secure Cookies
- [ ] Remove `httpOnly: false` comment from `proxy.ts`
- [ ] Pass cookie options through unchanged
- [ ] Add `isAdmin()` server helper
- [ ] Protect admin API routes with admin check
- [ ] Review cookie Secure + SameSite settings
- [ ] Verify: `npm run lint && npx tsc --noEmit && npm run build`

## PR 6 — Security Baseline
- [ ] Add CSRF / origin check on mutation API routes
- [ ] Rate limit auth endpoints (login, register, forgot-password)
- [ ] Add CSP header in `next.config.ts`
- [ ] Sanitize inputs in all API routes
- [ ] Verify: `npm run lint && npx tsc --noEmit && npm run build`

## PR 7 — Observability
- [ ] Upgrade `lib/logger.ts` to structured JSON (ISO timestamps, levels)
- [ ] Add `x-request-id` in proxy.ts
- [ ] Create `/api/health` endpoint
- [ ] Fix web-vitals endpoint mismatch (`/api/analytics` → `/api/vitals`)
- [ ] Add request logging in proxy.ts
- [ ] Verify: `npm run lint && npx tsc --noEmit && npm run build`

## PR 8 — Performance + Caching
- [ ] Add `React.cache()` wrappers for server Supabase queries
- [ ] Add revalidation tags for products/orders
- [ ] Optimize N+1 queries in AdminDashboard
- [ ] Review loading skeletons
- [ ] Verify: `npm run lint && npx tsc --noEmit && npm run build`

## PR 9 — Data Lifecycle + Audit
- [ ] Create `deleted_at` soft-delete migration SQL for orders
- [ ] Create `audit_log` table migration SQL
- [ ] Improve cart expiry with server-side validation
- [ ] Add data retention documentation
- [ ] Verify: `npm run lint && npx tsc --noEmit && npm run build`

## PR 10 — Testing + Documentation
- [ ] Install Vitest + React Testing Library
- [ ] Add `test` script to `package.json`
- [ ] Write tests: checkout, auth, rate-limiter, validators
- [ ] Finalize `docs/ultimate-update/SECURITY.md`
- [ ] Finalize `docs/ultimate-update/PAYMENTS.md`
- [ ] Finalize `docs/ultimate-update/RLS.md`
- [ ] Finalize `docs/ultimate-update/PERF.md`
- [ ] Finalize `docs/ultimate-update/RUNBOOK.md`
- [ ] Finalize `docs/ultimate-update/TESTING.md`
- [ ] Finalize `docs/ultimate-update/CI.md`
- [ ] Finalize `docs/ultimate-update/ARCHITECTURE.md`
- [ ] Verify: `npm run lint && npx tsc --noEmit && npm test && npm run build`


> These PRs are appended after PR10.
> Standard verify for each PR:
> npm run lint && npm run typecheck && npm run build
> (PR18 also run tests/e2e)

---

## PR 11 — Database Migrations + Idempotent SQL Standard
- [ ] Move all SQL changes into `supabase/migrations/` (timestamped, ordered)
- [ ] Standardize idempotent SQL patterns:
  - [ ] `drop policy if exists ...; create policy ...;`
  - [ ] `drop trigger if exists ...; create trigger ...;`
  - [ ] `create index if not exists ...;`
- [ ] Canonical RLS policy set doc for core tables:
  - [ ] profiles
  - [ ] loyalty_points
  - [ ] orders
  - [ ] stripe_events
- [ ] Add a “DB reset/apply” runbook (local + staging)
- [ ] Verify: `npm run lint && npm run typecheck && npm run build`

## PR 12 — Security Hardening+ (Enterprise Pack)
- [ ] Add secrets scan in CI (Gitleaks or equivalent) and fail on findings
- [ ] Add Dependabot config (weekly) for npm dependencies
- [ ] Add `npm audit` CI gate with severity threshold (high/critical fail)
- [ ] Add full security headers (in addition to CSP):
  - [ ] Strict-Transport-Security (HSTS)
  - [ ] X-Content-Type-Options
  - [ ] Referrer-Policy
  - [ ] Permissions-Policy
- [ ] Prevent account enumeration (generic auth responses for login/forgot-password)
- [ ] Webhook signature failure logging (no PII; include requestId + eventId only)
- [ ] CSRF strategy upgrade:
  - [ ] keep origin check
  - [ ] add token pattern ONLY if SameSite=None is required
- [ ] Verify: `npm run lint && npm run typecheck && npm run build`

## PR 13 — Reliability / Ops
- [ ] Standard API error shape: `{ code, message, requestId }`
- [ ] Global error handling pattern for route handlers + server actions
- [ ] Add timeouts + AbortController for external calls (Stripe/Supabase/fetch)
- [ ] Define retry/backoff rules (what retries, what never retries)
- [ ] Webhook dead-letter / replay plan:
  - [ ] admin-only replay endpoint OR documented CLI/script
- [ ] Maintenance mode feature flag (e.g. `CHECKOUT_ENABLED`) used in checkout/webhooks
- [ ] Verify: `npm run lint && npm run typecheck && npm run build`

## PR 14 — Observability+
- [ ] Ensure `x-request-id` is generated and propagated everywhere (proxy + handlers)
- [ ] Include requestId on every log line
- [ ] Add stable structured error codes:
  - [ ] `E_AUTH_*`
  - [ ] `E_STRIPE_*`
  - [ ] `E_DB_*`
  - [ ] `E_WEBHOOK_*`
- [ ] Add basic metrics (log-based is OK): webhook latency, error rate, checkout failures
- [ ] Optional: add Sentry (client + server) + tracing
- [ ] Verify: `npm run lint && npm run typecheck && npm run build`

## PR 15 — Performance+ (Enterprise Patterns)
- [ ] Define `revalidateTag` strategy (products/orders/admin dashboards)
- [ ] Define CDN caching policy (Cache-Control, s-maxage where appropriate)
- [ ] Image optimization audit (`next/image`, remotePatterns)
- [ ] Optional: bundle analyzer script (manual/CI optional)
- [ ] Add DB indexing plan + migrations for hot queries (orders/events/audit_log)
- [ ] Verify: `npm run lint && npm run typecheck && npm run build`

## PR 16 — Data Governance (Compliance-ish)
- [ ] PII classification doc (which fields are PII)
- [ ] GDPR-ish delete/export plan (doc + minimal endpoints if needed)
- [ ] Audit log integrity: append-only enforcement (prevent update/delete)
- [ ] Backups + restore test procedure (documented)
- [ ] Verify: `npm run lint && npm run typecheck && npm run build`

## PR 17 — Test Strategy++ (Contract + Webhook Fixtures + E2E)
- [ ] Add API contract tests for route handlers (checkout/auth/validators)
- [ ] Add webhook replay tests using fixture payloads (assert idempotency)
- [ ] Add Playwright E2E smoke tests:
  - [ ] login flow
  - [ ] checkout flow (Stripe test mode or mocked)
- [ ] Optional: CI matrix (Node LTS + current)
- [ ] Verify: `npm run lint && npm run typecheck && npm test && npm run build`