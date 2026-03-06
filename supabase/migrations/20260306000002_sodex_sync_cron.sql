-- pg_cron job: sync sodex leaderboard hourly via pg_net
-- Uses vault secrets APP_URL and CRON_SECRET (same as other crons)

-- Remove old spot snapshot cron (route was deleted)
SELECT cron.unschedule('snapshot-spot-volumes');

-- Drop old function
DROP FUNCTION IF EXISTS call_snapshot_spot_volumes();

-- Create wrapper function for sodex leaderboard sync
CREATE OR REPLACE FUNCTION call_sync_sodex_leaderboard()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_url TEXT;
  cron_secret TEXT;
BEGIN
  SELECT decrypted_secret INTO app_url
    FROM vault.decrypted_secrets WHERE name = 'APP_URL';
  SELECT decrypted_secret INTO cron_secret
    FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET';

  IF app_url IS NULL OR cron_secret IS NULL THEN
    RAISE EXCEPTION 'Missing vault secrets APP_URL or CRON_SECRET';
  END IF;

  PERFORM net.http_get(
    url := app_url || '/api/cron/sync-sodex-leaderboard',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || cron_secret
    )
  );
END;
$$;

-- Schedule: every hour at minute 15
SELECT cron.schedule(
  'sync-sodex-leaderboard',
  '15 * * * *',
  'SELECT call_sync_sodex_leaderboard()'
);
