-- Migration 022 Rollback: admin role boundary hardening
-- Reverts policy and trigger/function created in migration 022.

BEGIN;

DROP TRIGGER IF EXISTS trg_prevent_unauthorized_profile_role_change ON public.profiles;
DROP FUNCTION IF EXISTS public.prevent_unauthorized_profile_role_change();

DROP POLICY IF EXISTS "admin_manage_reviews" ON public.reviews;

-- Restore legacy policy shape (role check via profiles table).
CREATE POLICY "admin_manage_reviews" ON public.reviews
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

COMMIT;
