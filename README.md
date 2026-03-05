# Glazed & Sipped — Donut E-Commerce Platform

Production-grade, bilingual (TR/EN) donut e-commerce platform. Multi-store catalog with loyalty programs, gift cards, subscriptions, referral system, and a full admin panel — backed by Stripe payments, Supabase (PostgreSQL + RLS), and defense-in-depth security architecture.

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.1.6 |
| UI | React (Server + Client Components) | 19.2.3 |
| Language | TypeScript | 5.x |
| Database | Supabase (PostgreSQL, Auth, Realtime, RLS) | 2.95 |
| Payments | Stripe (Checkout Sessions, Webhooks) | 20.3 |
| State | Zustand (persist + cross-tab sync) | 5.0 |
| Styling | Tailwind CSS | 4.x |
| i18n | next-intl (URL-based `/tr`, `/en`) | 4.8 |
| Validation | Zod | 4.3 |
| Queue | BullMQ + ioredis | 5.69 |
| Cache / Rate Limit | Upstash Redis | 1.36 |
| Email | Resend | 6.9 |
| Monitoring | Sentry | 10.40 |
| Animation | Framer Motion | 12.x |
| Maps | Leaflet + react-leaflet | — |
| Testing | Vitest 4 / Playwright 1.58 | — |
| CI | GitHub Actions | — |

## Quality Snapshot

| Metric | Value |
|--------|-------|
| Test files | 94 |
| Line coverage | 73.17 % |
| Statement coverage | 71.96 % |
| Migrations | 26 (001 → 022) |
| Operational docs | 35 |
| Typecheck | passing |
| Build | passing |
| Lighthouse a11y gate | ≥ 0.90 |

## Architecture

```
Browser (React 19, Zustand, Framer Motion, next-intl)
   │
   ▼
Middleware (proxy.ts)
   • x-request-id propagation
   • Locale routing (TR / EN)
   • Admin RBAC guard
   • Security headers (CSP, HSTS, X-Frame-Options)
   │
   ├──▶ API Routes (app/api/*)
   │      withHandler() — unified error, CSRF, rate-limit contract
   │      validateOrigin() · rateLimit() · input sanitization
   │
   ├──▶ Supabase  (PostgreSQL + RLS on every table)
   ├──▶ Stripe    (Checkout Sessions + signed Webhook ingestion)
   ├──▶ Redis     (cache, token-bucket rate limiter, BullMQ jobs)
   ├──▶ Resend    (transactional email)
   └──▶ Sentry    (error tracking, performance traces)
```

### Key Domain Modules

| Module | Path | Scope |
|--------|------|-------|
| Catalog & Variants | `app/api/products`, `lib/inventory.ts` | Product CRUD, search, stock management |
| Cart | `store/cart-store.ts` | Zustand — localStorage persist, cross-tab sync |
| Checkout | `app/api/checkout`, `hooks/use-checkout-*` | Stripe session creation, double-submit guard, checkout trace |
| Orders | `app/api/webhooks/stripe` | Webhook → order fulfillment, idempotency via `stripe_events` |
| Auth | `lib/auth/`, `app/api/auth` | Supabase Auth, token rotation, session anomaly detection |
| Admin | `app/[locale]/admin`, `app/api/admin` | Dashboard, queue monitor, ABAC policy engine |
| Loyalty | `app/[locale]/loyalty`, `components/loyalty/` | Points, tiers, transaction history |
| Gift Cards | `app/[locale]/gift-cards`, `app/api/gift-card` | Purchase, redeem, balance lookup |
| Subscriptions | `app/[locale]/subscriptions` | Recurring plans, Stripe subscription lifecycle |
| Referrals | `app/[locale]/referrals` | Referral links, bonus tracking |
| Store Locator | `app/[locale]/stores`, `components/stores/` | Leaflet map, delivery radius |
| Reviews | `app/api/reviews` | Rating, moderation pipeline |
| GDPR | `app/api/user` | Data export, account deletion |

## Security

Five-layer defense model — details in `docs/SECURITY.md` and `docs/THREAT-MODEL.md`.

| Layer | Controls |
|-------|----------|
| Network | CSP, HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, Permissions-Policy |
| Authentication | Supabase JWT, token rotation, session anomaly detection, breach-DB password check |
| Authorization | ABAC engine (`lib/abac.ts`), admin RBAC in middleware, RLS on all tables |
| API | CSRF origin validation, token-bucket rate limiting, server-truth pricing, idempotency keys |
| Data | Audit log (append-only), soft-delete, PII masking in logs, Stripe webhook signature verification |

## Repository Layout

```
app/                  Pages (App Router) + API route handlers
components/           UI primitives, feature components, skeletons
hooks/                Client-side hooks (cart, checkout, forms, realtime)
lib/                  Business logic, security, integrations (40+ modules)
store/                Zustand stores
i18n/                 Locale config + message bundles (tr.json, en.json)
supabase/migrations/  26 SQL migrations with RLS policies
tests/                94 test files — unit, integration, contract, a11y, security, perf
e2e/                  Playwright — smoke + visual regression
docs/                 35 operational documents, ADRs, runbooks
scripts/              Automation (migrations, redis verify, load test)
```

## Getting Started

### Prerequisites

- Node.js 20+, npm 10+
- Supabase project (Postgres + Auth)
- Stripe account (test mode)
- Resend API key
- Optional: Upstash Redis (distributed rate limits + cache)

### Install & Run

```bash
npm install
cp .env.example .env.local   # fill in your keys
npm run dev                   # http://localhost:3000
```

### Required Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
RESEND_API_KEY
```

Optional (recommended for production):

```
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SITE_URL
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript strict check |
| `npm test` | Vitest (all suites) |
| `npm run test:coverage` | Coverage report |
| `npm run test:e2e` | Playwright E2E |
| `npm run analyze` | Bundle analyzer |
| `npm run test:load` | k6 load test |

### Pre-push Validation

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

## Docker

Multi-stage Dockerfile (deps → build → runner) with standalone output. Compose includes Redis sidecar.

```bash
docker compose up --build
```

## CI / CD

GitHub Actions pipeline:

1. **Lint** → ESLint
2. **Typecheck** → `tsc --noEmit`
3. **Test** → Vitest (coverage gate via Codecov, threshold 2 %)
4. **Build** → Next.js production build
5. **Lighthouse** → Performance ≥ 0.85, Accessibility ≥ 0.90, SEO ≥ 0.85
6. **E2E** → Playwright smoke
7. **Container** → Docker build verification
8. **Load test** → k6 (triggered by `ci:load` label)

## Database

26 sequential migrations under `supabase/migrations/`. All tables enforce RLS. Key hardening migrations:

- `021_fix_admin_rls_and_signup_trigger.sql`
- `022_harden_admin_role_boundary.sql`

Schema covers: `products`, `product_variants`, `orders`, `order_items`, `profiles`, `stores`, `store_inventory`, `loyalty_points`, `gift_cards`, `subscriptions`, `reviews`, `referrals`, `stripe_events`, `audit_log`.

## Observability

- **Structured logging** — JSON logger with request-id correlation
- **Sentry** — error tracking + performance traces (client, server, edge configs)
- **Telemetry** — product funnel events (view → cart → checkout → purchase)
- **Metrics** — in-memory p50/p95/p99 latency collector
- **SLO** — checkout p99 < 10 s, error rate < 5 %, defined in `lib/slo.ts`
- **Alerts** — configurable rules in `lib/alerts.ts`
- **Cache observability** — hit/miss ratio tracking (`lib/cache-observability.ts`)

## Documentation Index

| Topic | File |
|-------|------|
| Architecture | `docs/ARCHITECTURE.md` |
| Security audit | `docs/SECURITY-AUDIT-REPORT.md` |
| Threat model | `docs/THREAT-MODEL.md` |
| RLS policies | `docs/RLS.md` |
| GDPR | `docs/GDPR.md` |
| Payments | `docs/PAYMENTS.md` |
| Queue reliability | `docs/QUEUE-RELIABILITY.md` |
| Observability | `docs/OBSERVABILITY.md` |
| Performance | `docs/PERF.md` |
| Load test report | `docs/LOAD-TEST-REPORT.md` |
| Deploy checklist | `docs/DEPLOY-CHECKLIST.md` |
| Rollback | `docs/ROLLBACK.md` |
| Runbook | `docs/RUNBOOK.md` |
| Incident severity | `docs/INCIDENT-SEVERITY.md` |
| Testing strategy | `docs/TESTING.md` |
| Cache policy | `docs/CACHE-POLICY.md` |
| CI | `docs/CI.md` |
| ADRs | `docs/adr/` |

## License

Private repository — all rights reserved.

## Contribution Workflow

Expected baseline before opening a PR:

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

Review standards:
- `docs/PR-REVIEW-RUBRIC.md`
- `docs/TESTING.md`

## Notes on Repository Rename

Repository name changes on GitHub are safe for application runtime.
Only references to repository URL may need updating in:
- badges
- CI status links
- docs that include clone URLs

No runtime code path depends on the repository slug.

## License

MIT
