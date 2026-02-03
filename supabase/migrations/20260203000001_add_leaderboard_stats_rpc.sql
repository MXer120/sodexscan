-- RPC to get basic leaderboard stats including volume thresholds
CREATE OR REPLACE FUNCTION get_leaderboard_stats()
RETURNS JSON AS $$
DECLARE
    total_users INT;
    gt_2k_vol INT;
    gt_1k_vol INT;
BEGIN
    -- 1. Total users (active or previous pnl)
    SELECT COUNT(*) INTO total_users 
    FROM public.leaderboard 
    WHERE (cumulative_pnl != 0 OR cumulative_volume > 0);

    -- 2. Users with >= 2k total volume
    SELECT COUNT(*) INTO gt_2k_vol FROM public.leaderboard WHERE cumulative_volume >= 2000;

    -- 3. Users with >= 1k total volume
    SELECT COUNT(*) INTO gt_1k_vol FROM public.leaderboard WHERE cumulative_volume >= 1000;

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

GRANT EXECUTE ON FUNCTION get_leaderboard_stats TO anon, authenticated;
