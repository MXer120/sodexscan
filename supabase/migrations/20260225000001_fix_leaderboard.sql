-- ============================================================
-- Fix leaderboard rankings + weekly ordering
--
-- Bugs fixed:
--   1. NULL pnl ranked first (NULLS FIRST is default for DESC)
--   2. Non-traders (volume=0) polluting rank numbers
--   3. Weekly leaderboard ordered by cumulative rank not weekly diff
--   4. Frozen weeks have stale ranks
-- ============================================================

-- 1. Fix all-time ranking
CREATE OR REPLACE FUNCTION update_leaderboard_ranks()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- PnL ranks: only traders, null pnl sorts last
  WITH ranked_pnl AS (
    SELECT account_id,
      ROW_NUMBER() OVER (ORDER BY cumulative_pnl DESC NULLS LAST) as rank
    FROM leaderboard
    WHERE cumulative_volume > 0
  )
  UPDATE leaderboard
  SET pnl_rank = ranked_pnl.rank
  FROM ranked_pnl
  WHERE leaderboard.account_id = ranked_pnl.account_id
    AND leaderboard.pnl_rank IS DISTINCT FROM ranked_pnl.rank;

  -- Clear ranks for non-traders
  UPDATE leaderboard
  SET pnl_rank = NULL
  WHERE (cumulative_volume IS NULL OR cumulative_volume <= 0)
    AND pnl_rank IS NOT NULL;

  -- Volume ranks: only traders
  WITH ranked_volume AS (
    SELECT account_id,
      ROW_NUMBER() OVER (ORDER BY cumulative_volume DESC NULLS LAST) as rank
    FROM leaderboard
    WHERE cumulative_volume > 0
  )
  UPDATE leaderboard
  SET volume_rank = ranked_volume.rank
  FROM ranked_volume
  WHERE leaderboard.account_id = ranked_volume.account_id
    AND leaderboard.volume_rank IS DISTINCT FROM ranked_volume.rank;

  UPDATE leaderboard
  SET volume_rank = NULL
  WHERE (cumulative_volume IS NULL OR cumulative_volume <= 0)
    AND volume_rank IS NOT NULL;
END;
$$;

-- 2. Fix sync_current_week: NULLS LAST
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
    wallet_address     = EXCLUDED.wallet_address,
    cumulative_pnl     = EXCLUDED.cumulative_pnl,
    cumulative_volume  = EXCLUDED.cumulative_volume,
    unrealized_pnl     = EXCLUDED.unrealized_pnl,
    first_trade_ts_ms  = EXCLUDED.first_trade_ts_ms,
    is_sodex_owned     = EXCLUDED.is_sodex_owned,
    last_synced_at     = NOW()
  WHERE
    leaderboard_weekly.cumulative_pnl     IS DISTINCT FROM EXCLUDED.cumulative_pnl
    OR leaderboard_weekly.cumulative_volume  IS DISTINCT FROM EXCLUDED.cumulative_volume
    OR leaderboard_weekly.unrealized_pnl    IS DISTINCT FROM EXCLUDED.unrealized_pnl
    OR leaderboard_weekly.wallet_address    IS DISTINCT FROM EXCLUDED.wallet_address
    OR leaderboard_weekly.first_trade_ts_ms IS DISTINCT FROM EXCLUDED.first_trade_ts_ms
    OR leaderboard_weekly.is_sodex_owned    IS DISTINCT FROM EXCLUDED.is_sodex_owned;

  GET DIAGNOSTICS synced = ROW_COUNT;

  -- PnL ranks week 0
  WITH ranked_pnl AS (
    SELECT account_id,
      ROW_NUMBER() OVER (ORDER BY cumulative_pnl DESC NULLS LAST) AS r
    FROM leaderboard_weekly
    WHERE week_number = 0 AND cumulative_volume > 0
  )
  UPDATE leaderboard_weekly w
  SET pnl_rank = ranked_pnl.r
  FROM ranked_pnl
  WHERE w.account_id = ranked_pnl.account_id
    AND w.week_number = 0
    AND w.pnl_rank IS DISTINCT FROM ranked_pnl.r;

  -- Volume ranks week 0
  WITH ranked_vol AS (
    SELECT account_id,
      ROW_NUMBER() OVER (ORDER BY cumulative_volume DESC NULLS LAST) AS r
    FROM leaderboard_weekly
    WHERE week_number = 0 AND cumulative_volume > 0
  )
  UPDATE leaderboard_weekly w
  SET volume_rank = ranked_vol.r
  FROM ranked_vol
  WHERE w.account_id = ranked_vol.account_id
    AND w.week_number = 0
    AND w.volume_rank IS DISTINCT FROM ranked_vol.r;

  RETURN json_build_object('synced', synced);
END;
$$;

-- 3. Fix weekly leaderboard: order by weekly diff, NULLS LAST
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
        CASE WHEN p_sort = 'volume'
          THEN cw.cumulative_volume
          ELSE cw.cumulative_pnl
        END DESC NULLS LAST
      LIMIT p_limit OFFSET p_offset
    ) t;
  ELSE
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
        CASE WHEN p_sort = 'volume'
          THEN (cw.cumulative_volume - COALESCE(pw.cumulative_volume, 0))
          ELSE (cw.cumulative_pnl - COALESCE(pw.cumulative_pnl, 0))
        END DESC NULLS LAST
      LIMIT p_limit OFFSET p_offset
    ) t;
  END IF;

  RETURN COALESCE(result, '[]'::JSON);
END;
$$;

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

GRANT EXECUTE ON FUNCTION get_weekly_leaderboard TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_leaderboard_count TO anon, authenticated;

-- 4. Recompute all-time ranks
SELECT update_leaderboard_ranks();

-- 5. Recompute frozen weekly ranks (weeks 1-3 have stale ranks)
DO $$
DECLARE
  wk INT;
BEGIN
  FOR wk IN SELECT DISTINCT week_number FROM leaderboard_weekly WHERE week_number > 0 ORDER BY week_number
  LOOP
    -- PnL
    WITH ranked AS (
      SELECT account_id,
        ROW_NUMBER() OVER (ORDER BY cumulative_pnl DESC NULLS LAST) AS r
      FROM leaderboard_weekly
      WHERE week_number = wk AND cumulative_volume > 0
    )
    UPDATE leaderboard_weekly w
    SET pnl_rank = ranked.r
    FROM ranked
    WHERE w.account_id = ranked.account_id
      AND w.week_number = wk
      AND w.pnl_rank IS DISTINCT FROM ranked.r;

    -- Volume
    WITH ranked AS (
      SELECT account_id,
        ROW_NUMBER() OVER (ORDER BY cumulative_volume DESC NULLS LAST) AS r
      FROM leaderboard_weekly
      WHERE week_number = wk AND cumulative_volume > 0
    )
    UPDATE leaderboard_weekly w
    SET volume_rank = ranked.r
    FROM ranked
    WHERE w.account_id = ranked.account_id
      AND w.week_number = wk
      AND w.volume_rank IS DISTINCT FROM ranked.r;
  END LOOP;
END;
$$;
