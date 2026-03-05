-- Migration 022: Harden admin role boundary
--
-- Fixes privilege escalation path where authenticated users could update
-- profiles.role on their own row and pass admin checks that relied on it.
--
-- Changes:
-- 1) reviews admin policy now checks admin_users table membership
-- 2) prevent non-admin users from changing profiles.role via trigger

BEGIN;

-- Use authoritative admin membership table for review moderation RLS.
DROP POLICY IF EXISTS "admin_manage_reviews" ON public.reviews;

CREATE POLICY "admin_manage_reviews" ON public.reviews
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Block role escalation attempts by non-admin users.
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_profile_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'forbidden_role_change';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_unauthorized_profile_role_change ON public.profiles;

CREATE TRIGGER trg_prevent_unauthorized_profile_role_change
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_unauthorized_profile_role_change();

COMMIT;
