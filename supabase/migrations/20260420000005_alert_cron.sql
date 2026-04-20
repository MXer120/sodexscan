-- pg_cron: process alert queue every 30s via Edge Function
-- Also adds helper RPC used by process-alert-queue

CREATE OR REPLACE FUNCTION increment_alert_retries(ids bigint[])
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE alert_queue
  SET retries = retries + 1,
      status  = CASE WHEN retries + 1 >= 3 THEN 'failed'::alert_status_enum ELSE 'pending'::alert_status_enum END
  WHERE id = ANY(ids);
$$;

CREATE OR REPLACE FUNCTION call_process_alert_queue()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  supabase_url text;
  service_key  text;
BEGIN
  SELECT decrypted_secret INTO supabase_url
    FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL';
  SELECT decrypted_secret INTO service_key
    FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY';

  PERFORM net.http_post(
    url     := supabase_url || '/functions/v1/process-alert-queue',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || service_key,
      'Content-Type', 'application/json'
    ),
    body    := '{}'::jsonb
  );
END;
$$;

SELECT cron.schedule(
  'process-alert-queue',
  '*/1 * * * *',  -- every minute (pg_cron min resolution; Edge Function runs fast)
  'SELECT call_process_alert_queue()'
);

-- pg_cron: Sodex health probe every minute (maintenance alerts)
CREATE OR REPLACE FUNCTION call_probe_sodex_health()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  app_url     text;
  cron_secret text;
BEGIN
  SELECT decrypted_secret INTO app_url    FROM vault.decrypted_secrets WHERE name = 'APP_URL';
  SELECT decrypted_secret INTO cron_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET';

  PERFORM net.http_get(
    url     := app_url || '/api/cron/probe-sodex-health',
    headers := jsonb_build_object('Authorization', 'Bearer ' || cron_secret)
  );
END;
$$;

SELECT cron.schedule(
  'probe-sodex-health',
  '* * * * *',
  'SELECT call_probe_sodex_health()'
);
