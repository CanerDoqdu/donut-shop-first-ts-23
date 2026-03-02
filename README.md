<h1 align="center">Glazed & Sipped</h1>

<p align="center">
  <strong>Production-grade e-commerce platform</strong><br/>
  <sub>Next.js 16 · React 19 · Supabase · Stripe</sub>
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
  <img src="https://img.shields.io/badge/Tests-41_passed-brightgreen?logo=vitest" alt="Tests" />
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
```

### Request Lifecycle

1. **Middleware** (`proxy.ts`) — `x-request-id` generation, admin RBAC, cookie passthrough, next-intl locale routing
2. **API Route** — CSRF origin validation → rate limiting → input sanitisation → server-truth pricing → structured logging
3. **Database** — Supabase client with RLS. Admin ops via `service_role` key
4. **Webhooks** — Stripe signature → `stripe_events` idempotency → transactional RPC → structured logs

---

## Features

| Domain | Highlights |
|--------|-----------|
| **Commerce** | Product catalogue, category filter, debounced search, cart (2-day TTL), Stripe Checkout, order lifecycle |
| **Auth & RBAC** | Email/password + Google OAuth, middleware admin guard, `admin_users` table |
| **Security** | CSRF origin check, rate limiting, CSP + HSTS, input sanitisation, server-truth pricing, webhook idempotency |
| **Loyalty** | Points per purchase (Bronze → Platinum), referral bonuses, gift card purchase & redemption |
| **Subscriptions** | Monthly donut box plans (Starter / Classic / Premium / Family) |
| **Observability** | Structured JSON logger, `x-request-id` tracing, `/api/health` probe, Web Vitals |
| **Performance** | `React.cache()` deduplication, `Promise.all` batching, AVIF/WebP, immutable caching |
| **i18n** | URL-based locale routing (`/tr`, `/en`), type-safe JSON message files |
| **Data Lifecycle** | Soft-delete (`deleted_at`), `audit_log` table, 1-year retention policy |
| **Testing** | 41 unit tests (Vitest) — security, rate-limiter, data helpers |

---

## Quick Start

### Prerequisites

- **Node.js** 20+ · **npm** 10+
- [Supabase](https://supabase.com) project
- [Stripe](https://stripe.com) account

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

### Scripts

```bash
npm run dev           # Turbopack dev server
npm run build         # production build
npm run start         # production server
npm test              # 41 tests
npm run test:watch    # watch mode
npm run test:coverage # v8 coverage
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
ANALYZE=true npm run build  # bundle analysis
```

---

## Database

### Migrations

Apply in Supabase SQL Editor in order:

| # | File | Purpose |
|---|------|---------|
| 1 | `supabase/migrations/001_core_schema.sql` | Products, profiles, orders, order_items, indexes, RLS, triggers |
| 2 | `supabase/migrations/002_extended_features.sql` | Stores, loyalty, gift cards, subscriptions, reviews, referrals |
| 3 | `supabase/migrations/003_stores_seed.sql` | Store location seed data |
| 4 | `supabase/migrations/004_stripe_events.sql` | `stripe_events` idempotency + `process_payment_completed` RPC |
| 5 | `supabase/migrations/005_soft_delete_audit.sql` | `orders.deleted_at` soft-delete + `audit_log` table |

All migrations are **idempotent** — safe to re-run.

### Schema

```
products ──────────┐
profiles ──┐       │
           ├─ orders ──── order_items
           ├─ loyalty_points ── points_transactions
           ├─ gift_cards ── gift_card_transactions
           ├─ subscriptions ── subscription_deliveries
           ├─ referrals / referral_codes
           ├─ reviews ── review_helpful_votes
           └─ notifications
stores ── store_inventory
admin_users · analytics_events · stripe_events · audit_log
```

---

## Security

| Layer | Implementation |
|-------|---------------|
| **CSRF** | Origin / Referer validation on mutation routes |
| **Rate Limit** | Token-bucket (auth: 5/min, checkout: 5/min, gift-cards: 3/min) |
| **CSP** | `script-src 'self' stripe.com`, `frame-ancestors 'none'`, `object-src 'none'` |
| **Headers** | HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| **Auth** | Supabase Auth + middleware RBAC + `admin_users` table |
| **Pricing** | Server-truth — client sends `{id, qty}[]`, prices from `lib/data.ts` |
| **Webhooks** | Stripe signature + `stripe_events` idempotency + transactional RPC |
| **Input** | `sanitizeString()`, `sanitizePayload()`, `isValidEmail()`, `clampNumber()` |

→ [docs/SECURITY.md](docs/SECURITY.md)

---

## Testing

| Suite | Tests | Coverage |
|-------|:-----:|----------|
| `security.test.ts` | 20 | sanitizeString, sanitizePayload, isValidEmail, clampNumber |
| `rate-limit.test.ts` | 10 | rateLimit, getClientIP, token refill, blocking |
| `data.test.ts` | 11 | getProductById, getProductsByIds, data integrity |

→ [docs/TESTING.md](docs/TESTING.md)

---

## CI/CD

```
  Lint ──┐
  Type ──┼── Build (PR-safe) ── Bundle Analysis (PR only)
  Test ──┘
         └── Build (Real Secrets, main only)
  Audit ──── (non-blocking)
```

→ [docs/CI.md](docs/CI.md)

---

## Project Structure

```
app/
  [locale]/            i18n pages (tr/en)
  api/                 Route handlers (checkout, webhooks, health, vitals)
components/
  admin/ home/ layout/ ui/
lib/
  auth/    stripe/    supabase/
  data.ts  env.ts     logger.ts    queries.ts
  rate-limit.ts       security.ts  types.ts
store/
  cart-store.ts        Zustand (localStorage)
supabase/
  migrations/          Ordered, idempotent SQL
tests/
  lib/                 Unit tests
docs/
  ARCHITECTURE · SECURITY · PAYMENTS · RLS · PERF · RUNBOOK · TESTING · CI
```

---

## Docs

| Document | Description |
|----------|-------------|
| [ARCHITECTURE](docs/ARCHITECTURE.md) | System design, request flow, key decisions |
| [SECURITY](docs/SECURITY.md) | CSRF, rate limiting, CSP, auth, webhooks |
| [PAYMENTS](docs/PAYMENTS.md) | Stripe integration, checkout flow, webhooks |
| [RLS](docs/RLS.md) | Row Level Security per table |
| [PERF](docs/PERF.md) | Caching, React.cache(), images, indexes |
| [RUNBOOK](docs/RUNBOOK.md) | Health checks, troubleshooting, deployment |
| [TESTING](docs/TESTING.md) | Vitest setup, writing tests, coverage |
| [CI](docs/CI.md) | Pipeline, secrets, jobs |

---

## Deployment

```bash
vercel deploy --prod
```

1. Set env vars in Vercel dashboard
2. Apply database migrations
3. Configure Stripe webhook → `https://your-domain/api/webhooks/stripe`
4. Seed `admin_users` table
5. Verify `/api/health` → `{ "status": "ok" }`

---

## License

MIT
# test
