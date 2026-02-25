-- ============================================================
-- Migration 013: Product reviews with moderation state machine
-- ============================================================
-- Adds status column + moderation columns to existing reviews table (from 002).
-- The reviews table from 002 uses is_approved (boolean).
-- This migration upgrades it with a proper state machine:
--   pending → approved | rejected | flagged

-- ─── Add moderation columns if missing ───────────────────

DO $$
BEGIN
  -- Add status column (text state machine) if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'status'
  ) THEN
    ALTER TABLE reviews ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'approved', 'rejected', 'flagged'));
    -- Backfill: approved reviews stay approved, rest default to pending
    UPDATE reviews SET status = 'approved' WHERE is_approved = true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'body'
  ) THEN
    ALTER TABLE reviews ADD COLUMN body TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'flag_reason'
  ) THEN
    ALTER TABLE reviews ADD COLUMN flag_reason TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'moderated_by'
  ) THEN
    ALTER TABLE reviews ADD COLUMN moderated_by UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'moderated_at'
  ) THEN
    ALTER TABLE reviews ADD COLUMN moderated_at TIMESTAMPTZ;
  END IF;
END $$;

-- ─── Indexes ─────────────────────────────────────────────

-- Fast lookup for product page (only approved)
CREATE INDEX IF NOT EXISTS idx_reviews_product_approved
  ON reviews (product_id, created_at DESC)
  WHERE status = 'approved';

-- Admin moderation queue
CREATE INDEX IF NOT EXISTS idx_reviews_pending
  ON reviews (status, created_at ASC)
  WHERE status IN ('pending', 'flagged');

-- ── RLS ──────────────────────────────────────────────────
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved reviews
DROP POLICY IF EXISTS "public_read_approved_reviews" ON reviews;
CREATE POLICY "public_read_approved_reviews" ON reviews
  FOR SELECT
  USING (status = 'approved');

-- Users can insert their own reviews
DROP POLICY IF EXISTS "users_insert_own_review" ON reviews;
CREATE POLICY "users_insert_own_review" ON reviews
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending reviews
DROP POLICY IF EXISTS "users_update_own_pending" ON reviews;
CREATE POLICY "users_update_own_pending" ON reviews
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Admins can read and update all reviews
DROP POLICY IF EXISTS "admin_manage_reviews" ON reviews;
CREATE POLICY "admin_manage_reviews" ON reviews
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ── Auto-flag trigger ────────────────────────────────────

CREATE OR REPLACE FUNCTION auto_flag_review()
RETURNS TRIGGER AS $$
DECLARE
  profanity_words TEXT[] := ARRAY['spam', 'scam', 'fake', 'hate', 'kill'];
  word TEXT;
BEGIN
  -- Flag 1-star reviews with no body
  IF NEW.rating = 1 AND (NEW.body IS NULL OR trim(NEW.body) = '') THEN
    NEW.status := 'flagged';
    NEW.flag_reason := 'auto: 1-star with no review text';
    RETURN NEW;
  END IF;

  -- Simple profanity check
  IF NEW.body IS NOT NULL THEN
    FOREACH word IN ARRAY profanity_words LOOP
      IF lower(NEW.body) LIKE '%' || word || '%' THEN
        NEW.status := 'flagged';
        NEW.flag_reason := 'auto: profanity detected (' || word || ')';
        RETURN NEW;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_flag_review ON reviews;
CREATE TRIGGER trg_auto_flag_review
  BEFORE INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION auto_flag_review();
