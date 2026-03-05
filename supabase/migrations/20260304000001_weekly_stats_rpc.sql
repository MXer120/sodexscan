-- Replace 3 parallel COUNT queries on leaderboard_smart with 1 aggregation
CREATE OR REPLACE FUNCTION get_current_week_stats()
RETURNS TABLE(
  total_users BIGINT,
  traders BIGINT,
  active_traders BIGINT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COUNT(*) FILTER (WHERE is_sodex_owned IS NULL OR is_sodex_owned = false) AS total_users,
    COUNT(*) FILTER (WHERE (cumulative_volume > 0 OR cumulative_pnl != 0) AND (is_sodex_owned IS NULL OR is_sodex_owned = false)) AS traders,
    COUNT(*) FILTER (WHERE cumulative_volume >= 5000 AND (is_sodex_owned IS NULL OR is_sodex_owned = false)) AS active_traders
  FROM leaderboard_smart;
$$;

GRANT EXECUTE ON FUNCTION get_current_week_stats() TO anon, authenticated;

-- Replace 8 sequential COUNT queries on leaderboard_weekly with 1 aggregation
CREATE OR REPLACE FUNCTION get_weekly_leaderboard_stats(p_from_week INT, p_to_week INT)
RETURNS TABLE(
  week_number INT,
  traders BIGINT,
  active_traders BIGINT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    lw.week_number,
    COUNT(*) FILTER (WHERE lw.cumulative_volume > 0 AND NOT COALESCE(lw.is_sodex_owned, false)) AS traders,
    COUNT(*) FILTER (WHERE lw.cumulative_volume >= 5000 AND NOT COALESCE(lw.is_sodex_owned, false)) AS active_traders
  FROM leaderboard_weekly lw
  WHERE lw.week_number BETWEEN p_from_week AND p_to_week
  GROUP BY lw.week_number;
$$;

GRANT EXECUTE ON FUNCTION get_weekly_leaderboard_stats(INT, INT) TO anon, authenticated;
