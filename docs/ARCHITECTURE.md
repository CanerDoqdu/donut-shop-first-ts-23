# Architecture Overview

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1.6 (App Router, Turbopack) |
| Language | TypeScript 5 (strict mode) |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| Payments | Stripe Checkout Sessions |
| Email | Resend |
| Styling | Tailwind CSS 4 |
| State | Zustand (client cart) |
| i18n | next-intl (tr/en) |
| CI | GitHub Actions |
| Testing | Vitest + React Testing Library |

## Directory Structure

```
app/
  [locale]/          → i18n routed pages (tr/en)
    admin/           → Admin dashboard, orders, products
    auth/            → Auth callback, password reset
    cart/            → Shopping cart
    checkout/        → Checkout flow
    products/        → Product listing + detail [slug]
    orders/          → Order history + detail [id]
    ...
  api/               → Route handlers (REST endpoints)
    auth/callback/   → OAuth callback
    checkout/        → Checkout session creation
    email/           → Email sending (Resend)
    webhooks/stripe/ → Stripe webhook processing
    health/          → Liveness probe
    vitals/          → Web Vitals ingestion
components/
  admin/             → AdminDashboard, InventoryManager
  home/              → Hero showcase, donut conveyor
  layout/            → Header, Footer, PromoBanner
  ui/                → Design system primitives (Button, Card, etc.)
  monitoring/        → Web Vitals reporter
lib/
  auth/              → Server actions (signIn, signUp, etc.) + admin helpers
  stripe/            → Stripe server utilities
  supabase/          → Supabase client/server factories
  data.ts            → Product data (in-memory catalog)
  env.ts             → Centralized env validation
  logger.ts          → Structured JSON logger
  queries.ts         → React.cache() server query wrappers
  rate-limit.ts      → Token bucket rate limiter
  security.ts        → CSRF, sanitization, validators
  types.ts           → Shared TypeScript types
store/
  cart-store.ts      → Zustand cart with localStorage persistence
i18n/
  messages/          → en.json, tr.json translation files
  routing.ts         → Locale routing config
scripts/
  *.sql              → Database migration scripts
supabase/
  schema.sql         → Core database schema
  schema-extended.sql → Extended tables (loyalty, referrals, etc.)
```

## Request Flow

```
Client → Middleware (proxy.ts)
  ├─ x-request-id injection
  ├─ Admin RBAC check (isAdminPath → requireAdmin)
  ├─ Cookie passthrough to Supabase
  └─ next-intl locale routing

API Route Handler
  ├─ CSRF origin validation (validateOrigin)
  ├─ Rate limiting (rateLimit)
  ├─ Input sanitization (sanitizeString)
  ├─ Server-truth pricing (getProductsByIds)
  └─ Supabase/Stripe operations
```

## Key Design Decisions

1. **Server-truth pricing**: Client sends only `{ id, quantity }[]`. All prices looked up server-side.
2. **In-memory product catalog**: `lib/data.ts` avoids DB round-trip for static product data.
3. **React.cache() deduplication**: `lib/queries.ts` prevents duplicate Supabase calls in same request.
4. **Token bucket rate limiting**: In-memory, suitable for single-instance. Swap to Redis for multi-instance.
5. **Soft-delete pattern**: `orders.deleted_at` column with partial index for active records.
6. **Structured logging**: JSON format with service/requestId/level for log aggregation.
