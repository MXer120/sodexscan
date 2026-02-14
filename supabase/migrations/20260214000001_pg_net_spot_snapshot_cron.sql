-- ============================================================
-- Automate spot volume snapshots via pg_cron + pg_net
-- Calls the Next.js API route every Saturday at 00:05 UTC
-- (5 min after the weekly freeze at 00:00)
-- ============================================================

-- Enable pg_net for HTTP requests from Postgres
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create a wrapper function that calls the snapshot API
CREATE OR REPLACE FUNCTION call_snapshot_spot_volumes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_url TEXT;
  cron_secret TEXT;
BEGIN
  -- Read secrets from vault (must be set via Supabase dashboard or CLI)
  SELECT decrypted_secret INTO app_url
    FROM vault.decrypted_secrets WHERE name = 'APP_URL';
  SELECT decrypted_secret INTO cron_secret
    FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET';

  IF app_url IS NULL OR cron_secret IS NULL THEN
    RAISE EXCEPTION 'Missing vault secrets APP_URL or CRON_SECRET';
  END IF;

  -- Fire HTTP GET to the snapshot endpoint
  PERFORM net.http_get(
    url := app_url || '/api/cron/snapshot-spot-volumes',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || cron_secret
    )
  );
END;
$$;

-- Schedule: Saturday 00:05 UTC (5 min after freeze)
SELECT cron.schedule(
  'snapshot-spot-volumes',
  '5 0 * * 6',
  'SELECT call_snapshot_spot_volumes()'
);
