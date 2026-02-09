-- ============================================================
-- sync_current_week(): Copy leaderboard → week 0, recompute ranks
-- Called every 15 min by pg_cron
-- ============================================================
CREATE OR REPLACE FUNCTION sync_current_week()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  synced INT;
BEGIN
  -- Upsert all users with volume > 0 from leaderboard into week 0
  INSERT INTO leaderboard_weekly (
    week_number, account_id, wallet_address,
    cumulative_pnl, cumulative_volume, unrealized_pnl,
    first_trade_ts_ms, is_sodex_owned, last_synced_at
  )
  SELECT
    0, account_id, wallet_address,
    cumulative_pnl, cumulative_volume, unrealized_pnl,
    first_trade_ts_ms, is_sodex_owned, NOW()
  FROM leaderboard
  WHERE cumulative_volume > 0
  ON CONFLICT (week_number, account_id)
  DO UPDATE SET
    wallet_address = EXCLUDED.wallet_address,
    cumulative_pnl = EXCLUDED.cumulative_pnl,
    cumulative_volume = EXCLUDED.cumulative_volume,
    unrealized_pnl = EXCLUDED.unrealized_pnl,
    first_trade_ts_ms = EXCLUDED.first_trade_ts_ms,
    is_sodex_owned = EXCLUDED.is_sodex_owned,
    last_synced_at = NOW();

  GET DIAGNOSTICS synced = ROW_COUNT;

  -- Recompute PnL ranks for week 0
  WITH ranked_pnl AS (
    SELECT account_id, ROW_NUMBER() OVER (ORDER BY cumulative_pnl DESC) AS r
    FROM leaderboard_weekly WHERE week_number = 0
  )
  UPDATE leaderboard_weekly w
  SET pnl_rank = ranked_pnl.r
  FROM ranked_pnl
  WHERE w.account_id = ranked_pnl.account_id AND w.week_number = 0;

  -- Recompute volume ranks for week 0
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
-- freeze_current_week(): Freeze week 0 → week N, reset week 0
-- Called Monday 00:00 UTC by pg_cron
-- ============================================================
CREATE OR REPLACE FUNCTION freeze_current_week()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  wk INT;
BEGIN
  SELECT current_week_number INTO wk FROM leaderboard_meta WHERE id = 1;

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

  -- Increment week counter + update start timestamp
  UPDATE leaderboard_meta
  SET current_week_number = wk + 1,
      week_start_ts = NOW()
  WHERE id = 1;

  -- Repopulate week 0 with fresh data
  PERFORM sync_current_week();

  RETURN json_build_object('frozenWeek', wk, 'newWeek', wk + 1);
END;
$$;


-- ============================================================
-- get_weekly_leaderboard(): Paginated weekly delta leaderboard
-- Returns weekly_pnl, weekly_volume as diffs from previous week
-- ============================================================
CREATE OR REPLACE FUNCTION get_weekly_leaderboard(
  p_week INT,
  p_sort TEXT DEFAULT 'volume',
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_exclude_sodex BOOLEAN DEFAULT TRUE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prev_week INT;
  actual_week INT;
  result JSON;
BEGIN
  -- For week 0 (current), resolve the actual previous frozen week
  IF p_week = 0 THEN
    SELECT current_week_number - 1 INTO prev_week FROM leaderboard_meta WHERE id = 1;
    actual_week := 0;
  ELSE
    prev_week := p_week - 1;
    actual_week := p_week;
  END IF;

  -- Week 1 or no prior week: return absolute values
  IF prev_week < 1 THEN
    SELECT json_agg(row_to_json(t)) INTO result FROM (
      SELECT
        cw.account_id,
        cw.wallet_address,
        cw.cumulative_pnl AS weekly_pnl,
        cw.cumulative_volume AS weekly_volume,
        cw.unrealized_pnl,
        cw.pnl_rank,
        cw.volume_rank
      FROM leaderboard_weekly cw
      WHERE cw.week_number = actual_week
        AND (NOT p_exclude_sodex OR cw.is_sodex_owned IS NOT TRUE)
        AND cw.cumulative_volume > 0
      ORDER BY
        CASE WHEN p_sort = 'volume' THEN cw.volume_rank ELSE cw.pnl_rank END ASC
      LIMIT p_limit OFFSET p_offset
    ) t;
  ELSE
    -- Compute deltas vs previous week
    SELECT json_agg(row_to_json(t)) INTO result FROM (
      SELECT
        cw.account_id,
        cw.wallet_address,
        (cw.cumulative_pnl - COALESCE(pw.cumulative_pnl, 0)) AS weekly_pnl,
        (cw.cumulative_volume - COALESCE(pw.cumulative_volume, 0)) AS weekly_volume,
        cw.unrealized_pnl,
        cw.pnl_rank,
        cw.volume_rank
      FROM leaderboard_weekly cw
      LEFT JOIN leaderboard_weekly pw
        ON pw.account_id = cw.account_id AND pw.week_number = prev_week
      WHERE cw.week_number = actual_week
        AND (NOT p_exclude_sodex OR cw.is_sodex_owned IS NOT TRUE)
        AND (cw.cumulative_volume - COALESCE(pw.cumulative_volume, 0)) > 0
      ORDER BY
        CASE WHEN p_sort = 'volume' THEN cw.volume_rank ELSE cw.pnl_rank END ASC
      LIMIT p_limit OFFSET p_offset
    ) t;
  END IF;

  RETURN COALESCE(result, '[]'::JSON);
END;
$$;


-- ============================================================
-- get_weekly_leaderboard_count(): Total count for pagination
-- ============================================================
CREATE OR REPLACE FUNCTION get_weekly_leaderboard_count(
  p_week INT,
  p_exclude_sodex BOOLEAN DEFAULT TRUE
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prev_week INT;
  actual_week INT;
  cnt INT;
BEGIN
  IF p_week = 0 THEN
    SELECT current_week_number - 1 INTO prev_week FROM leaderboard_meta WHERE id = 1;
    actual_week := 0;
  ELSE
    prev_week := p_week - 1;
    actual_week := p_week;
  END IF;

  IF prev_week < 1 THEN
    SELECT COUNT(*) INTO cnt
    FROM leaderboard_weekly cw
    WHERE cw.week_number = actual_week
      AND (NOT p_exclude_sodex OR cw.is_sodex_owned IS NOT TRUE)
      AND cw.cumulative_volume > 0;
  ELSE
    SELECT COUNT(*) INTO cnt
    FROM leaderboard_weekly cw
    LEFT JOIN leaderboard_weekly pw
      ON pw.account_id = cw.account_id AND pw.week_number = prev_week
    WHERE cw.week_number = actual_week
      AND (NOT p_exclude_sodex OR cw.is_sodex_owned IS NOT TRUE)
      AND (cw.cumulative_volume - COALESCE(pw.cumulative_volume, 0)) > 0;
  END IF;

  RETURN cnt;
END;
$$;


-- ============================================================
-- get_user_weekly_reward_estimate(): Live reward estimate
-- Returns user's weekly volume, total weekly volume, pool, estimate
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_weekly_reward_estimate(
  p_wallet_address TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prev_week INT;
  user_cumul_vol NUMERIC;
  user_prev_vol NUMERIC;
  user_weekly_vol NUMERIC;
  user_cumul_pnl NUMERIC;
  user_prev_pnl NUMERIC;
  user_weekly_pnl NUMERIC;
  user_pnl_rank INT;
  user_vol_rank INT;
  total_weekly_vol NUMERIC;
  pool NUMERIC;
  est_reward NUMERIC;
BEGIN
  SELECT current_week_number - 1 INTO prev_week FROM leaderboard_meta WHERE id = 1;
  SELECT pool_size INTO pool FROM leaderboard_meta WHERE id = 1;

  -- Get user's current week data
  SELECT cumulative_volume, cumulative_pnl, pnl_rank, volume_rank
  INTO user_cumul_vol, user_cumul_pnl, user_pnl_rank, user_vol_rank
  FROM leaderboard_weekly
  WHERE week_number = 0 AND wallet_address = p_wallet_address;

  IF user_cumul_vol IS NULL THEN
    RETURN json_build_object(
      'found', FALSE,
      'weekly_volume', 0,
      'weekly_pnl', 0,
      'total_weekly_volume', 0,
      'pool_size', pool,
      'estimated_reward', 0,
      'pnl_rank', NULL,
      'volume_rank', NULL
    );
  END IF;

  -- Get user's previous week volume (if exists)
  IF prev_week >= 1 THEN
    SELECT cumulative_volume, cumulative_pnl
    INTO user_prev_vol, user_prev_pnl
    FROM leaderboard_weekly
    WHERE week_number = prev_week AND wallet_address = p_wallet_address;
  END IF;

  user_prev_vol := COALESCE(user_prev_vol, 0);
  user_prev_pnl := COALESCE(user_prev_pnl, 0);
  user_weekly_vol := user_cumul_vol - user_prev_vol;
  user_weekly_pnl := user_cumul_pnl - user_prev_pnl;

  -- Compute total weekly volume across all users
  IF prev_week >= 1 THEN
    SELECT COALESCE(SUM(cw.cumulative_volume - COALESCE(pw.cumulative_volume, 0)), 0)
    INTO total_weekly_vol
    FROM leaderboard_weekly cw
    LEFT JOIN leaderboard_weekly pw
      ON pw.account_id = cw.account_id AND pw.week_number = prev_week
    WHERE cw.week_number = 0
      AND (cw.cumulative_volume - COALESCE(pw.cumulative_volume, 0)) > 0;
  ELSE
    SELECT COALESCE(SUM(cumulative_volume), 0)
    INTO total_weekly_vol
    FROM leaderboard_weekly
    WHERE week_number = 0 AND cumulative_volume > 0;
  END IF;

  -- Calculate estimated reward (volume-weighted)
  IF total_weekly_vol > 0 AND user_weekly_vol > 0 THEN
    est_reward := (user_weekly_vol / total_weekly_vol) * pool;
  ELSE
    est_reward := 0;
  END IF;

  RETURN json_build_object(
    'found', TRUE,
    'weekly_volume', user_weekly_vol,
    'weekly_pnl', user_weekly_pnl,
    'total_weekly_volume', total_weekly_vol,
    'pool_size', pool,
    'estimated_reward', ROUND(est_reward, 2),
    'pnl_rank', user_pnl_rank,
    'volume_rank', user_vol_rank
  );
END;
$$;


-- Grant permissions
GRANT EXECUTE ON FUNCTION sync_current_week TO service_role;
GRANT EXECUTE ON FUNCTION freeze_current_week TO service_role;
GRANT EXECUTE ON FUNCTION get_weekly_leaderboard TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_leaderboard_count TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_weekly_reward_estimate TO anon, authenticated;
