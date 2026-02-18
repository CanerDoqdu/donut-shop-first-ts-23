# 🍩 Donut Shop — Full-Stack E-Commerce Platform

Production-grade e-commerce application built with **Next.js 16**, **React 19**, **Supabase**, and **Stripe**. Features internationalisation, loyalty program, real-time monitoring, and CI/CD pipeline.

**Live Demo:** [donut-shop.vercel.app](https://donut-shop.vercel.app)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Client (React 19)                  │
│  ┌──────────┐  ┌───────────┐  ┌────────────────────┐   │
│  │ Zustand   │  │ next-intl │  │ Framer Motion      │   │
│  │ Cart Store│  │ i18n (TR/ │  │ Animations         │   │
│  │ (persist) │  │ EN)       │  │                    │   │
│  └──────────┘  └───────────┘  └────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│                   Next.js 16 App Router                 │
│  ┌──────────┐  ┌───────────┐  ┌────────────────────┐   │
│  │Middleware │  │ API Routes│  │ Server Components  │   │
│  │Auth+i18n  │  │ /api/*    │  │ SSR / SSG          │   │
│  └──────────┘  └───────────┘  └────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│                   External Services                     │
│  ┌──────────────┐  ┌──────────┐  ┌────────────────┐    │
│  │ Supabase     │  │ Stripe   │  │ Resend         │    │
│  │ Auth + DB    │  │ Payments │  │ Transactional  │    │
│  │ (PostgreSQL) │  │ Webhooks │  │ Emails         │    │
│  └──────────────┘  └──────────┘  └────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 16 (App Router) | SSR, SSG, API routes, middleware |
| UI | React 19, Tailwind CSS 4 | Component architecture, utility-first styling |
| State | Zustand 5 | Client-side cart with localStorage persistence |
| Auth | Supabase Auth | Email/password, Google OAuth, session management |
| Database | Supabase (PostgreSQL) | Products, orders, profiles, loyalty, gift cards |
| Payments | Stripe | Checkout sessions, webhooks, gift card payments |
| i18n | next-intl 4 | URL-based locale routing (TR/EN) |
| Animation | Framer Motion | Page transitions, micro-interactions |
| Email | Resend | Transactional emails (order confirmation, gift cards) |
| Monitoring | Web Vitals | LCP, CLS, INP, FCP, TTFB tracking |
| CI/CD | GitHub Actions | Lint → Type-check → Build pipeline |

## Features

### Core Commerce
- Product catalogue with category filtering and **debounced search** (300ms)
- Shopping cart with 2-day localStorage persistence and hydration guards
- Stripe Checkout integration with webhook order confirmation
- Order history with status tracking (pending → paid → preparing → shipped → delivered)

### Authentication & Security
- Email/password + Google OAuth via Supabase Auth
- Singleton browser client (prevents GoTrue listener leaks)
- Row-Level Security (RLS) on all database tables
- Protected routes enforced at middleware level
- Security headers: HSTS, X-Frame-Options, CSP directives, Referrer-Policy

### Loyalty & Engagement
- Points-per-purchase loyalty system (Bronze → Silver → Gold → Platinum)
- Referral program with bonus points
- Gift card purchase, email delivery, and redemption
- Subscription box plans with recurring billing

### Performance
- Image optimisation: AVIF/WebP with 1-year cache, shimmer placeholders, fade-in transitions
- Font loading: `display: swap`, self-hosted via `next/font/google`
- Debounced search inputs prevent unnecessary re-renders
- Web Vitals monitoring (LCP, CLS, INP, FCP, TTFB) with console + beacon reporting
- Bundle analysis via `@next/bundle-analyzer`

### Internationalisation
- URL-based locale routing (`/tr/...`, `/en/...`)
- Type-safe translations with JSON message files
- Middleware-based locale detection and redirect

### Admin
- Product CRUD with inventory management
- Order management dashboard
- Inventory stats and analytics

---

## Project Structure

```
├── .github/workflows/     # CI/CD pipeline (lint → typecheck → build)
├── app/
│   ├── [locale]/          # Internationalised routes (TR/EN)
│   │   ├── products/      # Product catalogue + detail pages
│   │   ├── cart/           # Shopping cart
│   │   ├── checkout/       # Stripe checkout
│   │   ├── orders/         # Order history + detail
│   │   ├── loyalty/        # Loyalty dashboard
│   │   ├── gift-cards/     # Gift card purchase
│   │   ├── subscriptions/  # Subscription plans
│   │   ├── referrals/      # Referral program
│   │   ├── admin/          # Admin dashboard + CRUD
│   │   ├── login/          # Auth pages
│   │   └── register/
│   ├── api/
│   │   ├── auth/           # OAuth callback
│   │   ├── checkout/       # Stripe session creation
│   │   ├── email/          # Transactional emails
│   │   ├── vitals/         # Web Vitals beacon endpoint
│   │   └── webhooks/       # Stripe webhook handler
│   └── offline/            # PWA offline fallback
├── components/
│   ├── home/               # Hero showcase, donut conveyor
│   ├── layout/             # Header, Footer, PromoBanner
│   ├── monitoring/         # WebVitals, ErrorBoundary
│   ├── shared/             # Reusable error boundary
│   └── ui/                 # Design system primitives
├── docs/
│   └── adr/                # Architecture Decision Records
├── hooks/                  # Custom React hooks (useDebounce, useMounted, useMediaQuery)
├── i18n/
│   ├── messages/           # Translation JSON files
│   └── routing.ts          # Locale routing config
├── lib/
│   ├── auth/               # Auth actions + context provider
│   ├── config.ts           # Environment variable validation
│   ├── constants.ts        # App-wide constants (no magic numbers)
│   ├── data.ts             # Sample product data
│   ├── rate-limit.ts       # Token-bucket rate limiter
│   ├── stripe/             # Stripe server utilities
│   ├── supabase/           # Singleton client + server client
│   ├── types.ts            # TypeScript type definitions
│   ├── utils.ts            # Utility functions (cn, formatPrice)
│   └── validators.ts       # Input validation helpers
├── store/                  # Zustand stores
├── middleware.ts           # Auth session refresh + i18n routing
└── next.config.ts          # Image opts, security headers, caching
```

### Key Engineering Decisions

All major architecture decisions are documented as [ADRs](docs/adr/):

| ADR | Decision |
|-----|----------|
| [001](docs/adr/001-zustand-state-management.md) | Zustand for client state (vs Context/Redux) |
| [002](docs/adr/002-internationalisation.md) | next-intl for i18n routing |
| [003](docs/adr/003-supabase-auth.md) | Supabase Auth with singleton pattern |
| [004](docs/adr/004-performance-strategy.md) | Multi-layered performance strategy |

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm 10+
- Supabase project ([supabase.com](https://supabase.com))
- Stripe account ([stripe.com](https://stripe.com))

### Installation

```bash
git clone https://github.com/CanerDoqdu/donut-shop-first-ts-23.git
cd donut-shop-first-ts-23
npm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Development

```bash
npm run dev        # Start dev server (Turbopack)
npm run build      # Production build
npm run lint       # ESLint
npx tsc --noEmit   # Type-check
ANALYZE=true npm run build  # Bundle analysis
```

---

## Database Setup

Run the SQL scripts in your Supabase dashboard:

1. `supabase/schema.sql` — Core tables (profiles, products, orders)
2. `supabase/schema-extended.sql` — Extended tables (loyalty, gift cards, referrals)
3. `scripts/create-stores-table.sql` — Store locations

## CI/CD

GitHub Actions pipeline runs on every push/PR to `main`:

```
Lint → Type-check → Build
```

Configure these GitHub repository secrets:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`

## Deployment

```bash
vercel deploy --prod
```

Set environment variables in the Vercel dashboard and configure the Stripe webhook URL to `https://your-domain.com/api/webhooks/stripe`.

## License

MIT
