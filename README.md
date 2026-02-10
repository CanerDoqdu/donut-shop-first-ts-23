# Donut Shop

Full-stack e-commerce application for a donut shop with payments, authentication, and loyalty system.

**Live Demo:** [donut-shop.vercel.app](https://donut-shop.vercel.app)

## Tech Stack

- Next.js 16 (App Router)
- React 19, TypeScript
- Tailwind CSS 4
- Supabase (Auth + PostgreSQL)
- Stripe Payments
- Zustand (State)
- next-intl (i18n)
- Framer Motion

## Features

**Core**
- Product catalog with category filtering
- Shopping cart with persistence
- Stripe checkout integration
- Order history and tracking

**Auth**
- Email/password authentication
- Google and X (Twitter) OAuth
- Protected routes via middleware

**Loyalty System**
- Points earned per purchase
- Tier levels (Bronze → Platinum)
- Referral bonuses
- Gift card purchase and redemption

**Other**
- Multi-language support (TR/EN)
- Subscription box plans
- Admin dashboard
- Mobile responsive

## Getting Started

```bash
git clone https://github.com/CanerDoqdu/donut-shop-first-ts-23.git
cd donut-shop-first-ts-23
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

GOOGLE_CLIENT_ID=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

```bash
npm run dev
```

## Project Structure

```
app/
├── [locale]/          # TR/EN routes
│   ├── products/      # Product pages
│   ├── cart/          # Cart
│   ├── checkout/      # Checkout flow
│   ├── orders/        # Order history
│   ├── loyalty/       # Loyalty program
│   ├── gift-cards/    # Gift cards
│   └── admin/         # Admin panel
├── api/
│   ├── auth/          # OAuth handlers
│   ├── checkout/      # Stripe sessions
│   └── webhooks/      # Stripe webhooks
components/
├── layout/            # Header, Footer
├── product/           # Product components
├── cart/              # Cart components
└── ui/                # Shared UI
lib/
├── supabase/          # DB client
└── stripe/            # Payment utils
store/                 # Zustand stores
i18n/messages/         # Translations
```

## Database

Main tables:
- `profiles` - User data, loyalty tier
- `products` - Product catalog
- `orders` / `order_items` - Order data
- `loyalty_points` - Point transactions
- `gift_cards` - Gift card codes
- `referrals` - Referral tracking
- `subscriptions` - Subscription plans

## Deploy

```bash
npm run build
vercel deploy
```

Set environment variables in Vercel dashboard and configure Stripe webhook URL.

## License

MIT
