-- Migration 018: Security Hardening
-- Fixes all Supabase linter security warnings:
--   1. Function Search Path Mutable (19 functions) → SET search_path = ''
--   2. RLS Policy Always True (orders, order_items INSERT) → restrict to authenticated + service_role
--
-- NOTE: "Leaked Password Protection" must be enabled in Supabase Dashboard:
--   Authentication → Settings → Password Protection → Enable "Leaked password protection"

-- ============================================================
-- 1. SET search_path = '' on all public functions
--    This prevents search_path injection attacks where a malicious
--    schema could shadow public tables/functions.
-- ============================================================

ALTER FUNCTION public.rollback_promo_code              SET search_path = '';
ALTER FUNCTION public.update_updated_at_column         SET search_path = '';
ALTER FUNCTION public.handle_new_user                  SET search_path = '';
ALTER FUNCTION public.calculate_loyalty_tier           SET search_path = '';
ALTER FUNCTION public.update_product_rating            SET search_path = '';
ALTER FUNCTION public.award_order_points               SET search_path = '';
ALTER FUNCTION public.generate_referral_code           SET search_path = '';
ALTER FUNCTION public.create_user_referral_code        SET search_path = '';
ALTER FUNCTION public.soft_delete_order                SET search_path = '';
ALTER FUNCTION public.prevent_audit_log_mutation       SET search_path = '';
ALTER FUNCTION public.set_updated_at                   SET search_path = '';
ALTER FUNCTION public.reserve_product_stock            SET search_path = '';
ALTER FUNCTION public.release_stock_reservations       SET search_path = '';
ALTER FUNCTION public.confirm_stock_reservations       SET search_path = '';
ALTER FUNCTION public.cleanup_expired_reservations     SET search_path = '';
ALTER FUNCTION public.apply_promo_code                 SET search_path = '';
ALTER FUNCTION public.products_search_vector_trigger   SET search_path = '';
ALTER FUNCTION public.fts_search_products              SET search_path = '';
ALTER FUNCTION public.auto_flag_review                 SET search_path = '';

-- ============================================================
-- 2. Fix overly permissive RLS policies on orders & order_items
--    Current: WITH CHECK (true) → anyone (even anon) can INSERT
--    Fixed:   Only authenticated users OR service_role can INSERT
-- ============================================================

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;

-- Recreate with proper restrictions:
-- Authenticated users can create orders (for their own user_id)
CREATE POLICY "Authenticated users can create orders"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
  );

-- Service role (used by checkout API) can always insert orders
-- This is implicit — service_role bypasses RLS entirely.
-- No separate policy needed.

-- Authenticated users can create order items for their own orders
CREATE POLICY "Authenticated users can create order items"
  ON public.order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
  );

-- ============================================================
-- Done. After applying this migration, re-run the Supabase linter
-- to verify all warnings are resolved.
--
-- For "Leaked Password Protection":
--   Go to Supabase Dashboard → Authentication → Settings
--   → Enable "Leaked password protection"
-- ============================================================
