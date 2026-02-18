# Ultimate Update — Folder Audit & PR Plan

**Date:** 2025-07-17  
**Project:** donut-shop-first-ts-23  
**Stack:** Next.js 16.1.6 · React 19 · Supabase · Stripe · Zustand · next-intl

---

## 1  Folder Audit Report

### 1.1 Criteria

| # | Criterion | Verdict |
|---|-----------|---------|
| 1 | Clear layering (each folder owns one responsibility) | ❌ Fail |
| 2 | No duplicate parallel layers | ❌ Fail |
| 3 | Enforceable import boundaries | ❌ Fail |
| 4 | No empty folders / barrel spam | ❌ Fail |
| 5 | Next.js conventions respected | ⚠️ Partial |

### 1.2 Findings

**F1 – Barrel spam (12 root-level folders).**  
`config/`, `constants/`, `core/`, `error/`, `features/`, `hooks/`, `logger/`,
`middleware/`, `monitoring/`, `shared/`, `tests/`, `types/`, `validators/`
each contain one barrel `index.ts` that does nothing but re-export from `lib/`
or `components/`. This creates two competing import paths
(`@config/*` vs `@/lib/config`) with no additional logic, no boundary
enforcement, and cognitive overhead when deciding which to use.

**F2 – Empty folders.**  
`features/` has only a README.md. `tests/` has only a README.md. Neither
contains runnable code.

**F3 – Duplicate components.**  
`components/monitoring/error-boundary.tsx` and
`components/shared/error-boundary.tsx` are two nearly-identical ErrorBoundary
implementations.

**F4 – Duplicate ADRs.**  
`docs/adr/001-zustand-client-state.md` and `docs/adr/001-zustand-state-management.md`
describe the same decision. Same for 002 (singleton supabase vs internationalisation)
and 003 (debounced search vs supabase auth).

**F5 – proxy.ts `httpOnly: false` comment.**  
Line 31 of `proxy.ts` has a comment suggesting cookies are forced non-httpOnly.
The actual `@supabase/ssr` library defaults to httpOnly. The comment is
misleading and must be removed; cookie options should be passed through
unchanged.

**F6 – Server-truth violation in checkout.**  
`lib/stripe/server.ts → createCheckoutSession()` accepts `price` from the
caller, which originates on the client. The checkout API route
(`app/api/checkout/route.ts`) also calculates `totalAmount` from
client-provided prices. Both must look up prices from the canonical source
(currently `lib/data.ts`, later the database).

**F7 – No webhook idempotency.**  
`app/api/webhooks/stripe/route.ts` processes every event without checking
whether it was already handled. Stripe replays events on timeout; without a
`stripe_events` idempotency table the app can double-process orders.

**F8 – Web Vitals endpoint mismatch.**  
`components/monitoring/web-vitals.tsx` beacons to `/api/analytics`, but the
actual route is `/api/vitals`.

**F9 – No test infrastructure.**  
No test runner (Vitest / Jest), no test files, no test scripts in
`package.json`.

**F10 – No `.env.example`.**  
Required env vars are undocumented.

### 1.3 Corrected Structure (target state)

```
donut-shop-first-ts-23/
├── app/                     # Next.js App Router (pages + API routes)
├── components/              # React components (ui/, layout/, domain/)
├── hooks/                   # Custom React hooks (useDebounce, useMounted, etc.)
├── store/                   # Zustand stores
├── lib/                     # Shared non-React logic
│   ├── auth/                #   auth actions + context
│   ├── stripe/              #   Stripe client + checkout
│   ├── supabase/            #   Supabase clients + DB types
│   ├── config.ts            #   env validation + feature flags
│   ├── constants.ts         #   app-wide constants
│   ├── data.ts              #   sample product catalog (source of truth)
│   ├── logger.ts            #   structured logger
│   ├── rate-limit.ts        #   rate limiter
│   ├── types.ts             #   shared TypeScript types
│   ├── utils.ts             #   utility fns (cn, formatPrice)
│   └── validators.ts        #   input validators
├── i18n/                    # next-intl routing + messages
├── middleware/               # proxy.ts helpers (kept, but moved to lib/ over time)
├── public/                  # static assets
├── scripts/                 # DB seeds, SQL migrations
├── docs/                    # ADRs, runbooks, architecture docs
│   ├── adr/
│   └── ultimate-update/
├── __tests__/               # Vitest test files
├── .github/                 # CI, PR templates
├── proxy.ts                 # Next.js 16 proxy (middleware entry)
├── TODO.md                  # Project task tracker
└── .env.example             # Documented env vars
```

**Removed:** `config/`, `constants/`, `core/`, `error/`, `features/`,
`logger/` (root), `monitoring/`, `shared/`, `tests/`, `types/`, `validators/`
(root-level barrel re-export folders). All real logic already lives in `lib/`
or `components/`.

**Kept:** `middleware/` (used by proxy.ts — will inline into lib/ in PR5),
`hooks/` (contains real hooks, not re-exports).

**Migration plan:** Gradual per-PR. Each PR that touches a root barrel folder
updates imports to `@/lib/*` and deletes the empty barrel. By PR10 all
12 folders are gone and `tsconfig.json` path aliases are cleaned up.

---

## 2  PR Plan

### PR 1 — CI + Repo Discipline + Scripts
**Branch:** `ultimate/01-ci-repo-discipline`  
**Scope:**
- Upgrade `.github/workflows/ci.yml` (cache npm, fail on warnings, add security audit step)
- Add `.github/PULL_REQUEST_TEMPLATE.md`
- Add `.env.example` with all required env vars documented
- Add npm scripts: `typecheck`, `lint:fix`
- Deduplicate ADRs (keep one 001, one 002, one 003)
- Remove `components/shared/error-boundary.tsx` (duplicate)
- Remove empty `features/` and `tests/` folders
- Clean barrel spam: remove 10 root-level re-export folders, update tsconfig paths
- Move `logger/index.ts` logic → `lib/logger.ts`, delete `logger/` root folder
- Move `middleware/auth.ts` helpers → `lib/middleware.ts`, update proxy.ts import

**Acceptance:**
- `npm run lint` passes
- `npx tsc --noEmit` passes
- `npm run build` passes
- No root-level barrel folders remain except `hooks/` and `store/`

---

### PR 2 — Environment Validation + Config Hardening
**Branch:** `ultimate/02-env-config`  
**Scope:**
- Fail-fast env validation at import time (throw on missing required vars)
- Add `lib/env.ts` with Zod-free schema validation
- Add feature flags object to `lib/config.ts`
- Add build-time version injection (`NEXT_PUBLIC_APP_VERSION`)
- Add `.env.local` to `.gitignore` verify

**Acceptance:**
- App fails immediately with clear error if `NEXT_PUBLIC_SUPABASE_URL` is missing
- Build passes with all env vars set in CI

---

### PR 3 — Payment Security (Server-Truth Pricing)
**Branch:** `ultimate/03-payment-server-truth`  
**Scope:**
- Refactor `createCheckoutSession()` to accept product IDs + quantities only
- Look up prices from canonical catalog (`lib/data.ts`) server-side
- Remove `price` from client-sent checkout payload
- Add idempotency key param to checkout session
- Add checkout timeout (30 min expiry on Stripe session)
- Update checkout API route accordingly

**Acceptance:**
- Client cannot influence prices — only sends `{ id, quantity }[]`
- Stripe session uses server-looked-up prices
- Build passes

---

### PR 4 — Webhook Hardening
**Branch:** `ultimate/04-webhook-hardening`  
**Scope:**
- Add `stripe_events` idempotency check (INSERT … ON CONFLICT DO NOTHING)
- Wrap order status update + loyalty points award in a transaction
- Add structured logging to all webhook event handlers
- Handle `payment_intent.succeeded` for direct payment intents
- Return 200 early if event already processed

**Acceptance:**
- Replayed events are safely ignored
- Order update + points award are atomic
- Build passes

---

### PR 5 — Auth / RBAC + Secure Cookies
**Branch:** `ultimate/05-auth-rbac`  
**Scope:**
- Remove misleading `httpOnly: false` comment from proxy.ts
- Pass cookie options through unchanged (Supabase SSR defaults are correct)
- Add `isAdmin()` server helper checking `profiles.role` column
- Protect `/admin` API routes with admin check
- Review all cookie settings for Secure + SameSite

**Acceptance:**
- No `httpOnly: false` anywhere in the codebase
- Admin pages return 403 for non-admin users
- Build passes

---

### PR 6 — Security Baseline
**Branch:** `ultimate/06-security-baseline`  
**Scope:**
- Add CSRF / origin check on all mutation API routes
- Add rate limiting to auth endpoints (login, register, forgot-password)
- Add Content-Security-Policy header in next.config.ts
- Sanitize all user inputs in API routes using validators
- Review and harden Permissions-Policy

**Acceptance:**
- Cross-origin POST to API routes returns 403
- Brute-force login attempts are rate-limited
- Build passes

---

### PR 7 — Observability
**Branch:** `ultimate/07-observability`  
**Scope:**
- Upgrade `lib/logger.ts` to structured JSON with ISO timestamps + levels
- Add `x-request-id` propagation in proxy.ts
- Add `/api/health` endpoint (DB connectivity + uptime + version)
- Fix web-vitals endpoint mismatch (`/api/analytics` → `/api/vitals`)
- Add request logging in proxy.ts (method, path, status, duration)

**Acceptance:**
- `GET /api/health` returns `{ status: "ok", uptime, version }`
- All log lines are JSON-parseable with timestamp and level
- Build passes

---

### PR 8 — Performance + Caching
**Branch:** `ultimate/08-performance`  
**Scope:**
- Add `React.cache()` wrappers for Supabase queries used in server components
- Add revalidation tags for products, orders
- Review and optimize N+1 queries in admin dashboard
- Add loading skeleton components for key pages
- Configure `staleTimes` in next.config.ts if applicable

**Acceptance:**
- Products page uses cached server queries
- Admin dashboard makes ≤ 3 Supabase calls (not N+1)
- Build passes

---

### PR 9 — Data Lifecycle + Audit
**Branch:** `ultimate/09-data-lifecycle`  
**Scope:**
- Add `deleted_at` soft-delete column migration for orders
- Add audit log concept (SQL migration for `audit_log` table)
- Add cart expiry improvements (server-side validation)
- Add data retention documentation

**Acceptance:**
- Soft-delete migration SQL is valid
- Audit log table migration is valid
- Build passes

---

### PR 10 — Testing + Documentation Finalization
**Branch:** `ultimate/10-testing-docs`  
**Scope:**
- Install Vitest + React Testing Library
- Add test scripts to package.json
- Write critical-path tests: checkout flow, auth actions, rate limiter, validators
- Finalize all `docs/ultimate-update/*` files:
  - SECURITY.md, PAYMENTS.md, RLS.md, PERF.md, RUNBOOK.md, TESTING.md, CI.md, ARCHITECTURE.md
- Final build + test verification

**Acceptance:**
- `npm test` passes all tests
- All 8+ doc files are complete
- Build passes

---

## 3  Safety Checklist (enforced across all PRs)

| Rule | Verified In |
|------|-------------|
| No `httpOnly: false` anywhere | PR 5 |
| Server-truth pricing in checkout | PR 3 |
| Webhook signature verified with raw body | Already done ✅ |
| No secrets in client bundles | PR 2 |
| Rate limiting on abuse-prone endpoints | PR 6 |
| Idempotent webhook processing | PR 4 |
| Admin routes require role check | PR 5 |
| CSRF protection on mutations | PR 6 |
