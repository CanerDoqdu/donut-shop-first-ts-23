# Performance & Caching

## Server-Side Caching

### Two-Layer Cache Architecture (`lib/queries.ts`)

Every server query passes through two cache layers:

1. **`React.cache()`** — deduplicates identical calls within a single server render (same request).
2. **`unstable_cache()` + tags** — cross-request data cache persisted by Next.js; invalidated on-demand via `revalidateTag()`.

| Function | Cache Key | Tags | TTL |
|----------|-----------|------|-----|
| `getProducts()` | `products-all` | `products` | 300 s |
| `getFeaturedProducts()` | `products-featured` | `products` | 300 s |
| `getProductBySlug(slug)` | `product-<slug>` | `products`, `product:<slug>` | 300 s |
| `getOrdersByUser(userId)` | `orders-user-<id>` | `orders`, `orders:user:<id>` | 60 s |
| `getOrderById(orderId)` | `order-<id>` | `orders`, `order:<id>` | 60 s |
| `getAdminDashboardData()` | `admin-dashboard` | `admin-dashboard`, `orders` | 120 s |

### Cache Tag Registry (`lib/cache-tags.ts`)

Centralised tag constants + builder functions. See [ADR-005](adr/005-cache-strategy.md) for the full design rationale.

```ts
import { revalidateTag } from 'next/cache';
import { TAG_PRODUCTS, productTag } from '@/lib/cache-tags';

// Bust all product caches
revalidateTag(TAG_PRODUCTS);

// Bust a single product
revalidateTag(productTag('chocolate-dream'));
```

### Admin Dashboard N+1 Fix
Before: 6 sequential Supabase queries (waterfall)
After: Single `Promise.all` batch — all 6 queries execute in parallel

### In-Memory Product Catalog
`lib/data.ts` serves product data from a static array. Zero database round-trips for product lookups during checkout.

## CDN Cache-Control Policy

| Route Pattern | Header |
|---------------|--------|
| Static assets (img/js/css/fonts) | `max-age=31536000, immutable` |
| Homepage (`/:locale`) | `s-maxage=60, stale-while-revalidate=300` |
| Products listing & detail | `s-maxage=120, stale-while-revalidate=600` |
| Stores | `s-maxage=300, stale-while-revalidate=1200` |
| API `/api/products` | `s-maxage=300, stale-while-revalidate=600` |
| API `/api/stores` | `s-maxage=600, stale-while-revalidate=1200` |

## Client-Side

### Cart Persistence
- Zustand store with `localStorage` (partialize: only items + timestamp)
- 2-day expiry client-side (`CART_EXPIRY_MS`)
- Server validates cart timestamp at checkout (410 Gone if expired)

### Image Optimization
In `next.config.ts`:
- `minimumCacheTTL: 31536000` (1 year)
- Formats: AVIF + WebP
- Remote patterns for Supabase Storage + Google avatars
- All `fill` images include explicit `sizes` prop to prevent over-fetching:
  - Product grid cards: `(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw`
  - Related products: `(min-width: 768px) 25vw, 50vw`
  - Cart thumbnails: `80px`
  - Checkout thumbnails: `48px`
  - Admin table thumbnails: `40px`

### Static Asset Caching
HTTP headers for images, JS, CSS, fonts:
```
Cache-Control: public, max-age=31536000, immutable
```

### CSS Optimization
- `experimental.optimizeCss: true` in next.config.ts
- Tailwind CSS 4 (JIT, tree-shaking)

### Loading UX
- Donut-themed skeleton loader (`app/[locale]/loading.tsx`)
- Animated ring spinner + content skeleton blocks
- 4-card grid placeholder for product pages

## Database Indexes

### Base Indexes (001_core_schema)

| Index | Table | Purpose |
|-------|-------|---------|
| `idx_products_category` | products | Category filter |
| `idx_products_featured` | products | Featured listing |
| `idx_products_slug` | products | Slug lookup |
| `idx_orders_user_id` | orders | User's orders |
| `idx_orders_status` | orders | Status filter |
| `idx_orders_stripe_session` | orders | Webhook lookup |
| `idx_order_items_order_id` | order_items | Order detail |
| `idx_orders_active` | orders | Partial index (deleted_at IS NULL) |
| `idx_audit_log_entity` | audit_log | Entity lookup |
| `idx_audit_log_actor` | audit_log | Actor lookup |
| `idx_audit_log_created` | audit_log | Time-range queries |

### Performance Indexes (006_performance_indexes)

| Index | Table | Type | Covers |
|-------|-------|------|--------|
| `idx_orders_user_active_created` | orders | Composite + partial | `getOrdersByUser` (user_id + created_at DESC WHERE deleted_at IS NULL) |
| `idx_orders_pending_active` | orders | Partial | Admin pending count (status = 'pending' AND deleted_at IS NULL) |
| `idx_orders_active_created` | orders | Partial | Admin today's revenue (created_at DESC WHERE deleted_at IS NULL) |
| `idx_products_featured_created` | products | Partial | `getFeaturedProducts` (created_at DESC WHERE featured = true) |
| `idx_products_low_stock` | products | Partial | Admin low-stock count (stock < 10) |
| `idx_order_items_product_qty` | order_items | Covering | Admin top-products aggregation |
| `idx_stripe_events_event_id` | stripe_events | B-tree | Webhook idempotency lookup |
| `idx_analytics_events_type_created` | analytics_events | Composite | Analytics by type + date range |
| `idx_notifications_pending` | notifications | Partial | Batch notification processing (status = 'pending') |
| `idx_reviews_product_approved` | reviews | Composite + partial | Product reviews listing (approved only) |

## Bundle Analysis
```bash
npm run analyze
```
Uses `@next/bundle-analyzer` + `cross-env` to visualise bundle size. Opens interactive treemap in browser.
