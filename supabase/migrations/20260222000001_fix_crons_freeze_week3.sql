-- ============================================================
-- Fix: both Saturday crons failed for week 3 (2026-02-22).
--
-- Root causes:
--   1. freeze cron: unknown pg_cron issue (jobs exist but didn't fire)
--   2. snapshot cron: call_snapshot_spot_volumes() was rewritten to
--      enqueue into http_request_queue, but no queue processor exists.
--      Reverting to direct pg_net.http_get.
--
-- Actions:
--   1. Revert call_snapshot_spot_volumes() to use pg_net
--   2. Unschedule + reschedule all cron jobs
--   3. Run freeze_current_week() immediately for week 3
-- ============================================================

-- ============================================================
-- 1. Revert call_snapshot_spot_volumes() to use pg_net directly
-- ============================================================
CREATE OR REPLACE FUNCTION call_snapshot_spot_volumes()
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
    url := app_url || '/api/cron/snapshot-spot-volumes',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || cron_secret
    )
  );
END;
$$;

-- ============================================================
-- 2. Unschedule + reschedule all cron jobs
-- ============================================================
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname IN (
  'sync-current-week',
  'freeze-weekly-leaderboard',
  'snapshot-spot-volumes',
  'reindex-leaderboard',
  'cleanup-http-queue'
);

-- Sync every 15 min
SELECT cron.schedule(
  'sync-current-week',
  '*/15 * * * *',
  'SELECT sync_current_week()'
);

-- Freeze Saturday 00:00 UTC
SELECT cron.schedule(
  'freeze-weekly-leaderboard',
  '0 0 * * 6',
  'SELECT freeze_current_week()'
);

-- Spot snapshot Saturday 00:05 UTC (after freeze)
SELECT cron.schedule(
  'snapshot-spot-volumes',
  '5 0 * * 6',
  'SELECT call_snapshot_spot_volumes()'
);

-- Daily reindex at 04:00 UTC
SELECT cron.schedule(
  'reindex-leaderboard',
  '0 4 * * *',
  $$REINDEX TABLE CONCURRENTLY leaderboard$$
);

-- Weekly queue cleanup Sunday 03:00 UTC
SELECT cron.schedule(
  'cleanup-http-queue',
  '0 3 * * 0',
  $$SELECT public.cleanup_http_queue()$$
);

-- ============================================================
-- 3. Freeze week 3 NOW
-- ============================================================
SELECT freeze_current_week();
