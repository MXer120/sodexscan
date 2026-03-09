-- Fix Supabase Security Linter warnings:
-- 1) function_search_path_mutable: set search_path on all public functions
-- 2) rls_policy_always_true: restrict sync_cursor policy

-- ============================================================
-- 1) Set search_path = 'public' on all public schema functions
--    that don't already have it set.
--    This is purely declarative - no function logic changes.
-- ============================================================
DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND (p.proconfig IS NULL
           OR NOT EXISTS (
             SELECT 1 FROM unnest(p.proconfig) c
             WHERE c LIKE 'search_path=%'
           ))
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', fn);
  END LOOP;
END;
$$;

-- ============================================================
-- 2) Fix sync_cursor RLS policy
--    service_role bypasses RLS entirely, so the permissive
--    "USING (true)" policy just opens the table to anon/auth.
--    Drop the overly-broad policy - service_role still works.
-- ============================================================
DROP POLICY IF EXISTS "service_role_all" ON public.sync_cursor;
