-- Add Sodex combined (spot+futures) leaderboard columns
-- Source: https://mainnet-data.sodex.dev/api/v1/leaderboard?window_type=ALL_TIME

-- 1. Add columns to leaderboard table
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS sodex_total_volume NUMERIC(30,18) DEFAULT 0;
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS sodex_pnl NUMERIC(30,18) DEFAULT 0;

-- 2. Generated spot columns (total - futures = spot)
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS spot_volume NUMERIC(30,18)
  GENERATED ALWAYS AS (GREATEST(COALESCE(sodex_total_volume, 0) - COALESCE(cumulative_volume, 0), 0)) STORED;
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS spot_pnl NUMERIC(30,18)
  GENERATED ALWAYS AS (COALESCE(sodex_pnl, 0) - COALESCE(cumulative_pnl, 0)) STORED;

-- 3. Indexes for total/spot sorting
CREATE INDEX IF NOT EXISTS idx_leaderboard_sodex_vol_desc
  ON leaderboard(sodex_total_volume DESC NULLS LAST) WHERE sodex_total_volume > 0;
CREATE INDEX IF NOT EXISTS idx_leaderboard_sodex_pnl_desc
  ON leaderboard(sodex_pnl DESC NULLS LAST) WHERE sodex_total_volume > 0;
CREATE INDEX IF NOT EXISTS idx_leaderboard_spot_vol_desc
  ON leaderboard(spot_volume DESC NULLS LAST) WHERE spot_volume > 0;

-- 4. Add sodex columns to leaderboard_weekly
ALTER TABLE leaderboard_weekly ADD COLUMN IF NOT EXISTS sodex_total_volume NUMERIC(30,18) DEFAULT 0;
ALTER TABLE leaderboard_weekly ADD COLUMN IF NOT EXISTS sodex_pnl NUMERIC(30,18) DEFAULT 0;

-- 5. Recreate leaderboard_smart view with all columns
CREATE OR REPLACE VIEW leaderboard_smart AS
SELECT
  l.account_id,
  l.wallet_address,
  l.cumulative_pnl,
  l.cumulative_volume,
  l.unrealized_pnl,
  l.first_trade_ts_ms,
  l.pnl_rank,
  l.volume_rank,
  l.last_synced_at,
  l.is_sodex_owned,
  l.sodex_total_volume,
  l.sodex_pnl,
  l.spot_volume,
  l.spot_pnl
FROM leaderboard l;

GRANT SELECT ON leaderboard_smart TO anon, authenticated;


-- 6. Upsert RPC for Sodex sync data
CREATE OR REPLACE FUNCTION upsert_sodex_batch(rows jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  touched integer;
BEGIN
  WITH input AS (
    SELECT
      (r->>'account_id')::integer AS account_id,
      r->>'wallet_address' AS wallet_address,
      (r->>'sodex_total_volume')::numeric(30,18) AS sodex_total_volume,
      (r->>'sodex_pnl')::numeric(30,18) AS sodex_pnl
    FROM jsonb_array_elements(rows) AS r
  )
  INSERT INTO leaderboard (
    account_id, wallet_address,
    sodex_total_volume, sodex_pnl, last_synced_at
  )
  SELECT
    account_id, wallet_address,
    sodex_total_volume, sodex_pnl, now()
  FROM input
  ON CONFLICT (account_id) DO UPDATE SET
    wallet_address     = COALESCE(EXCLUDED.wallet_address, leaderboard.wallet_address),
    sodex_total_volume = EXCLUDED.sodex_total_volume,
    sodex_pnl          = EXCLUDED.sodex_pnl,
    last_synced_at     = now()
  WHERE
    leaderboard.sodex_total_volume IS DISTINCT FROM EXCLUDED.sodex_total_volume
    OR leaderboard.sodex_pnl IS DISTINCT FROM EXCLUDED.sodex_pnl;

  GET DIAGNOSTICS touched = ROW_COUNT;
  RETURN touched;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_sodex_batch(jsonb) TO service_role;


-- 7. Update sync_current_week to include sodex columns
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
    first_trade_ts_ms, is_sodex_owned,
    sodex_total_volume, sodex_pnl,
    last_synced_at
  )
  SELECT
    0, account_id, wallet_address,
    cumulative_pnl, cumulative_volume, unrealized_pnl,
    first_trade_ts_ms, is_sodex_owned,
    sodex_total_volume, sodex_pnl,
    NOW()
  FROM leaderboard
  WHERE cumulative_volume > 0 OR sodex_total_volume > 0
  ON CONFLICT (week_number, account_id)
  DO UPDATE SET
    wallet_address     = EXCLUDED.wallet_address,
    cumulative_pnl     = EXCLUDED.cumulative_pnl,
    cumulative_volume  = EXCLUDED.cumulative_volume,
    unrealized_pnl     = EXCLUDED.unrealized_pnl,
    first_trade_ts_ms  = EXCLUDED.first_trade_ts_ms,
    is_sodex_owned     = EXCLUDED.is_sodex_owned,
    sodex_total_volume = EXCLUDED.sodex_total_volume,
    sodex_pnl          = EXCLUDED.sodex_pnl,
    last_synced_at     = NOW();

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

-- 8. Update freeze_current_week to include sodex columns
CREATE OR REPLACE FUNCTION freeze_current_week()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  wk INT;
BEGIN
  SELECT current_week_number INTO wk FROM leaderboard_meta WHERE id = 1;

  INSERT INTO leaderboard_weekly (
    week_number, account_id, wallet_address,
    cumulative_pnl, cumulative_volume, unrealized_pnl,
    first_trade_ts_ms, pnl_rank, volume_rank,
    is_sodex_owned, sodex_total_volume, sodex_pnl,
    last_synced_at
  )
  SELECT
    wk, account_id, wallet_address,
    cumulative_pnl, cumulative_volume, unrealized_pnl,
    first_trade_ts_ms, pnl_rank, volume_rank,
    is_sodex_owned, sodex_total_volume, sodex_pnl,
    last_synced_at
  FROM leaderboard_weekly
  WHERE week_number = 0;

  DELETE FROM leaderboard_weekly WHERE week_number = 0;

  UPDATE leaderboard_meta
  SET current_week_number = wk + 1,
      week_start_ts = NOW()
  WHERE id = 1;

  PERFORM sync_current_week();

  RETURN json_build_object('frozenWeek', wk, 'newWeek', wk + 1);
END;
$$;


-- 9. Update get_weekly_leaderboard to return sodex + spot columns
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
        cw.volume_rank,
        cw.sodex_total_volume AS weekly_sodex_volume,
        cw.sodex_pnl AS weekly_sodex_pnl,
        GREATEST(cw.sodex_total_volume - cw.cumulative_volume, 0) AS weekly_spot_volume,
        (cw.sodex_pnl - cw.cumulative_pnl) AS weekly_spot_pnl
      FROM leaderboard_weekly cw
      WHERE cw.week_number = actual_week
        AND (NOT p_exclude_sodex OR cw.is_sodex_owned IS NOT TRUE)
        AND (cw.cumulative_volume > 0 OR cw.sodex_total_volume > 0)
      ORDER BY
        CASE WHEN p_sort = 'volume' THEN cw.volume_rank ELSE cw.pnl_rank END ASC
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
        cw.volume_rank,
        (cw.sodex_total_volume - COALESCE(pw.sodex_total_volume, 0)) AS weekly_sodex_volume,
        (cw.sodex_pnl - COALESCE(pw.sodex_pnl, 0)) AS weekly_sodex_pnl,
        GREATEST(
          (cw.sodex_total_volume - COALESCE(pw.sodex_total_volume, 0))
          - (cw.cumulative_volume - COALESCE(pw.cumulative_volume, 0)),
          0
        ) AS weekly_spot_volume,
        (cw.sodex_pnl - COALESCE(pw.sodex_pnl, 0))
          - (cw.cumulative_pnl - COALESCE(pw.cumulative_pnl, 0)) AS weekly_spot_pnl
      FROM leaderboard_weekly cw
      LEFT JOIN leaderboard_weekly pw
        ON pw.account_id = cw.account_id AND pw.week_number = prev_week
      WHERE cw.week_number = actual_week
        AND (NOT p_exclude_sodex OR cw.is_sodex_owned IS NOT TRUE)
        AND ((cw.cumulative_volume - COALESCE(pw.cumulative_volume, 0)) > 0
             OR (cw.sodex_total_volume - COALESCE(pw.sodex_total_volume, 0)) > 0)
      ORDER BY
        CASE WHEN p_sort = 'volume' THEN cw.volume_rank ELSE cw.pnl_rank END ASC
      LIMIT p_limit OFFSET p_offset
    ) t;
  END IF;

  RETURN COALESCE(result, '[]'::JSON);
END;
$$;

-- 10. Update get_weekly_leaderboard_count for sodex data
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
      AND (cw.cumulative_volume > 0 OR cw.sodex_total_volume > 0);
  ELSE
    SELECT COUNT(*) INTO cnt
    FROM leaderboard_weekly cw
    LEFT JOIN leaderboard_weekly pw
      ON pw.account_id = cw.account_id AND pw.week_number = prev_week
    WHERE cw.week_number = actual_week
      AND (NOT p_exclude_sodex OR cw.is_sodex_owned IS NOT TRUE)
      AND ((cw.cumulative_volume - COALESCE(pw.cumulative_volume, 0)) > 0
           OR (cw.sodex_total_volume - COALESCE(pw.sodex_total_volume, 0)) > 0);
  END IF;

  RETURN cnt;
END;
$$;
