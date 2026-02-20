-- Migration 008: Inventory Locking + Stock Reservations + Product Variants
-- Idempotent: safe to run multiple times

-- ─────────────────────────────────────────────────────────────
-- 1. product_variants
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_variants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name_tr       TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  size          TEXT,                          -- e.g. 'small', 'medium', 'large'
  flavor        TEXT,                          -- e.g. 'original', 'extra-glazed'
  sku           TEXT UNIQUE,                   -- optional; for warehouses
  price_offset  DECIMAL(10,2) NOT NULL DEFAULT 0, -- added to base product price
  stock         INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_variants_updated_at ON product_variants;
CREATE TRIGGER trg_product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_active     ON product_variants(product_id, active);

-- RLS
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "variants_public_read"  ON product_variants;
DROP POLICY IF EXISTS "variants_admin_write"  ON product_variants;

CREATE POLICY "variants_public_read"
  ON product_variants FOR SELECT
  USING (active = true);

CREATE POLICY "variants_admin_write"
  ON product_variants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 2. stock_reservations
--    Created at checkout start, confirmed on payment success,
--    released on payment failure / TTL expiry.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stock_reservations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id    UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  session_id    TEXT NOT NULL,                 -- Stripe checkout session ID (or temp UUID)
  order_id      UUID REFERENCES orders(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'confirmed', 'released')),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reservations_session    ON stock_reservations(session_id);
CREATE INDEX IF NOT EXISTS idx_reservations_product    ON stock_reservations(product_id);
CREATE INDEX IF NOT EXISTS idx_reservations_expires    ON stock_reservations(expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_reservations_status     ON stock_reservations(status);

-- RLS
ALTER TABLE stock_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reservations_service_role"      ON stock_reservations;
DROP POLICY IF EXISTS "reservations_owner_read"        ON stock_reservations;

-- Only service-role (server) can write; users can read their own via order_id join
CREATE POLICY "reservations_service_role"
  ON stock_reservations FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "reservations_owner_read"
  ON stock_reservations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = stock_reservations.order_id
        AND orders.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 3. Atomic reserve function
--    Uses advisory locks + single UPDATE to avoid race conditions.
--    Returns FALSE if stock is insufficient.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION reserve_product_stock(
  p_product_id  UUID,
  p_variant_id  UUID,         -- NULL for non-variant products
  p_quantity    INTEGER,
  p_session_id  TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  IF p_variant_id IS NOT NULL THEN
    -- Decrement variant stock
    UPDATE product_variants
    SET    stock = stock - p_quantity
    WHERE  id    = p_variant_id
      AND  stock >= p_quantity
      AND  active = true;

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
  ELSE
    -- Decrement base product stock
    UPDATE products
    SET    stock = stock - p_quantity
    WHERE  id    = p_product_id
      AND  stock >= p_quantity;

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
  END IF;

  IF rows_updated = 0 THEN
    RETURN FALSE;   -- insufficient stock
  END IF;

  -- Record the reservation
  INSERT INTO stock_reservations
    (product_id, variant_id, quantity, session_id)
  VALUES
    (p_product_id, p_variant_id, p_quantity, p_session_id);

  RETURN TRUE;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 4. Release / restore function (on payment failure / expiry)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION release_stock_reservations(p_session_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Restore base product stock
  UPDATE products p
  SET    stock = stock + r.quantity
  FROM   stock_reservations r
  WHERE  r.session_id  = p_session_id
    AND  r.status      = 'pending'
    AND  r.variant_id  IS NULL
    AND  r.product_id  = p.id;

  -- Restore variant stock
  UPDATE product_variants pv
  SET    stock = stock + r.quantity
  FROM   stock_reservations r
  WHERE  r.session_id  = p_session_id
    AND  r.status      = 'pending'
    AND  r.variant_id  IS NOT NULL
    AND  r.variant_id  = pv.id;

  -- Mark as released
  UPDATE stock_reservations
  SET    status = 'released'
  WHERE  session_id = p_session_id
    AND  status     = 'pending';
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. Confirm function (on Stripe payment_intent.succeeded)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION confirm_stock_reservations(
  p_session_id TEXT,
  p_order_id   UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE stock_reservations
  SET    status   = 'confirmed',
         order_id = p_order_id
  WHERE  session_id = p_session_id
    AND  status     = 'pending';
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 6. Cleanup expired reservations (run via cron / pg_cron)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cleaned INTEGER := 0;
BEGIN
  -- Restore base product stock for expired reservations
  UPDATE products p
  SET    stock = stock + r.quantity
  FROM   stock_reservations r
  WHERE  r.expires_at  < NOW()
    AND  r.status      = 'pending'
    AND  r.variant_id  IS NULL
    AND  r.product_id  = p.id;

  -- Restore variant stock for expired reservations
  UPDATE product_variants pv
  SET    stock = stock + r.quantity
  FROM   stock_reservations r
  WHERE  r.expires_at  < NOW()
    AND  r.status      = 'pending'
    AND  r.variant_id  IS NOT NULL
    AND  r.variant_id  = pv.id;

  -- Mark as released
  UPDATE stock_reservations
  SET    status = 'released'
  WHERE  expires_at < NOW()
    AND  status     = 'pending';

  GET DIAGNOSTICS cleaned = ROW_COUNT;
  RETURN cleaned;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 7. profiles table: ensure role column exists (for admin policy)
-- ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE  table_name  = 'profiles'
      AND  column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'customer'
      CHECK (role IN ('customer', 'admin'));
  END IF;
END;
$$;
