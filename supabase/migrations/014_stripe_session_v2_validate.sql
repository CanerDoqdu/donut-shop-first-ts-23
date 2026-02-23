-- =============================================
-- 014_stripe_session_v2 — Phase 3: Validate + Finalize
--
-- Run this AFTER backfill is 100% complete.
-- Validates the CHECK constraint (full-table scan, but non-blocking in PG 12+).
-- Marks migration as completed.
-- =============================================

BEGIN;

-- Validate the constraint (scans existing rows, acquires SHARE UPDATE EXCLUSIVE lock)
ALTER TABLE orders VALIDATE CONSTRAINT chk_stripe_session_v2_format;

-- Mark migration complete
UPDATE _migration_progress
SET status = 'completed',
    completed_at = NOW()
WHERE migration_id = '014_stripe_session_v2';

COMMIT;
