-- pg_cron: sync SoSoValue market data every 3 minutes
-- Stays within 20 req/min free-tier limit (~5 endpoints × 1 req = 5 calls per tick)

CREATE OR REPLACE FUNCTION call_sync_sosovalue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_url    text;
  cron_secret text;
BEGIN
  SELECT decrypted_secret INTO app_url
    FROM vault.decrypted_secrets WHERE name = 'APP_URL';
  SELECT decrypted_secret INTO cron_secret
    FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET';

  IF app_url IS NULL OR cron_secret IS NULL THEN
    RAISE EXCEPTION 'Missing vault secrets APP_URL or CRON_SECRET';
  END IF;

  PERFORM net.http_get(
    url     := app_url || '/api/cron/sync-sosovalue',
    headers := jsonb_build_object('Authorization', 'Bearer ' || cron_secret)
  );
END;
$$;

SELECT cron.schedule(
  'sync-sosovalue',
  '*/3 * * * *',
  'SELECT call_sync_sosovalue()'
);
