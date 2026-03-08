-- Fix: freeze_current_week lost total_user_counts capture in 20260306000001 rewrite.
-- Restores the logic from 20260209000009 and backfills missing weeks.

-- 1. Restore total_user_counts capture in freeze_current_week
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

-- 2. Backfill missing total_user_counts for weeks that froze without it
-- Uses count from leaderboard_weekly as approximation
DO $$
DECLARE
  wk INT;
  cnt INT;
  counts JSONB;
  max_week INT;
BEGIN
  SELECT current_week_number - 1, COALESCE(total_user_counts, '{}'::JSONB)
  INTO max_week, counts
  FROM leaderboard_meta WHERE id = 1;

  FOR wk IN 1..max_week LOOP
    IF NOT (counts ? wk::TEXT) THEN
      SELECT COUNT(*) INTO cnt
      FROM leaderboard_weekly
      WHERE week_number = wk AND (is_sodex_owned IS NOT TRUE);
      counts := counts || jsonb_build_object(wk::TEXT, cnt);
    END IF;
  END LOOP;

  UPDATE leaderboard_meta SET total_user_counts = counts WHERE id = 1;
END $$;
