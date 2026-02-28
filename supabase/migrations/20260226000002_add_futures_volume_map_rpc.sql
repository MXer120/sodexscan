-- Lightweight RPC: returns { "wallet_address": volume } JSON map
-- Replaces client-side paginated loops through get_weekly_leaderboard
-- Used by SoPointsPage and PointsLeaderboardWidget for points calculation

CREATE OR REPLACE FUNCTION get_futures_volume_map(
  p_week INT,
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
    SELECT json_object_agg(
      lower(cw.wallet_address),
      cw.cumulative_volume
    ) INTO result
    FROM leaderboard_weekly cw
    WHERE cw.week_number = actual_week
      AND (NOT p_exclude_sodex OR cw.is_sodex_owned IS NOT TRUE)
      AND cw.cumulative_volume > 0;
  ELSE
    SELECT json_object_agg(
      lower(cw.wallet_address),
      (cw.cumulative_volume - COALESCE(pw.cumulative_volume, 0))
    ) INTO result
    FROM leaderboard_weekly cw
    LEFT JOIN leaderboard_weekly pw
      ON pw.account_id = cw.account_id AND pw.week_number = prev_week
    WHERE cw.week_number = actual_week
      AND (NOT p_exclude_sodex OR cw.is_sodex_owned IS NOT TRUE)
      AND (cw.cumulative_volume - COALESCE(pw.cumulative_volume, 0)) > 0;
  END IF;

  RETURN COALESCE(result, '{}'::JSON);
END;
$$;

GRANT EXECUTE ON FUNCTION get_futures_volume_map TO anon, authenticated;
