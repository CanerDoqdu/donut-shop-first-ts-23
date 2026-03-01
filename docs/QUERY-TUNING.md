# Query Tuning Report

**Date:** 2026-03-01  
**Status:** Active  

## Overview

This report documents the top database queries, their performance characteristics, and optimization recommendations for the Donut Shop application.

## Query Inventory

All queries in the application are executed via Supabase client. Below is the catalog of significant queries with their expected performance profiles.

### 1. Product Listing (Hot Path)

```sql
-- Source: lib/data.server.ts, lib/data.ts
SELECT * FROM products WHERE deleted_at IS NULL ORDER BY name;
```

| Metric | Value |
|--------|-------|
| Frequency | Very High (every page load) |
| Expected Rows | 10–50 |
| Index | `products_pkey` (id), none on `deleted_at` |
| Cache | Redis TTL 5 min (`cache-policy.ts`) |

**EXPLAIN ANALYZE (estimated):**
```
Seq Scan on products (cost=0.00..1.50 rows=50 width=200)
  Filter: (deleted_at IS NULL)
```

**Assessment:** ✅ No tuning needed. Small table, fully cacheable, sequential scan is optimal for <100 rows.

---

### 2. Order Lookup by User (Auth Required)

```sql
-- Source: app/[locale]/(protected)/orders/*, lib/queries.ts
SELECT * FROM orders WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC;
```

| Metric | Value |
|--------|-------|
| Frequency | Medium (order history page) |
| Expected Rows | 1–100 per user |
| Index | RLS uses `auth.uid() = user_id` |
| Cache | No cache (real-time data) |

**Recommended Index:**
```sql
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created 
  ON orders(user_id, created_at DESC) 
  WHERE deleted_at IS NULL;
```

**Assessment:** ⚠️ Add composite index if order volume grows beyond 1000/user. Currently acceptable.

---

### 3. Admin Users Lookup (Per-Request Auth)

```sql
-- Source: lib/auth/admin.ts
SELECT role, permissions FROM admin_users WHERE user_id = $1;
```

| Metric | Value |
|--------|-------|
| Frequency | High (every admin API call) |
| Expected Rows | 0–1 |
| Index | `admin_users_pkey` or `user_id` unique |
| Cache | Redis 5 min (`admin:{userId}`) |

**Assessment:** ✅ Optimal. Single-row lookup by primary/unique key, cached.

---

### 4. Store Inventory Join

```sql
-- Source: lib/data.ts (getStoresWithInventory)
SELECT s.*, si.product_id, si.quantity 
FROM stores s 
LEFT JOIN store_inventory si ON s.id = si.store_id;
```

| Metric | Value |
|--------|-------|
| Frequency | Medium (stores page) |
| Expected Rows | Stores × Products (~100–500) |
| Index | `store_inventory(store_id)` |
| Cache | Redis TTL 5 min |

**Assessment:** ✅ Acceptable. Join on indexed foreign key, cacheable.

---

### 5. Loyalty Points Lookup

```sql
-- Source: lib/queries.ts
SELECT * FROM loyalty_points WHERE user_id = $1;
```

| Metric | Value |
|--------|-------|
| Frequency | Medium (loyalty page, checkout) |
| Expected Rows | 1 |
| Index | RLS enforces `user_id = auth.uid()` |
| Cache | No cache (balance must be current) |

**Assessment:** ✅ Single-row lookup by user_id (unique). Optimal.

---

### 6. Gift Cards by Purchaser

```sql
-- Source: components/giftcards/*
SELECT * FROM gift_cards WHERE purchaser_id = $1;
```

| Metric | Value |
|--------|-------|
| Frequency | Low |
| Expected Rows | 0–10 |
| Index | Consider `idx_gift_cards_purchaser` |
| Cache | No |

**Recommended Index:**
```sql
CREATE INDEX IF NOT EXISTS idx_gift_cards_purchaser 
  ON gift_cards(purchaser_id);
```

**Assessment:** ⚠️ Low priority. Add index if gift card volume grows.

---

### 7. Review Moderation Queue (Admin)

```sql
-- Source: lib/reviews.ts (getModerationQueue)
SELECT * FROM reviews WHERE status IN ('pending', 'flagged') ORDER BY created_at;
```

| Metric | Value |
|--------|-------|
| Frequency | Low (admin panel only) |
| Expected Rows | 0–50 (moderation queue) |
| Index | Consider `idx_reviews_status` |
| Cache | No |

**Recommended Index:**
```sql
CREATE INDEX IF NOT EXISTS idx_reviews_status 
  ON reviews(status) 
  WHERE status IN ('pending', 'flagged');
```

**Assessment:** ⚠️ Low priority. Partial index useful if reviews table grows.

---

### 8. Stripe Events Deduplication

```sql
-- Source: lib/idempotency.ts, webhook handler
SELECT 1 FROM stripe_events WHERE event_id = $1;
```

| Metric | Value |
|--------|-------|
| Frequency | Per webhook call |
| Expected Rows | 0–1 |
| Index | `stripe_events_pkey` (event_id) |
| Cache | No |

**Assessment:** ✅ Primary key lookup. Optimal.

---

## Summary

| Priority | Query | Action |
|----------|-------|--------|
| ✅ None | Products listing | Small table, cached |
| ✅ None | Admin lookup | Cached, unique key |
| ✅ None | Loyalty points | Single-row unique |
| ✅ None | Stripe dedup | Primary key |
| ✅ None | Store inventory | Indexed FK, cached |
| ⚠️ Watch | Orders by user | Add composite index at scale |
| ⚠️ Watch | Gift cards by purchaser | Add index at scale |
| ⚠️ Watch | Review moderation | Add partial index at scale |

## Performance Baselines

| Metric | Target | Current |
|--------|--------|---------|
| p95 API latency | < 500ms | ~200ms (Vercel edge) |
| DB query time (hot) | < 50ms | ~10ms (Supabase, cached) |
| DB query time (cold) | < 200ms | ~50ms |
| Cache hit rate | > 80% | Monitored via cache observability |

## Recommendations

1. **No immediate action required** — all queries are within acceptable bounds for current scale
2. **Monitor via SLO** — p95 latency SLO will catch regressions
3. **Index at scale** — add recommended indexes when data volume exceeds thresholds
4. **Cache first** — Redis caching is the primary performance lever for this application

## Review Schedule

- Review query performance monthly
- Add EXPLAIN ANALYZE results when slow query alerts trigger
- Update this report when new queries are added to hot paths
