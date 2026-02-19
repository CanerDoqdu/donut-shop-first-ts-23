# ADR-005: Tag-Based Cache Invalidation

**Status:** Accepted  
**Date:** 2025-01-15  
**Context:** The application relies on server-side data queries (products, orders, admin dashboard) that benefit from cross-request caching. However, after mutations (product update, new order, stock change), stale data must be purged promptly without a full redeploy.

## Decision

Adopt Next.js `unstable_cache` with tag-based invalidation (`revalidateTag`) as the cross-request data-cache layer, combined with the existing `React.cache()` request-dedup layer.

### Architecture

```
Browser → CDN (s-maxage / SWR) → Next.js Data Cache (unstable_cache + tags) → React.cache (per-request dedup) → Supabase
```

### Tag Registry (`lib/cache-tags.ts`)

| Constant            | Value               | Scope                  |
|---------------------|---------------------|------------------------|
| `TAG_PRODUCTS`      | `'products'`        | All product queries    |
| `TAG_ORDERS`        | `'orders'`          | All order queries      |
| `TAG_STORES`        | `'stores'`          | All store queries      |
| `TAG_ADMIN_DASHBOARD` | `'admin-dashboard'` | Admin aggregate data |

Builder functions generate fine-grained tags:
- `productTag(slug)` → `product:chocolate-dream`
- `userOrdersTag(userId)` → `orders:user:<uuid>`
- `orderTag(orderId)` → `order:<uuid>`

### Revalidation Durations

| Domain     | TTL      | Rationale                              |
|------------|----------|----------------------------------------|
| Products   | 300 s    | Menu changes are infrequent            |
| Stores     | 600 s    | Store info is semi-static              |
| Orders     | 60 s     | Users expect near-real-time order data |
| Admin      | 120 s    | Dashboard tolerates slight staleness   |

### CDN Cache-Control Policy

| Route Pattern          | Header                                           |
|------------------------|--------------------------------------------------|
| Static assets          | `max-age=31536000, immutable`                    |
| Homepage               | `s-maxage=60, stale-while-revalidate=300`        |
| `/products`, `/products/:slug` | `s-maxage=120, stale-while-revalidate=600` |
| `/stores`              | `s-maxage=300, stale-while-revalidate=1200`      |
| API `/api/products`    | `s-maxage=300, stale-while-revalidate=600`       |
| API `/api/stores`      | `s-maxage=600, stale-while-revalidate=1200`      |

### Invalidation Flow

```
Webhook/Mutation
  → revalidateTag('products')          // bust all product queries
  → revalidateTag('product:slug')      // bust specific product
  → CDN serves stale-while-revalidate during rebuild
```

## Alternatives Considered

1. **`revalidatePath`** — too coarse; invalidates entire page tree rather than specific data.
2. **ISR with `revalidate` only** — time-based only, no on-demand purge after mutations.
3. **Redis/external cache** — adds infrastructure complexity; `unstable_cache` is zero-config within Next.js.

## Consequences

- **Positive:** Fine-grained cache bust per entity; zero external dependencies; CDN absorbs traffic spikes.
- **Negative:** `unstable_cache` API may change in future Next.js versions; requires explicit `revalidateTag` calls at every mutation point.
- **Migration:** When Next.js stabilises the cache API, rename imports — no architectural change needed.
