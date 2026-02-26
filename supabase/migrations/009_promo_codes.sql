  -- Migration 009: Promotional Codes
  -- Supports flat and percentage discounts with max_uses, min_order, and expiry.
  -- Includes an atomic RPC function to validate + apply a promo code in one call.

  -- ─── Table ──────────────────────────────────────────────────

  CREATE TABLE IF NOT EXISTS promo_codes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code          TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('flat', 'pct')),
    amount        NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    min_order     NUMERIC(10, 2) NOT NULL DEFAULT 0,
    max_uses      INT NOT NULL DEFAULT 1,
    used_count    INT NOT NULL DEFAULT 0,
    active        BOOLEAN NOT NULL DEFAULT true,
    expires_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Index for fast code lookup (case-insensitive)
  CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_codes_upper_code
    ON promo_codes (UPPER(code));

  -- ─── RLS ────────────────────────────────────────────────────

  ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

  -- Public can read active promo codes (for validation)
  DROP POLICY IF EXISTS promo_codes_read ON promo_codes;
  CREATE POLICY promo_codes_read ON promo_codes
    FOR SELECT USING (active = true);

  -- Only service_role can insert/update/delete
  DROP POLICY IF EXISTS promo_codes_admin ON promo_codes;
  CREATE POLICY promo_codes_admin ON promo_codes
    FOR ALL USING (auth.role() = 'service_role');

  -- ─── Atomic validate-and-apply RPC ─────────────────────────
  -- Called from checkout to atomically:
  --   1. Find the promo code
  --   2. Check eligibility (active, not expired, not depleted, min_order)
  --   3. Increment used_count
  --   4. Return the discount amount
  --
  -- Uses SELECT ... FOR UPDATE to prevent concurrent race conditions.

  CREATE OR REPLACE FUNCTION apply_promo_code(
    p_code       TEXT,
    p_order_total NUMERIC
  )
  RETURNS TABLE (
    promo_id       UUID,
    discount_type  TEXT,
    discount_value NUMERIC,
    final_total    NUMERIC,
    error_reason   TEXT
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  DECLARE
    v_promo    promo_codes%ROWTYPE;
    v_discount NUMERIC;
  BEGIN
    -- Lock the row to prevent concurrent use
    SELECT * INTO v_promo
      FROM promo_codes pc
      WHERE UPPER(pc.code) = UPPER(p_code)
      FOR UPDATE;

    -- Code not found
    IF NOT FOUND THEN
      RETURN QUERY SELECT
        NULL::UUID, NULL::TEXT, 0::NUMERIC, p_order_total, 'INVALID_CODE'::TEXT;
      RETURN;
    END IF;

    -- Inactive
    IF NOT v_promo.active THEN
      RETURN QUERY SELECT
        v_promo.id, NULL::TEXT, 0::NUMERIC, p_order_total, 'INACTIVE'::TEXT;
      RETURN;
    END IF;

    -- Expired
    IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < now() THEN
      RETURN QUERY SELECT
        v_promo.id, NULL::TEXT, 0::NUMERIC, p_order_total, 'EXPIRED'::TEXT;
      RETURN;
    END IF;

    -- Depleted
    IF v_promo.used_count >= v_promo.max_uses THEN
      RETURN QUERY SELECT
        v_promo.id, NULL::TEXT, 0::NUMERIC, p_order_total, 'DEPLETED'::TEXT;
      RETURN;
    END IF;

    -- Minimum order not met
    IF p_order_total < v_promo.min_order THEN
      RETURN QUERY SELECT
        v_promo.id, NULL::TEXT, 0::NUMERIC, p_order_total, 'MIN_ORDER_NOT_MET'::TEXT;
      RETURN;
    END IF;

    -- Calculate discount
    IF v_promo.discount_type = 'pct' THEN
      v_discount := ROUND(p_order_total * (v_promo.amount / 100), 2);
    ELSE
      v_discount := LEAST(v_promo.amount, p_order_total); -- never exceed total
    END IF;

    -- Increment used_count
    UPDATE promo_codes
      SET used_count = used_count + 1,
          updated_at = now()
      WHERE id = v_promo.id;

    RETURN QUERY SELECT
      v_promo.id,
      v_promo.discount_type,
      v_discount,
      GREATEST(p_order_total - v_discount, 0::NUMERIC),
      NULL::TEXT;
  END;
  $$;

  -- ─── Rollback helper: undo a promo application ─────────────
  -- Called when checkout fails after promo was applied.

  CREATE OR REPLACE FUNCTION rollback_promo_code(p_promo_id UUID)
  RETURNS VOID
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  BEGIN
    UPDATE promo_codes
      SET used_count = GREATEST(used_count - 1, 0),
          updated_at = now()
      WHERE id = p_promo_id;
  END;
  $$;

  -- ─── Add promo columns to orders table ─────────────────────

  ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES promo_codes(id);
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;

  -- ─── Seed some test promo codes ─────────────────────────────

  INSERT INTO promo_codes (code, discount_type, amount, min_order, max_uses, active, expires_at)
  VALUES
    ('WELCOME10', 'pct', 10, 50, 1000, true, '2027-12-31'::timestamptz),
    ('FLAT25', 'flat', 25, 100, 500, true, '2027-12-31'::timestamptz),
    ('EXPIRED99', 'pct', 99, 0, 100, true, '2020-01-01'::timestamptz),
    ('USED_UP', 'flat', 10, 0, 0, true, NULL),
    ('INACTIVE1', 'pct', 50, 0, 100, false, NULL)
  ON CONFLICT (code) DO NOTHING;
