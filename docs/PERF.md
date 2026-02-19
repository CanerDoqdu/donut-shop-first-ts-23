# Performance & Caching

## Server-Side Caching

### React.cache() Wrappers (`lib/queries.ts`)
Deduplicates identical Supabase queries within a single server request:

| Function | Purpose |
|----------|---------|
| `getProducts()` | All products |
| `getFeaturedProducts()` | Featured products only |
| `getProductBySlug(slug)` | Single product by slug |
| `getOrdersByUser(userId)` | User's active orders (soft-delete aware) |
| `getOrderById(orderId)` | Single order with items |
| `getAdminDashboardData()` | Batched admin stats (Promise.all) |

### Admin Dashboard N+1 Fix
Before: 6 sequential Supabase queries (waterfall)
After: Single `Promise.all` batch — all 6 queries execute in parallel

### In-Memory Product Catalog
`lib/data.ts` serves product data from a static array. Zero database round-trips for product lookups during checkout.

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

## Bundle Analysis
```bash
ANALYZE=true npm run build
```
Uses `@next/bundle-analyzer` to visualize bundle size.
