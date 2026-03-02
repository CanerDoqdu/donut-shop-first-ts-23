<h1 align="center">🍩 Glazed & Sipped</h1>

<p align="center">
  <strong>Production-Grade Donut E-Commerce Platform</strong><br/>
  <sub>Next.js 16 · React 19 · TypeScript 5 · Supabase · Stripe · Tailwind 4</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.1.6-black?logo=nextdotjs" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Stripe-Payments-635BFF?logo=stripe&logoColor=white" alt="Stripe" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Tests-1227_passed-brightgreen?logo=vitest" alt="Tests" />
  <img src="https://img.shields.io/badge/Test_Files-85-brightgreen?logo=vitest" alt="Test Files" />
  <img src="https://img.shields.io/badge/CI-GitHub_Actions-2088FF?logo=githubactions&logoColor=white" alt="CI" />
  <img src="https://img.shields.io/badge/i18n-TR_|_EN-orange" alt="i18n" />
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License" />
  <img src="https://img.shields.io/badge/Node.js-20_LTS-339933?logo=nodedotjs&logoColor=white" alt="Node" />
</p>

---

## Architecture

```
                        ┌──────────────────────────────────┐
                        │          Client (React 19)       │
                        │  Zustand · next-intl · Framer    │
                        └───────────────┬──────────────────┘
                                        │ HTTPS
                        ┌───────────────▼──────────────────┐
                        │     Next.js 16 — Middleware       │
                        │  x-request-id · RBAC · i18n      │
                        │  CSP · HSTS · Feature Flags      │
                        ├──────────┬───────────┬───────────┤
                        │  Pages   │ API Routes│  Server   │
                        │  (SSR/   │ /api/*    │ Components│
                        │   SSG)   │           │ & Actions │
                        └──┬───────┴─────┬─────┴───┬───────┘
                           │             │         │
              ┌────────────▼──┐  ┌───────▼──┐  ┌──▼────────┐
              │   Supabase    │  │  Stripe  │  │  Resend   │
              │ Auth · PG+RLS │  │ Checkout │  │  Email    │
              │ Realtime      │  │ Webhooks │  │           │
              └───────────────┘  └──────────┘  └───────────┘
                                      │
                           ┌──────────▼──────────┐
                           │ Redis · BullMQ      │
                           │ Cache · Rate Limit  │
                           │ Background Jobs     │
                           └─────────────────────┘
```

### Request Lifecycle

1. **Middleware** (`proxy.ts`) — `x-request-id` generation, admin RBAC, cookie passthrough, next-intl locale routing, security headers (CSP, HSTS, X-Frame-Options)
2. **API Route** — CSRF origin validation → rate limiting (token-bucket) → input sanitisation → feature flag evaluation → server-truth pricing → telemetry events → structured logging
3. **Database** — Supabase client with Row-Level Security. Admin ops via `service_role` key. `React.cache()` deduplication
4. **Webhooks** — Stripe signature verification → `stripe_events` idempotency table → transactional RPC → audit log
5. **Background** — BullMQ workers for email, cleanup, order processing. Dead-letter queue for failed jobs

---

## Features

| Domain | Highlights |
|--------|-----------|
| **Commerce** | Product catalogue (bilingual TR/EN), category filtering, debounced search, cart (Zustand + localStorage + cross-tab sync, 2-day TTL), product variants (size/flavor/SKU), promo codes, Stripe Checkout Sessions, order lifecycle |
| **Auth & RBAC** | Email/password + Google OAuth, middleware admin guard, `admin_users` table, ABAC, token rotation, session anomaly detection |
| **Security** | CSRF origin check, token-bucket rate limiting, CSP + HSTS + security headers, input sanitisation, server-truth pricing, webhook signature + idempotency, password breach check |
| **Loyalty** | Points-per-purchase system (Bronze → Silver → Gold → Platinum), referral bonuses, point history |
| **Gift Cards** | Purchase, email delivery, balance checking, redemption at checkout |
| **Subscriptions** | Monthly donut box plans (Starter / Classic / Premium / Family), Stripe subscription management |
| **Store Locator** | Interactive Leaflet map, per-store inventory, delivery radius, opening hours |
| **Progressive Delivery** | Feature flags with deterministic hash bucketing (FNV-1a), percentage-based rollout (0-100%), A/B variant support |
| **Telemetry** | Typed product funnel events (view → cart → checkout → success/fail), guardrail metrics (checkout error rate, API latency p95), conversion rate computation |
| **Observability** | Structured JSON logger, `x-request-id` tracing, in-memory `MetricsCollector` (p50/p95/p99), Web Vitals (LCP/CLS/INP/FCP/TTFB), Sentry error/perf monitoring, SLO tracking, error budgets, alert engine |
| **Performance** | `React.cache()` deduplication, `Promise.all` parallel fetching, AVIF/WebP images, immutable caching, `next/dynamic` lazy loading, Lighthouse perf budgets, bundle analyzer |
| **i18n** | URL-based locale routing (`/tr`, `/en`), type-safe JSON message files via next-intl |
| **Data Lifecycle** | Soft-delete (`deleted_at`), append-only `audit_log`, GDPR data export + erasure, 1-year retention policy, PII masking in logs |
| **Background Jobs** | BullMQ queues (order processing, email, cron cleanup), dead-letter handling, queue reliability policies |
| **Load Testing** | k6 script with 3 scenarios (browse/search/checkout), 500 VU capacity, automated threshold checks |
| **Testing** | 1227 unit tests (Vitest) across 85 test files — security, rate-limiter, data, hooks, components, API, contracts, a11y, perf. 2 Playwright E2E specs |

---

## Quick Start

### Prerequisites

- **Node.js** 20+ · **npm** 10+
- [Supabase](https://supabase.com) project
- [Stripe](https://stripe.com) account
- [Redis](https://redis.io) instance (optional — for rate limiting & queues)

### Install

```bash
git clone https://github.com/CanerDoqdu/donut-shop-first-ts-23.git
cd donut-shop-first-ts-23
npm install
cp .env.example .env.local   # fill in your keys
```

### Environment Variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service-role key (server only) |
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret API key |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Stripe webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | — | Stripe publishable key |
| `RESEND_API_KEY` | ✅ | Resend email API key |
| `NEXT_PUBLIC_APP_URL` | — | Default `http://localhost:3000` |
| `NEXT_PUBLIC_SITE_URL` | — | Default `http://localhost:3000` |
| `CHECKOUT_ENABLED` | — | Set `false` to disable checkout (incident toggle) |
| `WEBHOOKS_ENABLED` | — | Set `false` to disable webhooks |

### Scripts

```bash
npm run dev           # Turbopack dev server (http://localhost:3000)
npm run build         # production build
npm run start         # production server
npm test              # 1227 tests
npm run test:watch    # watch mode
npm run test:coverage # v8 coverage report
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
ANALYZE=true npm run build  # bundle analysis
k6 run scripts/load-test.js # load test (requires k6)
```

---

## Database

### Migrations

Apply in Supabase SQL Editor in order (001–021). All migrations are **idempotent** — safe to re-run.

| # | File | Purpose |
|---|------|---------|
| 1 | `001_core_schema.sql` | Products, profiles, orders, order_items, indexes, RLS, triggers |
| 2 | `002_extended_features.sql` | Stores, loyalty, gift cards, subscriptions, reviews, referrals |
| 3 | `003_stores_seed.sql` | Store location seed data |
| 4 | `004_stripe_events.sql` | `stripe_events` idempotency + `process_payment_completed` RPC |
| 5 | `005_soft_delete_audit.sql` | `orders.deleted_at` soft-delete + `audit_log` table |
| 6–21 | `006_*` – `021_*` | Product variants, promo codes, inventory, email logs, security hardening, search indexes |

### Schema Overview

```
products ──────────┐
product_variants ──┤
profiles ──┐       │
           ├─ orders ──── order_items
           ├─ loyalty_points ── points_transactions
           ├─ gift_cards ── gift_card_transactions
           ├─ subscriptions ── subscription_deliveries
           ├─ referrals / referral_codes
           ├─ reviews ── review_helpful_votes
           └─ notifications
stores ── store_inventory
promo_codes · stock_reservations · email_logs
admin_users · analytics_events · stripe_events · audit_log
```

---

## Security

| Layer | Implementation |
|-------|---------------|
| **Headers** | CSP (`script-src 'self' stripe.com`), HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| **CSRF** | Origin / Referer validation on all mutation routes |
| **Rate Limit** | Token-bucket per endpoint (auth: 5/min, checkout: 5/min, gift-cards: 3/min) |
| **Auth** | Supabase Auth + middleware RBAC + `admin_users` + session anomaly detection + token rotation |
| **ABAC** | Attribute-based access control for fine-grained permissions |
| **Pricing** | Server-truth — client sends `{id, qty}[]`, server fetches prices from DB |
| **Webhooks** | Stripe signature verification + `stripe_events` idempotency + transactional RPC |
| **Input** | `sanitizeString()`, `sanitizePayload()`, `isValidEmail()`, `clampNumber()` |
| **Passwords** | Strength check + breached password database verification |
| **Data** | RLS on all tables, PII masking in logs, GDPR export/erasure, soft-delete + audit log |

→ Full details: [docs/SECURITY.md](docs/SECURITY.md) · [docs/THREAT-MODEL.md](docs/THREAT-MODEL.md) · [docs/GDPR.md](docs/GDPR.md)

---

## Progressive Delivery

### Feature Flags (`lib/feature-flags.ts`)

Deterministic percentage-based feature flag system with FNV-1a hash bucketing:

```typescript
import { isEnabled, getVariant } from '@/lib/feature-flags';

// Simple rollout check
if (isEnabled('new_checkout_ui', userId)) {
  // Show new UI for users in the rollout percentage
}

// A/B variant assignment
const variant = getVariant('checkout_flow', userId, ['control', 'experiment']);
```

| Feature | Description |
|---------|-------------|
| **Deterministic bucketing** | Same userId always gets same result (FNV-1a hash % 100) |
| **Percentage rollout** | Configure 0-100% traffic per flag |
| **Fail-closed** | Unknown flags return `false` |
| **Variant support** | Multi-variant experiments (A/B/C) |
| **Master switch** | `enabled: false` overrides any rollout percentage |

### Registered Flags

| Flag | Default | Description |
|------|---------|-------------|
| `new_checkout_ui` | 0% (off) | Canary rollout for redesigned checkout |
| `product_telemetry` | 100% (on) | Product funnel telemetry events |
| `enhanced_search` | disabled | Enhanced search with fuzzy matching |

---

## Telemetry & Observability

### Product Funnel (`lib/telemetry.ts`)

Typed funnel events with automatic conversion rate computation:

| Event | Trigger Point | Payload |
|-------|--------------|---------|
| `product_view` | Product page render | `{ productId }` |
| `add_to_cart` | Cart add hook | `{ productId, quantity }` |
| `checkout_started` | Checkout submit | `{ cartSize, cartTotal }` |
| `checkout_success` | Payment confirmed | `{ orderId, total }` |
| `checkout_failed` | Payment error | `{ error, step }` |

### Guardrail Metrics

| Metric | Threshold | Source |
|--------|-----------|--------|
| Checkout Error Rate | < 5% | `checkout_failed / total_checkouts` |
| API Latency p95 | < 2000ms | `MetricsCollector` |

### Metrics Collector (`lib/metrics.ts`)

| Metric | Type | Description |
|--------|------|-------------|
| `p50` / `p95` / `p99` / `max` | Latency (ms) | Per-endpoint response time percentiles |
| `errorRate` | Rate (0–1) | Errors / total requests per endpoint |
| Checkout outcomes | Counter | `success` / `timeout` / `validation_fail` / `error` |
| Web Vitals | Per-route | LCP, CLS, INP, FCP, TTFB |

→ [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md) · [docs/SLO.md](docs/SLO.md)

---

## Load Testing

k6 script at `scripts/load-test.js` with 3 traffic scenarios:

```bash
k6 run scripts/load-test.js
k6 run --env BASE_URL=https://staging.example.com scripts/load-test.js
```

| Threshold | Target |
|-----------|--------|
| Overall p95 | < 2000ms |
| Browse p95 | < 500ms |
| Search p95 | < 1000ms |
| Checkout p95 | < 500ms |
| Error rate | < 1% |

→ [docs/LOAD-TEST-REPORT.md](docs/LOAD-TEST-REPORT.md)

---

## Testing

| Category | Files | Tests | Tools |
|----------|:-----:|:-----:|-------|
| **Unit (lib)** | 56 | ~900 | Vitest |
| **API** | 6 | ~80 | Vitest + mock fetch |
| **Components** | 10 | ~60 | Vitest + Testing Library |
| **Hooks** | 7 | ~50 | Vitest + renderHook |
| **Store** | 1 | ~15 | Vitest |
| **Contract** | 2 | ~20 | Vitest (response schema) |
| **Accessibility** | 2 | ~30 | Vitest (ARIA + WCAG) |
| **Security** | 1 | ~15 | Vitest (incident sim) |
| **Performance** | 1 | ~10 | Vitest (dynamic imports) |
| **E2E** | 2 | — | Playwright |
| **Total** | **85+** | **1227** | — |

```bash
npm test              # all tests
npm run test:coverage # with V8 coverage
```

→ [docs/TESTING.md](docs/TESTING.md)

---

## CI/CD

```
  Lint ──┐
  Type ──┼── Build (PR-safe) ── Bundle Analysis (PR only)
  Test ──┘
         └── Build (Real Secrets, main only) ── Vercel Deploy
  Audit ──── (non-blocking)
```

→ [docs/CI.md](docs/CI.md) · [docs/DEPLOY-CHECKLIST.md](docs/DEPLOY-CHECKLIST.md)

---

## Project Structure

```
app/
  [locale]/            i18n pages (tr/en) — 18 routes
  api/                 20 API route handlers
components/
  admin/ home/ layout/ ui/ stores/ loyalty/ giftcards/ subscriptions/ referrals/
lib/
  auth/ stripe/ supabase/ redis/ queue/
  feature-flags.ts  telemetry.ts  metrics.ts  logger.ts  alerts.ts
  config.ts  env.ts  types.ts  security.ts  rate-limit.ts  ...40+ modules
hooks/
  use-add-to-cart  use-checkout-submit  use-form-validation  ...10 hooks
store/
  cart-store.ts         Zustand (localStorage + cross-tab sync)
i18n/
  messages/             tr.json, en.json
supabase/
  migrations/           21 idempotent SQL files
tests/                  86+ test files (1227 tests)
e2e/                    2 Playwright specs
docs/                   33 documentation files + 5 ADRs
scripts/
  load-test.js          k6 load test (500 VU)
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE](docs/ARCHITECTURE.md) | System design, request flow, key decisions |
| [SECURITY](docs/SECURITY.md) | CSRF, rate limiting, CSP, auth, webhooks |
| [PAYMENTS](docs/PAYMENTS.md) | Stripe integration, checkout flow |
| [OBSERVABILITY](docs/OBSERVABILITY.md) | Metrics, alerts, dashboards |
| [LOAD-TEST-REPORT](docs/LOAD-TEST-REPORT.md) | k6 capacity planning report |
| [RLS](docs/RLS.md) | Row Level Security per table |
| [PERF](docs/PERF.md) | Caching, React.cache(), images |
| [TESTING](docs/TESTING.md) | Test strategy, coverage |
| [CI](docs/CI.md) | Pipeline, secrets, jobs |
| [RUNBOOK](docs/RUNBOOK.md) | Health checks, troubleshooting |
| [DEPLOY-CHECKLIST](docs/DEPLOY-CHECKLIST.md) | Pre-deploy validation |
| [SLO](docs/SLO.md) | Service Level Objectives |
| [GDPR](docs/GDPR.md) | Data privacy compliance |
| [THREAT-MODEL](docs/THREAT-MODEL.md) | Security threat analysis |
| [ROLLBACK](docs/ROLLBACK.md) | Rollback procedures |

→ Full list: [docs/](docs/) (33 files) · [docs/adr/](docs/adr/) (5 ADRs)

---

## Deployment

```bash
vercel deploy --prod
```

1. Set all required env vars in Vercel dashboard
2. Apply database migrations (001–021) in Supabase SQL Editor
3. Configure Stripe webhook → `https://your-domain/api/webhooks/stripe`
4. Seed `admin_users` table for admin access
5. Verify `/api/health` → `{ "status": "ok" }`
6. Verify feature flags: `product_telemetry` should be active

→ [docs/DEPLOY-CHECKLIST.md](docs/DEPLOY-CHECKLIST.md) · [docs/ROLLBACK.md](docs/ROLLBACK.md)

---

## License

MIT
