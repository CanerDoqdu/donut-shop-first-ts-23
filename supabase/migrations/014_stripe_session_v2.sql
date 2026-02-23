-- =============================================
-- 014: Add stripe_session_v2 to orders (dual-write migration)
--
-- Purpose: Migrate from stripe_session_id (text) to a validated
--          stripe_session_v2 column with a CHECK constraint.
--          Keep both columns during transition for safe rollback.
--
-- Strategy:
--   Phase 1: ADD COLUMN (zero-downtime DDL)
--   Phase 2: BACKFILL in batches (non-blocking)
--   Phase 3: VALIDATE check constraint
--   Phase 4: Code reads from v2, writes to both (dual-write)
--   Phase 5: DROP old column (after verification period — separate migration)
--
-- Rollback: DROP stripe_session_v2 (old column untouched)
-- Depends on: 001_core_schema
-- Idempotent: safe to re-run
-- =============================================

BEGIN;

-- ─── Phase 1: Add new column (instant for NULL default) ─────

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS stripe_session_v2 TEXT DEFAULT NULL;

-- Add CHECK constraint as NOT VALID first (no full-table scan)
-- This validates new rows immediately but skips existing rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_stripe_session_v2_format'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT chk_stripe_session_v2_format
      CHECK (stripe_session_v2 IS NULL OR stripe_session_v2 LIKE 'cs_%')
      NOT VALID;
  END IF;
END $$;

-- Index for querying by new column
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_v2
  ON orders (stripe_session_v2)
  WHERE stripe_session_v2 IS NOT NULL;

-- Track migration progress
CREATE TABLE IF NOT EXISTS _migration_progress (
  migration_id TEXT PRIMARY KEY,
  total_rows   INTEGER DEFAULT 0,
  migrated     INTEGER DEFAULT 0,
  started_at   TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status       TEXT CHECK (status IN ('running', 'completed', 'rolled_back')) DEFAULT 'running'
);

INSERT INTO _migration_progress (migration_id, status)
VALUES ('014_stripe_session_v2', 'running')
ON CONFLICT (migration_id) DO NOTHING;

-- Count total rows to migrate
UPDATE _migration_progress
SET total_rows = (
  SELECT COUNT(*) FROM orders
  WHERE stripe_session_id IS NOT NULL AND stripe_session_v2 IS NULL
)
WHERE migration_id = '014_stripe_session_v2';

COMMIT;

-- =============================================
-- Phase 2: Backfill in batches (run outside transaction for non-blocking)
-- Execute this repeatedly until 0 rows affected.
-- =============================================

-- Batch backfill: 1000 rows at a time, skip locked to avoid contention
WITH batch AS (
  SELECT id FROM orders
  WHERE stripe_session_id IS NOT NULL
    AND stripe_session_v2 IS NULL
  LIMIT 1000
  FOR UPDATE SKIP LOCKED
)
UPDATE orders
SET stripe_session_v2 = stripe_session_id,
    updated_at = NOW()
WHERE id IN (SELECT id FROM batch);

-- After each batch, update progress
UPDATE _migration_progress
SET migrated = (
  SELECT COUNT(*) FROM orders WHERE stripe_session_v2 IS NOT NULL
)
WHERE migration_id = '014_stripe_session_v2';
