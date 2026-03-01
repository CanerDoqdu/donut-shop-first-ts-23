# Cache Policy — TTL & Invalidation Rules

> Last updated: 2026-03-01  
> Code: `lib/cache-policy.ts` | Tags: `lib/cache-tags.ts`

## Cache Layers

| Layer | Technology | Scope |
|-------|-----------|-------|
| `nextjs-isr` | Next.js `unstable_cache` + `revalidateTag` | Server-rendered pages, data fetching |
| `upstash-redis` | Upstash Redis (HTTP) | Shared cache for serverless instances |
| `in-memory` | Node.js process memory | Rate limiter, metrics collector |
| `browser` | Browser HTTP cache | Static assets (JS/CSS/images) |

## Policy Summary

| Resource | TTL | SWR | Layer(s) | Invalidation Tags | User-Scoped |
|----------|-----|-----|----------|-------------------|-------------|
| Products list | 300s (5 min) | 60s | ISR + Redis | `products` | No |
| Single product | 300s (5 min) | 60s | ISR | `product:<slug>` | No |
| Stores | 600s (10 min) | 120s | ISR + Redis | `stores` | No |
| User orders | 60s (1 min) | 30s | ISR | `orders:user:<id>` | Yes |
| Admin dashboard | 120s (2 min) | 60s | ISR | `admin:dashboard` | No |
| Reviews | 180s (3 min) | 60s | ISR | `product:<slug>` | No |
| Rate limit counters | 60s (1 min) | — | In-memory | — | No |
| Metrics window | 300s (5 min) | — | In-memory | — | No |
| Browser assets | 31536000s (1 yr) | — | Browser | Hash change | No |

## Invalidation Triggers

| Event | Tags Invalidated | Resources Affected |
|-------|------------------|--------------------|
| Admin creates/updates/deletes product | `products`, `product:<slug>` | Products list, Single product |
| Stock level changes | `products` | Products list |
| Review posted | `product:<slug>` | Single product, Reviews |
| Store added/updated/deactivated | `stores` | Stores |
| Order created | `orders:user:<id>` | User orders |
| Order status changed (webhook) | `orders:user:<id>`, `admin:dashboard` | User orders, Admin dashboard |
| Order paid/cancelled | `admin:dashboard` | Admin dashboard |
| New deployment | — (hash change) | Browser assets |

## Design Decisions

### Why these TTLs?

- **Products (5 min):** Changes only on admin edits. Tag invalidation ensures freshness on edit, TTL handles edge cases.
- **Stores (10 min):** Rarely changes. Longest TTL to minimize recomputation.
- **User orders (1 min):** Most dynamic. Short TTL + webhook-triggered invalidation.
- **Admin dashboard (2 min):** Aggregated view, OK to be slightly stale.
- **Browser assets (1 yr):** Next.js uses content-hashed filenames. Safe for immutable caching.

### SWR (Stale-While-Revalidate)

All ISR-cached resources use SWR to serve stale content while revalidating in the background. This ensures:
- Users never see a loading spinner for cached content
- Cache misses trigger background revalidation
- Fresh data appears on next request

### Why not a CDN Edge Cache?

Current traffic doesn't justify edge caching complexity. Next.js ISR + Upstash Redis provides sufficient performance. Can be added later via Vercel Edge Config or Cloudflare.

## Validation

```bash
# Run cache policy tests
npx vitest run tests/lib/cache-policy.test.ts

# Verify TTL alignment with cache-tags.ts
# The test suite checks that TTLs match between cache-policy.ts and cache-tags.ts
```

## How to Add a New Cached Resource

1. Add a `CachePolicy` entry in `lib/cache-policy.ts` → `CACHE_POLICIES`
2. Add tags in `lib/cache-tags.ts` if needed
3. Add `revalidateTag()` calls in the relevant mutation endpoints
4. Add tests in `tests/lib/cache-policy.test.ts`
5. Update this document
