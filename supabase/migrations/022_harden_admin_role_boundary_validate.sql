-- Migration 022 Validate: admin role boundary hardening
-- Run after 022_harden_admin_role_boundary.sql

BEGIN;

-- Validate policy exists and references admin_users.
DO $$
DECLARE
  policy_def text;
BEGIN
  SELECT pg_get_expr(pol.qual, pol.polrelid)
  INTO policy_def
  FROM pg_policy pol
  JOIN pg_class cls ON cls.oid = pol.polrelid
  JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
  WHERE nsp.nspname = 'public'
    AND cls.relname = 'reviews'
    AND pol.polname = 'admin_manage_reviews';

  IF policy_def IS NULL THEN
    RAISE EXCEPTION 'admin_manage_reviews policy is missing';
  END IF;

  IF position('admin_users' in policy_def) = 0 THEN
    RAISE EXCEPTION 'admin_manage_reviews policy does not use admin_users membership';
  END IF;
END $$;

-- Validate trigger is present.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'profiles'
      AND t.tgname = 'trg_prevent_unauthorized_profile_role_change'
      AND NOT t.tgisinternal
  ) THEN
    RAISE EXCEPTION 'trg_prevent_unauthorized_profile_role_change trigger is missing';
  END IF;
END $$;

COMMIT;
