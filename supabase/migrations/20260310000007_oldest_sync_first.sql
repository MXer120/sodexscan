-- ============================================================
-- Switch all syncs to oldest-first ordering
-- ============================================================

-- 1. Re-add last_synced_at to leaderboard_weekly (for tracking staleness)
ALTER TABLE leaderboard_weekly
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Index for oldest-first queries on week 0
CREATE INDEX IF NOT EXISTS idx_weekly_w0_synced
  ON leaderboard_weekly(last_synced_at ASC NULLS FIRST)
  WHERE week_number = 0;

-- Also ensure leaderboard source table has index for oldest-first
CREATE INDEX IF NOT EXISTS idx_lb_synced_asc
  ON leaderboard(last_synced_at ASC NULLS FIRST);

-- 2. Rewrite sync_current_week: oldest-synced-first instead of cursor
CREATE OR REPLACE FUNCTION sync_current_week()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '60s'
AS $$
DECLARE
  synced INT;
  batch_size CONSTANT INT := 150;
BEGIN
  -- Pick 150 accounts from source leaderboard that are either:
  --   a) not yet in week 0 (LEFT JOIN null)
  --   b) oldest last_synced_at in week 0
  WITH stale AS (
    SELECT l.account_id
    FROM leaderboard l
    LEFT JOIN leaderboard_weekly w
      ON w.account_id = l.account_id AND w.week_number = 0
    ORDER BY w.last_synced_at ASC NULLS FIRST
    LIMIT batch_size
  ),
  upserted AS (
    INSERT INTO leaderboard_weekly (
      week_number, account_id, wallet_address,
      cumulative_pnl, cumulative_volume, unrealized_pnl,
      is_sodex_owned, sodex_total_volume, sodex_pnl,
      last_synced_at
    )
    SELECT
      0, l.account_id, l.wallet_address,
      l.cumulative_pnl, l.cumulative_volume, l.unrealized_pnl,
      l.is_sodex_owned, l.sodex_total_volume, l.sodex_pnl,
      NOW()
    FROM leaderboard l
    WHERE l.account_id IN (SELECT account_id FROM stale)
    ON CONFLICT (week_number, account_id)
    DO UPDATE SET
      wallet_address     = EXCLUDED.wallet_address,
      cumulative_pnl     = EXCLUDED.cumulative_pnl,
      cumulative_volume  = EXCLUDED.cumulative_volume,
      unrealized_pnl     = EXCLUDED.unrealized_pnl,
      is_sodex_owned     = EXCLUDED.is_sodex_owned,
      sodex_total_volume = EXCLUDED.sodex_total_volume,
      sodex_pnl          = EXCLUDED.sodex_pnl,
      last_synced_at     = NOW()
    RETURNING account_id
  )
  SELECT COUNT(*) INTO synced FROM upserted;

  RETURN json_build_object('synced', synced);
END;
$$;

-- 3. Update freeze to include last_synced_at
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

  -- Compute ranks on week 0 before freezing
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

  -- Delete old historical weeks (keep only new frozen week)
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
