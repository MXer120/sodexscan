-- ============================================================
-- 1. Add cursor columns to leaderboard_meta
-- ============================================================
ALTER TABLE leaderboard_meta ADD COLUMN IF NOT EXISTS weekly_sync_cursor INT DEFAULT 0;
ALTER TABLE leaderboard_meta ADD COLUMN IF NOT EXISTS sodex_sync_offset INT DEFAULT 0;

-- ============================================================
-- 2. Rewrite sync_current_week: batch of 5000 per run
--    Cycles through ALL accounts (incl. 0/null volume)
--    ordered by account_id with wrap-around cursor
-- ============================================================
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
  batch_size CONSTANT INT := 5000;
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

  -- Wrap around when batch exhausted
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

-- ============================================================
-- 3. Update freeze to compute ranks once at freeze time only
--    (no ranking during live sync — RPC sorts by computed deltas)
-- ============================================================
CREATE OR REPLACE FUNCTION freeze_current_week()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '300s'
AS $$
DECLARE
  wk INT;
  total_users INT;
  counts JSONB;
BEGIN
  SELECT current_week_number INTO wk FROM leaderboard_meta WHERE id = 1;

  SELECT COUNT(*) INTO total_users
  FROM leaderboard WHERE is_sodex_owned IS NOT TRUE;

  -- Compute ranks on week 0 before freezing (needed for exported JSON)
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

  -- Copy week 0 as frozen week N
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

  -- Clear week 0
  DELETE FROM leaderboard_weekly WHERE week_number = 0;

  -- Delete old historical weeks (keep only the new frozen week)
  DELETE FROM leaderboard_weekly
  WHERE week_number >= 1 AND week_number < wk;

  -- Update meta
  SELECT COALESCE(total_user_counts, '{}'::JSONB) INTO counts
  FROM leaderboard_meta WHERE id = 1;
  counts := counts || jsonb_build_object(wk::TEXT, total_users);

  UPDATE leaderboard_meta
  SET current_week_number = wk + 1,
      week_start_ts = NOW(),
      total_user_counts = counts,
      weekly_sync_cursor = 0
  WHERE id = 1;

  -- Kick off first batch of new week
  PERFORM sync_current_week();

  RETURN json_build_object('frozenWeek', wk, 'newWeek', wk + 1, 'totalUsers', total_users);
END;
$$;

-- ============================================================
-- 4. Delete stale historical weeks right now
--    Keep only week 0 (live) + previous frozen week
-- ============================================================
DELETE FROM leaderboard_weekly
WHERE week_number >= 1
  AND week_number < (SELECT current_week_number - 1 FROM leaderboard_meta WHERE id = 1);
