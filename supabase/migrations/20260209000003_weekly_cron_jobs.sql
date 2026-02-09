-- Enable pg_cron extension (must also be enabled in Supabase dashboard)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Sync current week every 15 minutes
SELECT cron.schedule(
  'sync-current-week',
  '*/15 * * * *',
  'SELECT sync_current_week()'
);

-- Freeze + rotate every Monday at 00:00 UTC
SELECT cron.schedule(
  'freeze-weekly-leaderboard',
  '0 0 * * 1',
  'SELECT freeze_current_week()'
);
