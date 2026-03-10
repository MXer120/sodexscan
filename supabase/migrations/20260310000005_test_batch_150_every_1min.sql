-- ============================================================
-- Test config: 150 accounts/run, every 1 min
-- ============================================================

-- 1. Shrink sync_current_week batch to 150
CREATE OR REPLACE FUNCTION sync_current_week()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '60s'
AS $$
DECLARE
  cursor_val INT;
  synced INT;
  new_cursor INT;
  batch_size CONSTANT INT := 150;
BEGIN
  SELECT COALESCE(weekly_sync_cursor, 0) INTO cursor_val
  FROM leaderboard_meta WHERE id = 1;

  WITH batch AS (
    SELECT account_id, wallet_address,
      cumulative_pnl, cumulative_volume, unrealized_pnl,
      is_sodex_owned, sodex_total_volume, sodex_pnl
    FROM leaderboard
    WHERE account_id > cursor_val
    ORDER BY account_id
    LIMIT batch_size
  ),
  upserted AS (
    INSERT INTO leaderboard_weekly (
      week_number, account_id, wallet_address,
      cumulative_pnl, cumulative_volume, unrealized_pnl,
      is_sodex_owned, sodex_total_volume, sodex_pnl
    )
    SELECT
      0, account_id, wallet_address,
      cumulative_pnl, cumulative_volume, unrealized_pnl,
      is_sodex_owned, sodex_total_volume, sodex_pnl
    FROM batch
    ON CONFLICT (week_number, account_id)
    DO UPDATE SET
      wallet_address     = EXCLUDED.wallet_address,
      cumulative_pnl     = EXCLUDED.cumulative_pnl,
      cumulative_volume  = EXCLUDED.cumulative_volume,
      unrealized_pnl     = EXCLUDED.unrealized_pnl,
      is_sodex_owned     = EXCLUDED.is_sodex_owned,
      sodex_total_volume = EXCLUDED.sodex_total_volume,
      sodex_pnl          = EXCLUDED.sodex_pnl
    RETURNING account_id
  )
  SELECT COUNT(*), MAX(account_id) INTO synced, new_cursor FROM upserted;

  IF synced < batch_size OR new_cursor IS NULL THEN
    UPDATE leaderboard_meta SET weekly_sync_cursor = 0 WHERE id = 1;
  ELSE
    UPDATE leaderboard_meta SET weekly_sync_cursor = new_cursor WHERE id = 1;
  END IF;

  RETURN json_build_object(
    'synced', synced,
    'cursor', COALESCE(new_cursor, 0),
    'wrapped', synced < batch_size
  );
END;
$$;

-- 2. Reschedule sync-current-week to every 1 min
SELECT cron.unschedule('sync-current-week');
SELECT cron.schedule(
  'sync-current-week',
  '* * * * *',
  'SELECT sync_current_week()'
);

-- 3. Reschedule sync-sodex-leaderboard to every 1 min
SELECT cron.unschedule('sync-sodex-leaderboard');
SELECT cron.schedule(
  'sync-sodex-leaderboard',
  '* * * * *',
  'SELECT call_sync_sodex_leaderboard()'
);

-- 4. Helper RPC to list all cron jobs (cron schema not accessible via REST)
CREATE OR REPLACE FUNCTION list_cron_jobs()
RETURNS TABLE(jobname TEXT, schedule TEXT, active BOOLEAN, command TEXT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT jobname::TEXT, schedule::TEXT, active, command::TEXT
  FROM cron.job
  ORDER BY jobname;
$$;

GRANT EXECUTE ON FUNCTION list_cron_jobs TO service_role;
