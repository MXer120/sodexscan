-- Replace currentWeek parallel get_spot_snapshot calls with 1 query
CREATE OR REPLACE FUNCTION get_all_spot_snapshots(p_max_week INT)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    json_object_agg(
      sub.week_number,
      sub.snapshot
    ),
    '{}'::JSON
  )
  FROM (
    SELECT
      week_number,
      json_object_agg(
        wallet_address,
        json_build_object('vol', volume, 'userId', user_id, 'last_ts', last_ts)
      ) AS snapshot
    FROM spot_volume_snapshots
    WHERE week_number BETWEEN 1 AND p_max_week
    GROUP BY week_number
  ) sub;
$$;

GRANT EXECUTE ON FUNCTION get_all_spot_snapshots(INT) TO anon, authenticated;

-- Replace currentWeek parallel get_futures_volume_map calls with 1 query
CREATE OR REPLACE FUNCTION get_all_futures_volume_maps(p_max_week INT, p_exclude_sodex BOOLEAN DEFAULT TRUE)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  current_week_num INT;
  result JSON;
BEGIN
  SELECT current_week_number INTO current_week_num FROM leaderboard_meta WHERE id = 1;

  SELECT COALESCE(json_object_agg(w.week_key, w.vol_map), '{}'::JSON) INTO result
  FROM (
    -- Week 0 (live): cumulative volume for current live week
    SELECT
      '0' AS week_key,
      COALESCE(
        json_object_agg(lower(cw.wallet_address), cw.cumulative_volume)
          FILTER (WHERE cw.cumulative_volume > 0),
        '{}'::JSON
      ) AS vol_map
    FROM leaderboard_weekly cw
    WHERE cw.week_number = current_week_num - 1
      AND (NOT p_exclude_sodex OR cw.is_sodex_owned IS NOT TRUE)

    UNION ALL

    -- Historical weeks 1..p_max_week: delta vs previous week
    SELECT
      cw.week_number::TEXT AS week_key,
      COALESCE(
        json_object_agg(
          lower(cw.wallet_address),
          (cw.cumulative_volume - COALESCE(pw.cumulative_volume, 0))
        ) FILTER (WHERE (cw.cumulative_volume - COALESCE(pw.cumulative_volume, 0)) > 0),
        '{}'::JSON
      ) AS vol_map
    FROM leaderboard_weekly cw
    LEFT JOIN leaderboard_weekly pw
      ON pw.account_id = cw.account_id AND pw.week_number = cw.week_number - 1
    WHERE cw.week_number BETWEEN 1 AND p_max_week
      AND (NOT p_exclude_sodex OR cw.is_sodex_owned IS NOT TRUE)
    GROUP BY cw.week_number
  ) w;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_futures_volume_maps(INT, BOOLEAN) TO anon, authenticated;
