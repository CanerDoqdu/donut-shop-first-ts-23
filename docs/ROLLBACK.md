# Rollback Strategy

> Last updated: 2026-02-19

This document covers rollback procedures for **application deployments** and **database migrations**.

---

## 1. Application Rollback (Vercel / Next.js)

### Instant Rollback via Vercel Dashboard

1. Go to **Vercel → Project → Deployments**.
2. Find the last known-good deployment.
3. Click **⋯ → Promote to Production**.
4. Verify health checks pass on the promoted URL.

**Estimated downtime:** 0 — Vercel keeps previous deployments alive.

### Git-based Rollback

```bash
# Revert the bad commit(s) on main
git revert HEAD --no-edit
git push origin main
# Vercel auto-deploys from main
```

### Feature Flag Kill Switch

For changes behind a feature flag (`lib/config.ts`):

```ts
// Set the flag to false — no deploy needed if using runtime config
loyalty: false,
giftCards: false,
subscriptions: false,
```

---

## 2. Database Migration Rollback

Each migration file has a corresponding **reverse SQL** block below.
Run these in **descending order** (latest first) against the Supabase SQL Editor or via `psql`.

### 007 — Audit Log Append-Only

**Forward:** Trigger-based UPDATE/DELETE block + RLS deny policies on `audit_log`.

```sql
-- REVERSE 007
DROP POLICY IF EXISTS "deny_update_audit_log" ON audit_log;
DROP POLICY IF EXISTS "deny_delete_audit_log" ON audit_log;
DROP TRIGGER IF EXISTS trg_block_audit_update ON audit_log;
DROP TRIGGER IF EXISTS trg_block_audit_delete ON audit_log;
DROP FUNCTION IF EXISTS block_audit_mutation();
```

### 006 — Performance Indexes

**Forward:** 10 composite/partial indexes on products, orders, order_items, profiles, stores.

```sql
-- REVERSE 006
DROP INDEX IF EXISTS idx_products_category_stock;
DROP INDEX IF EXISTS idx_products_featured_active;
DROP INDEX IF EXISTS idx_products_slug;
DROP INDEX IF EXISTS idx_orders_user_created;
DROP INDEX IF EXISTS idx_orders_status;
DROP INDEX IF EXISTS idx_orders_stripe_session;
DROP INDEX IF EXISTS idx_order_items_order_id;
DROP INDEX IF EXISTS idx_profiles_user_id;
DROP INDEX IF EXISTS idx_stores_active_city;
DROP INDEX IF EXISTS idx_stripe_events_event_id;
```

### 005 — Soft Delete & Audit

**Forward:** `deleted_at` columns, audit trigger, `soft_delete()` helper.

```sql
-- REVERSE 005
DROP FUNCTION IF EXISTS soft_delete(text, uuid);
DROP TRIGGER IF EXISTS trg_orders_audit ON orders;
DROP TRIGGER IF EXISTS trg_products_audit ON products;
DROP FUNCTION IF EXISTS audit_trigger_fn();
DROP TABLE IF EXISTS audit_log;
ALTER TABLE products DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE orders DROP COLUMN IF EXISTS deleted_at;
```

### 004 — Stripe Events (Idempotency)

**Forward:** `stripe_events` table for webhook dedup.

```sql
-- REVERSE 004
DROP TABLE IF EXISTS stripe_events;
```

### 003 — Stores Seed

**Forward:** `stores` table + seed rows.

```sql
-- REVERSE 003
DROP TABLE IF EXISTS stores;
```

### 002 — Extended Features

**Forward:** Tables for subscriptions, gift cards, loyalty points, referrals.

```sql
-- REVERSE 002
DROP TABLE IF EXISTS referrals;
DROP TABLE IF EXISTS loyalty_points;
DROP TABLE IF EXISTS gift_cards;
DROP TABLE IF EXISTS subscriptions;
```

### 001 — Core Schema

**Forward:** Base tables (profiles, products, orders, order_items, admin_users) + RLS.

```sql
-- REVERSE 001  ⚠️ DESTRUCTIVE — drops ALL app data
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS admin_users;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS profiles;
```

> **Warning:** Reversing 001 drops all customer data. Only use in dev/staging.

---

## 3. Rollback Decision Tree

```
Is the issue in application code only?
├─ YES → Revert commit or promote previous Vercel deployment
└─ NO (DB schema involved?)
   ├─ Was the migration additive (new table/column)?
   │  └─ Safe to reverse — run reverse SQL above
   ├─ Was the migration destructive (dropped column)?
   │  └─ STOP — data loss already occurred
   │     └─ Restore from backup (see docs/BACKUP_RESTORE.md)
   └─ Was it an index-only change?
      └─ Safe to reverse — `DROP INDEX` is non-destructive
```

---

## 4. Pre-Deployment Checklist

Before every production deploy:

- [ ] Migration tested on staging/preview
- [ ] Reverse SQL verified in staging
- [ ] `pg_dump` backup taken (see `docs/BACKUP_RESTORE.md`)
- [ ] Feature flag available for new features
- [ ] Monitoring/alerting active (error rate, latency, 5xx)

---

## 5. Incident Communication Template

```
**Incident:** [Brief description]
**Impact:** [Who/what is affected]
**Timeline:**
- HH:MM — Issue detected via [alert/user report]
- HH:MM — Rollback initiated (revert commit / promote deployment / run reverse SQL)
- HH:MM — Service restored
**Root cause:** [TBD / post-mortem link]
**Action items:** [Prevent recurrence]
```
