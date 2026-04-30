-- Supabase pg_cron: call check-price-alerts every minute.
-- Uses the same pattern as call_probe_sodex_health (migration 5).
-- Requires in Supabase Vault:
--   APP_URL      → your production URL, e.g. https://www.communityscan-sodex.com
--   CRON_SECRET  → the same value as your CRON_SECRET env var in Vercel

CREATE OR REPLACE FUNCTION call_check_price_alerts()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  app_url     text;
  cron_secret text;
BEGIN
  SELECT decrypted_secret INTO app_url
    FROM vault.decrypted_secrets WHERE name = 'APP_URL';
  SELECT decrypted_secret INTO cron_secret
    FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET';

  PERFORM net.http_get(
    url     := app_url || '/api/cron/check-price-alerts',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || cron_secret
    )
  );
END;
$$;

-- Remove old Vercel-driven schedule if it exists from a previous run
SELECT cron.unschedule('check-price-alerts') FROM cron.job WHERE jobname = 'check-price-alerts';

SELECT cron.schedule(
  'check-price-alerts',
  '* * * * *',
  'SELECT call_check_price_alerts()'
);
