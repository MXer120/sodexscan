-- Add total_user_counts jsonb to leaderboard_meta
-- Stores { "1": 22189, "2": 23456, ... } per frozen week
ALTER TABLE leaderboard_meta ADD COLUMN IF NOT EXISTS total_user_counts JSONB DEFAULT '{}'::JSONB;

-- Seed week 1 total users (from user's manual count)
UPDATE leaderboard_meta SET total_user_counts = '{"1": 22189}'::JSONB WHERE id = 1;

-- Update freeze_current_week to capture total users at freeze time
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

  -- Capture total user count from leaderboard table at freeze time
  SELECT COUNT(*) INTO total_users
  FROM leaderboard
  WHERE is_sodex_owned IS NOT TRUE;

  -- Copy week 0 rows as frozen week N
  INSERT INTO leaderboard_weekly (
    week_number, account_id, wallet_address,
    cumulative_pnl, cumulative_volume, unrealized_pnl,
    first_trade_ts_ms, pnl_rank, volume_rank,
    is_sodex_owned, last_synced_at
  )
  SELECT
    wk, account_id, wallet_address,
    cumulative_pnl, cumulative_volume, unrealized_pnl,
    first_trade_ts_ms, pnl_rank, volume_rank,
    is_sodex_owned, last_synced_at
  FROM leaderboard_weekly
  WHERE week_number = 0;

  -- Clear week 0 (will be repopulated)
  DELETE FROM leaderboard_weekly WHERE week_number = 0;

  -- Store total users for this week and increment counter
  SELECT COALESCE(total_user_counts, '{}'::JSONB) INTO counts FROM leaderboard_meta WHERE id = 1;
  counts := counts || jsonb_build_object(wk::TEXT, total_users);

  UPDATE leaderboard_meta
  SET current_week_number = wk + 1,
      week_start_ts = NOW(),
      total_user_counts = counts
  WHERE id = 1;

  -- Repopulate week 0 with fresh data
  PERFORM sync_current_week();

  RETURN json_build_object('frozenWeek', wk, 'newWeek', wk + 1, 'totalUsers', total_users);
END;
$$;

GRANT EXECUTE ON FUNCTION freeze_current_week TO service_role;
