-- Egress optimizations:
-- 1. sync_current_week: remove volume filter, sync ALL accounts
-- 2. process-http-queue: every minute → every 15 min
-- 3. sync-sodex-leaderboard: every 15 min → hourly (fetches all 90k at once)

-- ============================================================
-- 1. sync_current_week without volume filter
-- ============================================================
CREATE OR REPLACE FUNCTION sync_current_week()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  synced INT;
BEGIN
  INSERT INTO leaderboard_weekly (
    week_number, account_id, wallet_address,
    cumulative_pnl, cumulative_volume, unrealized_pnl,
    is_sodex_owned, sodex_total_volume, sodex_pnl
  )
  SELECT
    0, account_id, wallet_address,
    cumulative_pnl, cumulative_volume, unrealized_pnl,
    is_sodex_owned, sodex_total_volume, sodex_pnl
  FROM leaderboard
  ON CONFLICT (week_number, account_id)
  DO UPDATE SET
    wallet_address     = EXCLUDED.wallet_address,
    cumulative_pnl     = EXCLUDED.cumulative_pnl,
    cumulative_volume  = EXCLUDED.cumulative_volume,
    unrealized_pnl     = EXCLUDED.unrealized_pnl,
    is_sodex_owned     = EXCLUDED.is_sodex_owned,
    sodex_total_volume = EXCLUDED.sodex_total_volume,
    sodex_pnl          = EXCLUDED.sodex_pnl;

  GET DIAGNOSTICS synced = ROW_COUNT;

  WITH ranked_pnl AS (
    SELECT account_id, ROW_NUMBER() OVER (ORDER BY cumulative_pnl DESC) AS r
    FROM leaderboard_weekly WHERE week_number = 0
  )
  UPDATE leaderboard_weekly w
  SET pnl_rank = ranked_pnl.r
  FROM ranked_pnl
  WHERE w.account_id = ranked_pnl.account_id AND w.week_number = 0;

  WITH ranked_vol AS (
    SELECT account_id, ROW_NUMBER() OVER (ORDER BY cumulative_volume DESC) AS r
    FROM leaderboard_weekly WHERE week_number = 0
  )
  UPDATE leaderboard_weekly w
  SET volume_rank = ranked_vol.r
  FROM ranked_vol
  WHERE w.account_id = ranked_vol.account_id AND w.week_number = 0;

  RETURN json_build_object('synced', synced);
END;
$$;

-- ============================================================
-- 2. Reschedule process-http-queue: * → */15
-- ============================================================
SELECT cron.unschedule('process-http-queue');
SELECT cron.schedule(
  'process-http-queue',
  '*/15 * * * *',
  'SELECT call_process_queue()'
);

-- ============================================================
-- 3. Reschedule sodex sync: */15 → hourly (all 90k fetched at once)
-- ============================================================
SELECT cron.unschedule('sync-sodex-leaderboard');
SELECT cron.schedule(
  'sync-sodex-leaderboard',
  '15 * * * *',
  'SELECT call_sync_sodex_leaderboard()'
);
