-- Fix: compute weekly ranks based on delta values, not cumulative

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
  IF p_week = 0 THEN
    SELECT current_week_number - 1 INTO prev_week FROM leaderboard_meta WHERE id = 1;
    actual_week := 0;
  ELSE
    prev_week := p_week - 1;
    actual_week := p_week;
  END IF;

  IF prev_week < 1 THEN
    -- Week 1 / no prior: absolute values, ranks computed on-the-fly
    SELECT json_agg(row_to_json(t)) INTO result FROM (
      SELECT * FROM (
        SELECT
          cw.account_id,
          cw.wallet_address,
          cw.cumulative_pnl AS weekly_pnl,
          cw.cumulative_volume AS weekly_volume,
          cw.unrealized_pnl,
          ROW_NUMBER() OVER (ORDER BY cw.cumulative_pnl DESC) AS pnl_rank,
          ROW_NUMBER() OVER (ORDER BY cw.cumulative_volume DESC) AS volume_rank
        FROM leaderboard_weekly cw
        WHERE cw.week_number = actual_week
          AND (NOT p_exclude_sodex OR cw.is_sodex_owned IS NOT TRUE)
          AND cw.cumulative_volume > 0
      ) ranked
      ORDER BY
        CASE WHEN p_sort = 'volume' THEN ranked.volume_rank ELSE ranked.pnl_rank END ASC
      LIMIT p_limit OFFSET p_offset
    ) t;
  ELSE
    -- Deltas + ranks based on delta values
    SELECT json_agg(row_to_json(t)) INTO result FROM (
      SELECT * FROM (
        SELECT
          cw.account_id,
          cw.wallet_address,
          (cw.cumulative_pnl - COALESCE(pw.cumulative_pnl, 0)) AS weekly_pnl,
          (cw.cumulative_volume - COALESCE(pw.cumulative_volume, 0)) AS weekly_volume,
          cw.unrealized_pnl,
          ROW_NUMBER() OVER (ORDER BY (cw.cumulative_pnl - COALESCE(pw.cumulative_pnl, 0)) DESC) AS pnl_rank,
          ROW_NUMBER() OVER (ORDER BY (cw.cumulative_volume - COALESCE(pw.cumulative_volume, 0)) DESC) AS volume_rank
        FROM leaderboard_weekly cw
        LEFT JOIN leaderboard_weekly pw
          ON pw.account_id = cw.account_id AND pw.week_number = prev_week
        WHERE cw.week_number = actual_week
          AND (NOT p_exclude_sodex OR cw.is_sodex_owned IS NOT TRUE)
          AND (cw.cumulative_volume - COALESCE(pw.cumulative_volume, 0)) > 0
      ) ranked
      ORDER BY
        CASE WHEN p_sort = 'volume' THEN ranked.volume_rank ELSE ranked.pnl_rank END ASC
      LIMIT p_limit OFFSET p_offset
    ) t;
  END IF;

  RETURN COALESCE(result, '[]'::JSON);
END;
$$;

-- Also fix reward estimate to use delta-based ranks
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

  SELECT cumulative_volume, cumulative_pnl
  INTO user_cumul_vol, user_cumul_pnl
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

  -- Delta-based volume rank
  SELECT COUNT(*) + 1 INTO user_vol_rank
  FROM leaderboard_weekly cw
  LEFT JOIN leaderboard_weekly pw
    ON pw.account_id = cw.account_id AND pw.week_number = CASE WHEN prev_week >= 1 THEN prev_week ELSE -1 END
  WHERE cw.week_number = 0
    AND (cw.cumulative_volume - COALESCE(pw.cumulative_volume, 0)) > user_weekly_vol;

  -- Delta-based pnl rank
  SELECT COUNT(*) + 1 INTO user_pnl_rank
  FROM leaderboard_weekly cw
  LEFT JOIN leaderboard_weekly pw
    ON pw.account_id = cw.account_id AND pw.week_number = CASE WHEN prev_week >= 1 THEN prev_week ELSE -1 END
  WHERE cw.week_number = 0
    AND (cw.cumulative_pnl - COALESCE(pw.cumulative_pnl, 0)) > user_weekly_pnl;

  -- Total weekly volume
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

GRANT EXECUTE ON FUNCTION get_weekly_leaderboard TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_weekly_reward_estimate TO anon, authenticated;
