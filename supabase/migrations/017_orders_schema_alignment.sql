-- 017: Align orders table schema
-- The orders table was created before migration 001 with different column names.
-- 001's CREATE TABLE IF NOT EXISTS was a no-op.  This migration adds the
-- genuinely missing columns while keeping the existing column names intact.

-- Columns that exist with different names (no change needed):
--   customer_email  (001 calls it user_email)
--   customer_phone  (001 calls it user_phone)
--   shipping_address (001 calls it user_address)
--   total_amount     (001 calls it total)

-- Add missing columns (idempotent)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax NUMERIC(10,2) NOT NULL DEFAULT 0;
