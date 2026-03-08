-- Multi-fix migration:
-- 1. Fix week 5 total_user_counts = 85530
-- 2. Backfill sodex_total_volume for frozen weeks with 0 sodex data
-- 3. Auto-insert sopoints_week_config in freeze_current_week
-- 4. Trigger sync_current_week to refresh live data

-- 1. Fix week 5 total users to correct value (85,530)
UPDATE leaderboard_meta
SET total_user_counts = jsonb_set(
  COALESCE(total_user_counts, '{}'::JSONB),
  '{5}',
  '85530'::JSONB
)
WHERE id = 1;

-- 2. Backfill frozen weeks: copy current sodex ALL_TIME values into weeks
--    where sodex_total_volume = 0. This makes weekly delta ≈ 0 for sodex,
--    so GREATEST(sodex_delta, futures_delta) = futures_delta.
--    Result: total ≈ futures for transitional weeks (correct when sodex
--    history was unavailable at freeze time).
DO $$
DECLARE
  max_frozen INT;
BEGIN
  SELECT current_week_number - 1 INTO max_frozen FROM leaderboard_meta WHERE id = 1;

  FOR wk IN 1..max_frozen LOOP
    UPDATE leaderboard_weekly pw
    SET sodex_total_volume = lb.sodex_total_volume,
        sodex_pnl = lb.sodex_pnl
    FROM leaderboard lb
    WHERE pw.account_id = lb.account_id
      AND pw.week_number = wk
      AND pw.sodex_total_volume = 0
      AND lb.sodex_total_volume > 0;
  END LOOP;
END $$;

-- 3. Update freeze_current_week to auto-insert sopoints_week_config
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

  -- Auto-create sopoints_week_config for the new week (uses defaults)
  INSERT INTO sopoints_week_config (week_num)
  VALUES (wk + 1)
  ON CONFLICT (week_num) DO NOTHING;

  PERFORM sync_current_week();

  RETURN json_build_object('frozenWeek', wk, 'newWeek', wk + 1, 'totalUsers', total_users);
END;
$$;

-- 4. Auto-create missing sopoints_week_config entries up to current week
DO $$
DECLARE
  cur_week INT;
BEGIN
  SELECT current_week_number INTO cur_week FROM leaderboard_meta WHERE id = 1;
  FOR wk IN 1..cur_week LOOP
    INSERT INTO sopoints_week_config (week_num)
    VALUES (wk)
    ON CONFLICT (week_num) DO NOTHING;
  END LOOP;
END $$;

-- 5. Force sync to get latest sodex data into week 0
SELECT sync_current_week();
