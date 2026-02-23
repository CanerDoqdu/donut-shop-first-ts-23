# Database Migration Checklist

> Every schema migration must follow this checklist before deployment.
> Reference: PR30 — Database Migration Safety + Rollback Testing

---

## Pre-Migration

- [ ] **Migration file** exists in `supabase/migrations/` with sequential numbering
- [ ] **Rollback file** exists with `_rollback` suffix (e.g., `014_xyz_rollback.sql`)
- [ ] **Validate file** exists with `_validate` suffix (e.g., `014_xyz_validate.sql`)
- [ ] All DDL is **idempotent** (`IF NOT EXISTS` / `IF EXISTS`)
- [ ] Uses **PostgreSQL** syntax (no MySQL `LIMIT` in `UPDATE`, no `CREATE PROCEDURE`)
- [ ] DDL wrapped in transaction (`BEGIN; ... COMMIT;`)
- [ ] CHECK constraints added with `NOT VALID` first (avoids full-table scan)
- [ ] Large backfills use **batched CTE** with `FOR UPDATE SKIP LOCKED`
- [ ] Code handles **both old and new schema** (dual-write pattern)
- [ ] `_migration_progress` tracking table populated

## During Migration

- [ ] Run migration on **staging** with production-volume data first
- [ ] Monitor:
  - Row count progress via `_migration_progress` table
  - Query latency (no degradation during backfill)
  - Error rate (no increase during backfill)
  - Lock wait times (should be near-zero with `SKIP LOCKED`)
- [ ] Backfill batches run with configurable delay (default 100ms between batches)
- [ ] Progress logged after each batch

## Post-Migration

- [ ] Run validation file to validate CHECK constraints
- [ ] Verify **zero unmigrated rows** remain
- [ ] Verify **zero invalid values** in new column
- [ ] Row counts match between old and new columns
- [ ] `_migration_progress.status = 'completed'`
- [ ] Code switched to read from new column (with fallback to old)
- [ ] Monitoring confirms no performance degradation

## Rollback

- [ ] Rollback tested **before** production deployment
- [ ] Rollback only drops new column(s) — **never touches old columns**
- [ ] Rollback updates `_migration_progress.status = 'rolled_back'`
- [ ] Zero data loss confirmed after rollback + re-apply cycle
- [ ] Application continues to function with rollback (reads old column)

## Dual-Write Pattern

During the transition period (between migration and dropping the old column):

```
Phase 1: ADD COLUMN (DDL)
Phase 2: BACKFILL (batched, non-blocking)
Phase 3: VALIDATE (CHECK constraint)
Phase 4: DUAL-WRITE (code writes to both columns, reads from new)
Phase 5: DROP old column (separate migration, after verification period)
```

### Dual-Write Code Pattern

```typescript
import { dualWriteStripeSession, readStripeSession } from '@/lib/migration';

// Writing: spread both columns into update
await supabase
  .from('orders')
  .update(dualWriteStripeSession(session.id))
  .eq('id', orderId);

// Reading: prefer v2, fall back to v1
const sessionId = readStripeSession(order);
```

## Decision Tree

```
Migration needed?
├── Yes → Is it a column addition?
│   ├── Yes → ADD COLUMN IF NOT EXISTS (instant for NULL default)
│   │   ├── Backfill needed? → Use batched CTE
│   │   └── No backfill → Done after DDL
│   └── No → Is it a column removal?
│       ├── Yes → STOP. Do NOT drop in same PR.
│       │   └── First: remove all code references
│       │   └── Then: separate PR to DROP COLUMN
│       └── No → Is it a type change?
│           └── Use dual-column approach (add new, backfill, switch, drop old)
└── No → No migration needed
```

---

## Example: 014_stripe_session_v2

| Phase | Action | File |
|-------|--------|------|
| 1 | ADD COLUMN + CHECK (NOT VALID) + INDEX | `014_stripe_session_v2.sql` |
| 2 | Batched backfill (CTE + SKIP LOCKED) | `014_stripe_session_v2.sql` |
| 3 | VALIDATE CONSTRAINT | `014_stripe_session_v2_validate.sql` |
| 4 | Dual-write in checkout + webhook | `app/api/checkout/route.ts`, `app/api/webhooks/stripe/route.ts` |
| 5 | DROP old column | Future migration (after verification period) |
| ↩️ | Rollback | `014_stripe_session_v2_rollback.sql` |
