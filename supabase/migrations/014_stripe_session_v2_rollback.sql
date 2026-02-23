-- =============================================
-- 014_stripe_session_v2 — ROLLBACK
--
-- Run this if the migration needs to be reverted.
-- Safe: does NOT touch the original stripe_session_id column.
--
-- Steps:
--   1. Drop the new column (cascade drops the index + constraint)
--   2. Mark migration as rolled back
--   3. Code will fall back to reading stripe_session_id only
-- =============================================

BEGIN;

-- Drop the new column (also drops index + constraint automatically)
ALTER TABLE orders DROP COLUMN IF EXISTS stripe_session_v2;

-- Update tracking
UPDATE _migration_progress
SET status = 'rolled_back',
    completed_at = NOW()
WHERE migration_id = '014_stripe_session_v2';

COMMIT;
