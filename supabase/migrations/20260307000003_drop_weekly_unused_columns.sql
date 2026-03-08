-- Drop unused columns from leaderboard_weekly to reclaim storage
-- first_trade_ts_ms and last_synced_at are write-only; never queried.

ALTER TABLE leaderboard_weekly DROP COLUMN IF EXISTS first_trade_ts_ms;
ALTER TABLE leaderboard_weekly DROP COLUMN IF EXISTS last_synced_at;

-- Rebuild sync_current_week without dropped columns
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
  WHERE cumulative_volume > 0 OR sodex_total_volume > 0
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

-- Rebuild freeze_current_week without dropped columns
-- Restores total_user_counts capture lost in 20260306000001 rewrite
CREATE OR REPLACE FUNCTION freeze_current_week()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  wk INT;
  total_users INT;
  counts JSONB;
BEGIN
  SELECT current_week_number INTO wk FROM leaderboard_meta WHERE id = 1;

  -- Capture total user count from leaderboard at freeze time
  SELECT COUNT(*) INTO total_users
  FROM leaderboard
  WHERE is_sodex_owned IS NOT TRUE;

  INSERT INTO leaderboard_weekly (
    week_number, account_id, wallet_address,
    cumulative_pnl, cumulative_volume, unrealized_pnl,
    pnl_rank, volume_rank,
    is_sodex_owned, sodex_total_volume, sodex_pnl
  )
  SELECT
    wk, account_id, wallet_address,
    cumulative_pnl, cumulative_volume, unrealized_pnl,
    pnl_rank, volume_rank,
    is_sodex_owned, sodex_total_volume, sodex_pnl
  FROM leaderboard_weekly
  WHERE week_number = 0;

  DELETE FROM leaderboard_weekly WHERE week_number = 0;

  -- Store total users for this week and increment counter
  SELECT COALESCE(total_user_counts, '{}'::JSONB) INTO counts FROM leaderboard_meta WHERE id = 1;
  counts := counts || jsonb_build_object(wk::TEXT, total_users);

  UPDATE leaderboard_meta
  SET current_week_number = wk + 1,
      week_start_ts = NOW(),
      total_user_counts = counts
  WHERE id = 1;

  PERFORM sync_current_week();

  RETURN json_build_object('frozenWeek', wk, 'newWeek', wk + 1, 'totalUsers', total_users);
END;
$$;
