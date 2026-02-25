-- 016: Add missing columns to orders table
-- These columns are referenced in the checkout API but were never added via migration.
-- All statements use ADD COLUMN IF NOT EXISTS so this is safe to re-run.

-- Also re-applies promo columns from 009 in case that migration was never executed.
-- Requires promo_codes table; if it does not exist yet, run 009_promo_codes.sql first.

-- ─── Promo columns (009 catch-up) ────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

-- ─── Contact columns ──────────────────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email TEXT NOT NULL DEFAULT '';

-- ─── Idempotency (prevents duplicate orders on double-submit) ─────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key UUID;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key ON orders (idempotency_key) WHERE idempotency_key IS NOT NULL;
