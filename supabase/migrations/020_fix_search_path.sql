-- Migration 020: Fix search_path for all SECURITY DEFINER functions
--
-- Migration 018 set search_path = '' on all functions, but function bodies use
-- unqualified table names (e.g. UPDATE products, INSERT INTO stock_reservations).
-- With search_path = '', Postgres can't resolve these names → functions fail.
--
-- Fix: change search_path from '' to 'public' — still prevents search_path
-- injection attacks (the linter's concern) while allowing functions to resolve
-- tables correctly.
--
-- This was the root cause of the checkout 500 "Conflict" / "Internal Server Error".

ALTER FUNCTION public.rollback_promo_code              SET search_path = 'public';
ALTER FUNCTION public.update_updated_at_column         SET search_path = 'public';
ALTER FUNCTION public.handle_new_user                  SET search_path = 'public';
ALTER FUNCTION public.calculate_loyalty_tier           SET search_path = 'public';
ALTER FUNCTION public.update_product_rating            SET search_path = 'public';
ALTER FUNCTION public.award_order_points               SET search_path = 'public';
ALTER FUNCTION public.generate_referral_code           SET search_path = 'public';
ALTER FUNCTION public.create_user_referral_code        SET search_path = 'public';
ALTER FUNCTION public.soft_delete_order                SET search_path = 'public';
ALTER FUNCTION public.prevent_audit_log_mutation       SET search_path = 'public';
ALTER FUNCTION public.set_updated_at                   SET search_path = 'public';
ALTER FUNCTION public.reserve_product_stock            SET search_path = 'public';
ALTER FUNCTION public.release_stock_reservations       SET search_path = 'public';
ALTER FUNCTION public.confirm_stock_reservations       SET search_path = 'public';
ALTER FUNCTION public.cleanup_expired_reservations     SET search_path = 'public';
ALTER FUNCTION public.apply_promo_code                 SET search_path = 'public';
ALTER FUNCTION public.products_search_vector_trigger   SET search_path = 'public';
ALTER FUNCTION public.fts_search_products              SET search_path = 'public';
ALTER FUNCTION public.auto_flag_review                 SET search_path = 'public';

-- Also fix the new function from migration 019
ALTER FUNCTION public.sync_profile_on_auth_update      SET search_path = 'public';
