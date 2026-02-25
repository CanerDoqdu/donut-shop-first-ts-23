-- Migration 019: Fix profile name + add sync trigger
-- Fixes Issue #6: Wrong username displayed

-- 1. Fix current stale profile name
UPDATE public.profiles 
SET full_name = 'Caner Doğdu', updated_at = now()
WHERE id = 'e1023f11-b5b7-44fe-81a1-51a5bb11deb1'
  AND full_name IS DISTINCT FROM 'Caner Doğdu';

-- 2. Create/replace function that syncs profile name from auth metadata on every login
CREATE OR REPLACE FUNCTION public.sync_profile_on_auth_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _new_name text;
BEGIN
  -- Get the name from Google OAuth metadata (or any provider)
  _new_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    NULL
  );
  
  -- Only update if there's actually a name and it's different
  IF _new_name IS NOT NULL THEN
    UPDATE public.profiles
    SET full_name = _new_name,
        updated_at = now()
    WHERE id = NEW.id
      AND full_name IS DISTINCT FROM _new_name;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Create the trigger on auth.users for UPDATE events
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_on_auth_update();
