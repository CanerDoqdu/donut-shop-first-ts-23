# Database Runbook

> Operational procedures for the Glazed & Sipped PostgreSQL database (Supabase).

---

## Migration Execution Order

Migrations must be run sequentially in the Supabase SQL Editor:

```
001_core_schema.sql        → Base tables, RLS, triggers, seed products
002_extended_features.sql  → Stores, loyalty, gift cards, subscriptions, reviews, referrals
003_stores_seed.sql        → Extended store location data (6 locations)
004_stripe_events.sql      → Stripe idempotency table + payment RPC
005_soft_delete_audit.sql  → Soft-delete on orders + audit_log table
```

All migrations are **idempotent** — they use `IF NOT EXISTS`, `CREATE OR REPLACE`, and `DROP POLICY IF EXISTS` patterns and can be safely re-run.

---

## Full Reset Procedure

> **WARNING**: This destroys all data. Use only in development.

### Step 1 — Drop all tables (reverse dependency order)

```sql
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS stripe_events CASCADE;
DROP TABLE IF EXISTS subscription_deliveries CASCADE;
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS review_helpful_votes CASCADE;
DROP TABLE IF EXISTS referral_codes CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS gift_card_transactions CASCADE;
DROP TABLE IF EXISTS gift_cards CASCADE;
DROP TABLE IF EXISTS points_transactions CASCADE;
DROP TABLE IF EXISTS loyalty_points CASCADE;
DROP TABLE IF EXISTS store_inventory CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS products CASCADE;
```

### Step 2 — Drop functions

```sql
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS calculate_loyalty_tier(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS update_product_rating() CASCADE;
DROP FUNCTION IF EXISTS award_order_points() CASCADE;
DROP FUNCTION IF EXISTS generate_referral_code() CASCADE;
DROP FUNCTION IF EXISTS create_user_referral_code() CASCADE;
DROP FUNCTION IF EXISTS soft_delete_order(UUID) CASCADE;
DROP FUNCTION IF EXISTS process_payment_completed(TEXT, TEXT) CASCADE;
```

### Step 3 — Re-run migrations

Run each file in order from `supabase/migrations/`:
```
001 → 002 → 003 → 004 → 005
```

---

## Common Operations

### Check Table Row Counts

```sql
SELECT schemaname, relname, n_live_tup
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
```

### Verify RLS is Enabled

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### List All Policies

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Check Index Usage

```sql
SELECT indexrelname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

---

## Soft-Delete Operations

### Soft-delete an order

```sql
SELECT soft_delete_order('<order-uuid>');
```

### View soft-deleted orders (admin only, via service_role)

```sql
SELECT * FROM orders WHERE deleted_at IS NOT NULL;
```

### Restore a soft-deleted order

```sql
UPDATE orders SET deleted_at = NULL, updated_at = NOW()
WHERE id = '<order-uuid>';
```

---

## Audit Log

### Query recent audit entries

```sql
SELECT action, entity_type, entity_id, created_at
FROM audit_log
ORDER BY created_at DESC
LIMIT 50;
```

### Purge old entries (> 1 year)

```sql
DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '1 year';
```

---

## Stripe Events

### Check for duplicate event processing

```sql
SELECT event_id, event_type, processed_at
FROM stripe_events
WHERE event_id = 'evt_xxx';
```

### Process payment manually (emergency)

```sql
SELECT process_payment_completed('cs_xxx', 'pi_xxx');
```

---

## Backup & Restore

Supabase provides automatic daily backups on Pro plans. For manual backups:

```bash
# Export via pg_dump (requires direct connection string)
pg_dump "$DATABASE_URL" --no-owner --no-acl -F c -f backup.dump

# Restore
pg_restore -d "$DATABASE_URL" --no-owner --no-acl backup.dump
```

---

## Monitoring Queries

### Slow queries

```sql
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Connection count

```sql
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
```

### Table sizes

```sql
SELECT relname,
       pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```
