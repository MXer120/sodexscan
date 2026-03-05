-- Fix get_leaderboard_stats: was querying old 'leaderboard' table with active-only filter.
-- Now matches get_current_week_stats (leaderboard_smart, all non-sodex users).
CREATE OR REPLACE FUNCTION get_leaderboard_stats()
RETURNS JSON AS $$
DECLARE
    total_users INT;
    gt_2k_vol INT;
    gt_1k_vol INT;
BEGIN
    SELECT COUNT(*) INTO total_users
    FROM public.leaderboard_smart
    WHERE (is_sodex_owned IS NULL OR is_sodex_owned = false);

    SELECT COUNT(*) INTO gt_2k_vol
    FROM public.leaderboard_smart
    WHERE cumulative_volume >= 2000
      AND (is_sodex_owned IS NULL OR is_sodex_owned = false);

    SELECT COUNT(*) INTO gt_1k_vol
    FROM public.leaderboard_smart
    WHERE cumulative_volume >= 1000
      AND (is_sodex_owned IS NULL OR is_sodex_owned = false);

    RETURN json_build_object(
        'totalUsers', COALESCE(total_users, 0),
        'gt2kVol', COALESCE(gt_2k_vol, 0),
        'gt1kVol', COALESCE(gt_1k_vol, 0)
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'error', SQLERRM,
        'totalUsers', 0,
        'gt2kVol', 0,
        'gt1kVol', 0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix get_weekly_leaderboard_stats: add total_users column from leaderboard_weekly.
-- WeekTable was falling back to manually-maintained leaderboard_meta.total_user_counts JSON.
CREATE OR REPLACE FUNCTION get_weekly_leaderboard_stats(p_from_week INT, p_to_week INT)
RETURNS TABLE(
  week_number INT,
  total_users BIGINT,
  traders BIGINT,
  active_traders BIGINT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    lw.week_number,
    COUNT(*) FILTER (WHERE NOT COALESCE(lw.is_sodex_owned, false)) AS total_users,
    COUNT(*) FILTER (WHERE lw.cumulative_volume > 0 AND NOT COALESCE(lw.is_sodex_owned, false)) AS traders,
    COUNT(*) FILTER (WHERE lw.cumulative_volume >= 5000 AND NOT COALESCE(lw.is_sodex_owned, false)) AS active_traders
  FROM leaderboard_weekly lw
  WHERE lw.week_number BETWEEN p_from_week AND p_to_week
  GROUP BY lw.week_number;
$$;

GRANT EXECUTE ON FUNCTION get_leaderboard_stats TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_leaderboard_stats(INT, INT) TO anon, authenticated;
