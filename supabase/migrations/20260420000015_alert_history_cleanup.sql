-- Auto-cleanup old alert_history rows to keep DB size in check.
-- Rows older than 90 days are deleted once per day at 03:00 UTC.
-- The NotificationsPanel already filters by notifications_cleared_at,
-- so users only see their own new notifications anyway.

CREATE OR REPLACE FUNCTION cleanup_alert_history()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Notifications: delete after 30 days
  DELETE FROM alert_history
   WHERE sent_at < now() - INTERVAL '30 days';

  -- Disabled alerts: delete after 90 days of inactivity
  DELETE FROM user_alert_settings
   WHERE enabled = false
     AND updated_at < now() - INTERVAL '90 days';
END;
$$;

-- Remove old schedule if re-running this migration
SELECT cron.unschedule('cleanup-alert-history')
  FROM cron.job
 WHERE jobname = 'cleanup-alert-history';

-- Run once per day at 03:00 UTC
SELECT cron.schedule(
  'cleanup-alert-history',
  '0 3 * * *',
  'SELECT cleanup_alert_history()'
);
