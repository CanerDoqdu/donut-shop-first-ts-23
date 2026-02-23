# Postmortem: 014_stripe_session_v2 Migration

**Date:** 2025-02-22
**Migration:** `014_stripe_session_v2`
**Status:** Completed (with lessons learned)
**Author:** donut-shop engineering

---

## Summary

Migrated the `orders.stripe_session_id` column to a validated `stripe_session_v2` column
with a `CHECK` constraint enforcing the `cs_` prefix format. The original column is retained
during the transition period for safe rollback.

## Timeline

| Time | Event |
|------|-------|
| T+0 | Migration file written — initial version used MySQL syntax (`UPDATE ... LIMIT`) |
| T+1 | **CAUGHT:** PostgreSQL does not support `UPDATE ... LIMIT`. Rewritten to CTE pattern |
| T+2 | **CAUGHT:** Used `CREATE PROCEDURE` — PostgreSQL uses `CREATE FUNCTION` |
| T+3 | Corrected both issues. Migration file finalized with PostgreSQL-compatible syntax |
| T+4 | Rollback file written and tested (DROP COLUMN IF EXISTS) |
| T+5 | Validation file written (VALIDATE CONSTRAINT + mark completed) |
| T+6 | Dual-write code implemented in checkout + webhook routes |
| T+7 | 30+ automated tests added covering runner, SQL validation, dual-write |

## Near-Misses (Caught Before Production)

### 1. MySQL Syntax in PostgreSQL Migration

**Problem:** Original batch update used `UPDATE orders SET ... WHERE ... LIMIT 1000` — valid MySQL,
invalid PostgreSQL.

**Impact if undetected:** Migration would fail on Supabase (PostgreSQL) with a syntax error.
No data loss, but the migration would be blocked until fixed.

**Fix:** Rewrote to PostgreSQL CTE pattern:
```sql
WITH batch AS (
  SELECT id FROM orders
  WHERE stripe_session_id IS NOT NULL AND stripe_session_v2 IS NULL
  LIMIT 1000
  FOR UPDATE SKIP LOCKED
)
UPDATE orders SET stripe_session_v2 = stripe_session_id
WHERE id IN (SELECT id FROM batch);
```

**Prevention:** Added automated SQL test that checks for MySQL-only syntax patterns.

### 2. CREATE PROCEDURE vs CREATE FUNCTION

**Problem:** Original validation used `CREATE PROCEDURE validate_migration_safety()` —
PostgreSQL uses `CREATE OR REPLACE FUNCTION ... RETURNS void`.

**Impact if undetected:** Validation step would fail, but migration data would still be intact.

**Fix:** Switched to `CREATE OR REPLACE FUNCTION` with proper `RETURNS void` and `LANGUAGE plpgsql`.

**Prevention:** SQL test checks for `CREATE PROCEDURE` in migration files.

### 3. CHECK Constraint Full-Table Scan Risk

**Problem:** Adding a CHECK constraint normally triggers a full-table scan to validate all
existing rows. On a large `orders` table, this could lock the table for minutes.

**Near-miss:** Almost deployed without `NOT VALID`.

**Fix:** Added constraint with `NOT VALID` (validates new rows immediately, skips existing).
Separate validation file runs `VALIDATE CONSTRAINT` after backfill is complete.

**Prevention:** Migration checklist includes "CHECK constraints added with NOT VALID first".

## What Went Well

1. **Dual-column approach** — Adding a new column alongside the old one means rollback
   is a simple `DROP COLUMN` with zero data loss.

2. **Batched backfill with SKIP LOCKED** — Non-blocking migration that doesn't contend
   with concurrent operations.

3. **Progress tracking table** — `_migration_progress` provides real-time visibility into
   migration state without querying the main table.

4. **Automated safeguards** — Tests catch MySQL syntax, verify idempotent DDL,
   and confirm rollback safety.

## What Could Be Improved

1. **No staging environment** — We caught syntax issues through code review and automated
   tests, but running on a staging database with production-volume data would catch
   performance issues (lock contention, slow INDEX creation).

2. **Manual batch execution** — The backfill SQL must be run repeatedly until 0 rows affected.
   A migration runner script (now implemented in `lib/migration.ts`) automates this.

3. **No alerting during migration** — Future migrations should integrate with the
   observability stack (Grafana alerts for latency spike during backfill).

## Action Items

| # | Action | Status |
|---|--------|--------|
| 1 | Add PostgreSQL syntax tests to CI | Done |
| 2 | Implement migration runner (`lib/migration.ts`) | Done |
| 3 | Create migration checklist (`docs/MIGRATION-CHECKLIST.md`) | Done |
| 4 | Add dual-write helpers for transition period | Done |
| 5 | Document column drop as separate future migration | Tracked |

## Decision Record

**Decision:** Keep `stripe_session_id` (v1) for at least 2 weeks after v2 is fully validated.

**Reason:** If any edge case surfaces (webhook using old column, third-party integration),
we can read from v1 as fallback. The `readStripeSession()` helper automatically prefers v2
and falls back to v1.

**Drop column trigger:** When monitoring shows 100% of reads come from v2 for 2 consecutive weeks,
create a separate migration to `ALTER TABLE orders DROP COLUMN stripe_session_id`.
