-- ============================================================
-- Schedule edge functions via pg_cron + pg_net
--
-- sync-existing-accounts-lb: every 5 min (updates PnL/vol)
-- sync-leaderboard: every 30 min (discovers new users)
--
-- Requires vault secrets:
--   SUPABASE_URL   = https://<project>.supabase.co
--   SUPABASE_ANON_KEY = <anon key>
-- ============================================================

-- 1. Wrapper: invoke sync-existing-accounts-lb
CREATE OR REPLACE FUNCTION call_sync_existing_accounts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sb_url TEXT;
  sb_key TEXT;
BEGIN
  SELECT decrypted_secret INTO sb_url
    FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL';
  SELECT decrypted_secret INTO sb_key
    FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY';

  IF sb_url IS NULL OR sb_key IS NULL THEN
    RAISE EXCEPTION 'Missing vault secrets SUPABASE_URL or SUPABASE_ANON_KEY';
  END IF;

  PERFORM net.http_post(
    url := sb_url || '/functions/v1/sync-existing-accounts-lb',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || sb_key
    )
  );
END;
$$;

-- 2. Wrapper: invoke sync-leaderboard
CREATE OR REPLACE FUNCTION call_sync_new_accounts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sb_url TEXT;
  sb_key TEXT;
BEGIN
  SELECT decrypted_secret INTO sb_url
    FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL';
  SELECT decrypted_secret INTO sb_key
    FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY';

  IF sb_url IS NULL OR sb_key IS NULL THEN
    RAISE EXCEPTION 'Missing vault secrets SUPABASE_URL or SUPABASE_ANON_KEY';
  END IF;

  PERFORM net.http_post(
    url := sb_url || '/functions/v1/sync-leaderboard',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || sb_key
    )
  );
END;
$$;

-- 3. Schedule cron jobs
SELECT cron.schedule(
  'sync-existing-accounts',
  '*/5 * * * *',
  'SELECT call_sync_existing_accounts()'
);

SELECT cron.schedule(
  'sync-new-accounts',
  '*/30 * * * *',
  'SELECT call_sync_new_accounts()'
);
