-- ============================================================
-- Migration 013: Product reviews with moderation state machine
-- ============================================================
-- States: pending → approved | rejected | flagged
-- Only approved reviews are visible to customers.

CREATE TABLE IF NOT EXISTS reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  TEXT NOT NULL,
  user_id     UUID NOT NULL,
  rating      SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title       TEXT,
  body        TEXT,
  status      TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  flag_reason TEXT,              -- reason when flagged
  moderated_by UUID,             -- admin who moderated
  moderated_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One review per user per product
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_user_product
  ON reviews (user_id, product_id);

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
CREATE POLICY "public_read_approved_reviews" ON reviews
  FOR SELECT
  USING (status = 'approved');

-- Users can insert their own reviews
CREATE POLICY "users_insert_own_review" ON reviews
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending reviews
CREATE POLICY "users_update_own_pending" ON reviews
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Admins can read and update all reviews
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
-- Flags reviews that are suspicious:
-- 1. 1-star with no body text
-- 2. Body contains profanity (simple word list)

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

CREATE TRIGGER trg_auto_flag_review
  BEFORE INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION auto_flag_review();
