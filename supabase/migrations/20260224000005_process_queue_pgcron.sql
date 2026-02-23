-- ============================================================
-- Move process-queue cron from Vercel to pg_cron + pg_net
-- Vercel Hobby limits crons to once/day; pg_cron has no limit.
-- ============================================================

-- Wrapper function: calls /api/cron/process-queue via pg_net
CREATE OR REPLACE FUNCTION call_process_queue()
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
    url := app_url || '/api/cron/process-queue',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || cron_secret
    )
  );
END;
$$;

-- Schedule every minute
SELECT cron.schedule(
  'process-http-queue',
  '* * * * *',
  'SELECT call_process_queue()'
);
