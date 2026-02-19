# Database Runbook

Operational procedures for the Glazed & Sipped PostgreSQL database (Supabase).

## Health Check

```bash
curl https://your-domain.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-19T10:00:00.000Z",
  "version": "0.1.0"
}
```

## Migration Execution Order

Run sequentially in Supabase SQL Editor:

1. `supabase/migrations/001_core_schema.sql`
2. `supabase/migrations/002_extended_features.sql`
3. `supabase/migrations/003_stores_seed.sql`
4. `supabase/migrations/004_stripe_events.sql`
5. `supabase/migrations/005_soft_delete_audit.sql`

All migrations are idempotent (`IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP ... IF EXISTS`).

## Common Issues

### Missing environment variables
Symptom: app fails with `[env] Missing required environment variable`.
Fix: match `.env.local` to `.env.example`.

### Stripe webhook failures
Symptom: paid checkout but order remains `pending`.
Checks:
1. `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard.
2. Event appears once in `stripe_events`.
3. Logs contain no signature verification error.
4. Webhook URL points to `/api/webhooks/stripe`.

### Rate limit triggered
Symptom: `429` on auth/checkout routes.
Current limits:
- Auth: 5 req/min/IP
- Checkout: 5 req/min/IP
- Gift cards: 3 req/min/IP

### CSRF origin rejection
Symptom: `403` on mutation routes.
Checks:
1. `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL` match deployed origin.
2. In production, missing Origin/Referer is rejected.
3. Stripe webhook route bypasses origin check by design.

### Admin access denied
Symptom: redirect from `/admin/*`.
Fix:
```sql
INSERT INTO admin_users (user_id) VALUES ('user-uuid-here');
```

### Cart expired
Symptom: `410 Gone` on checkout.
Cause: cart older than 2 days.
Fix: recreate cart.

## Full Reset Procedure (Development Only)

Warning: destructive.

### Step 1 — Drop all tables

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

`001 -> 002 -> 003 -> 004 -> 005`

## Operations

### Check table row counts
```sql
SELECT schemaname, relname, n_live_tup
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
```

### Verify RLS enabled
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### List policies
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Index usage
```sql
SELECT indexrelname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

## Soft-Delete Operations

### Soft-delete an order
```sql
SELECT soft_delete_order('<order-uuid>');
```

### View soft-deleted orders
```sql
SELECT * FROM orders WHERE deleted_at IS NOT NULL;
```

### Restore a soft-deleted order
```sql
UPDATE orders
SET deleted_at = NULL, updated_at = NOW()
WHERE id = '<order-uuid>';
```

## Audit Log

### Recent entries
```sql
SELECT action, entity_type, entity_id, created_at
FROM audit_log
ORDER BY created_at DESC
LIMIT 50;
```

### Purge older than 1 year
```sql
DELETE FROM audit_log
WHERE created_at < NOW() - INTERVAL '1 year';
```

## Stripe Events

### Verify idempotency
```sql
SELECT event_id, event_type, processed_at
FROM stripe_events
WHERE event_id = 'evt_xxx';
```

### Process payment manually
```sql
SELECT process_payment_completed('cs_xxx', 'pi_xxx');
```

## Monitoring

### Structured logs
All server logs are JSON (`lib/logger.ts`) and include `requestId`.

### Web vitals
Client reports CLS, FID, FCP, LCP, TTFB to `/api/vitals`.

### Request tracing
Every request carries `x-request-id` (generated in middleware if missing).

## Deployment Checklist

- [ ] All env vars set (check `.env.example`)
- [ ] Supabase migrations applied
- [ ] Stripe webhook configured and verified
- [ ] Admin users seeded in `admin_users` table
- [ ] HTTPS enabled
- [ ] CI pipeline green (lint, typecheck, test, build)
