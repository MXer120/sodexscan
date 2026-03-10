-- Change weekly freeze from Monday 00:00 UTC to Saturday 00:00 UTC
SELECT cron.unschedule('freeze-weekly-leaderboard');

SELECT cron.schedule(
  'freeze-weekly-leaderboard',
  '0 0 * * 6',
  'SELECT freeze_current_week()'
);
