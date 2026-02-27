-- Migration 021: Fix Admin RLS + Consolidate Signup Trigger
--
-- CRITICAL FIX 1: Replace dead `auth.jwt() ->> 'role' = 'admin'` checks
-- with `EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())`.
-- The old JWT claim was never populated, making all admin RLS policies dead code.
--
-- CRITICAL FIX 3: Consolidate signup record creation in the DB trigger.
-- Previously, profile was created by trigger but loyalty_points and
-- referral_codes were created by the server action (using user-level client,
-- which could fail under RLS). Now the trigger handles all three idempotently.
--
-- Also adds missing INSERT policy for profiles table.

BEGIN;

-- ============================================================
-- 1. Fix Admin RLS on products
-- ============================================================

DROP POLICY IF EXISTS "Products are editable by admin only" ON public.products;

CREATE POLICY "Products are editable by admin only"
  ON public.products
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- ============================================================
-- 2. Fix Admin RLS on orders (view + update)
-- ============================================================

-- Drop old policies that used dead JWT claim
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Admin can update orders" ON public.orders;

-- Users can view their own orders, admins can view all
CREATE POLICY "Users can view own orders"
  ON public.orders
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Only admins can update orders (status changes etc.)
CREATE POLICY "Admin can update orders"
  ON public.orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- ============================================================
-- 3. Fix Admin RLS on order_items (view)
-- ============================================================

DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;

CREATE POLICY "Users can view own order items"
  ON public.order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND (
          orders.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.user_id = auth.uid()
          )
        )
    )
  );

-- ============================================================
-- 4. Add missing INSERT policy for profiles
--    (handle_new_user trigger runs as SECURITY DEFINER so it bypasses RLS,
--     but we need this for any direct client inserts)
-- ============================================================

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- 5. Consolidate handle_new_user trigger
--    Now creates: profile + loyalty_points + referral_code
--    All idempotent (ON CONFLICT DO NOTHING)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _referral_code TEXT;
BEGIN
  -- Create profile (idempotent)
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      NULL
    )
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create initial loyalty points (idempotent)
  INSERT INTO public.loyalty_points (user_id, total_points, lifetime_points, tier)
  VALUES (NEW.id, 0, 0, 'bronze')
  ON CONFLICT (user_id) DO NOTHING;

  -- Create referral code (idempotent)
  _referral_code := 'REF-' || UPPER(SUBSTRING(NEW.id::text FROM 1 FOR 8));
  INSERT INTO public.referral_codes (user_id, code, reward_points)
  VALUES (NEW.id, _referral_code, 100)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Recreate the trigger (unchanged target)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 6. Add product_image column to order_items if missing
--    (checkout writes this column but it may not exist in all envs)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'order_items'
      AND column_name = 'product_image'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN product_image TEXT;
  END IF;
END $$;

COMMIT;
