-- pg_cron: call check-listing-alerts every minute.
-- Requires in Supabase Vault:
--   SERVICE_ROLE_KEY → the service_role JWT from Supabase project settings
--                      (same key used by check-price-alerts jobs 105/106)
--
-- The Edge Function is stateless — state is persisted in cron_state_cache.
-- First run builds a baseline snapshot and fires NO alerts (avoids spam).
-- From the second tick onward it diffs and fires for any new symbols.

CREATE OR REPLACE FUNCTION call_check_listing_alerts()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  svc_key text;
BEGIN
  SELECT decrypted_secret INTO svc_key
    FROM vault.decrypted_secrets
   WHERE name = 'SERVICE_ROLE_KEY';

  PERFORM net.http_post(
    url     := 'https://yifkydhsbflzfprteots.supabase.co/functions/v1/check-listing-alerts',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || svc_key,
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  );
END;
$$;

-- Remove old schedule if re-running this migration
SELECT cron.unschedule('check-listing-alerts')
  FROM cron.job
 WHERE jobname = 'check-listing-alerts';

SELECT cron.schedule(
  'check-listing-alerts',
  '* * * * *',
  'SELECT call_check_listing_alerts()'
);
