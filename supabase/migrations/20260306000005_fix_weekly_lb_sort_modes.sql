-- Fix get_weekly_leaderboard: add sort modes for futures/spot/total volume,
-- filter out 0-value rows per sort mode, sort by actual weekly delta values.
-- p_sort values: 'volume' (total), 'futures_volume', 'spot_volume', 'pnl'

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
    -- Week 1 (or current week when it's week 1): no previous week to subtract
    SELECT json_agg(row_to_json(t)) INTO result FROM (
      SELECT * FROM (
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
      ) sub
      WHERE
        CASE p_sort
          WHEN 'futures_volume' THEN sub.weekly_volume > 0
          WHEN 'spot_volume' THEN sub.weekly_spot_volume > 0
          WHEN 'pnl' THEN sub.weekly_pnl != 0
          ELSE true  -- 'volume' = total, include all with any volume
        END
      ORDER BY
        CASE p_sort
          WHEN 'futures_volume' THEN sub.weekly_volume
          WHEN 'spot_volume' THEN sub.weekly_spot_volume
          WHEN 'pnl' THEN sub.weekly_pnl
          ELSE sub.weekly_sodex_volume  -- total volume (spot+futures)
        END DESC
      LIMIT p_limit OFFSET p_offset
    ) t;
  ELSE
    -- Weeks 2+: subtract previous week
    SELECT json_agg(row_to_json(t)) INTO result FROM (
      SELECT * FROM (
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
      ) sub
      WHERE
        CASE p_sort
          WHEN 'futures_volume' THEN sub.weekly_volume > 0
          WHEN 'spot_volume' THEN sub.weekly_spot_volume > 0
          WHEN 'pnl' THEN sub.weekly_pnl != 0
          ELSE true
        END
      ORDER BY
        CASE p_sort
          WHEN 'futures_volume' THEN sub.weekly_volume
          WHEN 'spot_volume' THEN sub.weekly_spot_volume
          WHEN 'pnl' THEN sub.weekly_pnl
          ELSE sub.weekly_sodex_volume
        END DESC
      LIMIT p_limit OFFSET p_offset
    ) t;
  END IF;

  RETURN COALESCE(result, '[]'::JSON);
END;
$$;
