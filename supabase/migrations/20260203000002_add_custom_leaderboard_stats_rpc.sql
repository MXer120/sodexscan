-- RPC to get custom leaderboard stats
CREATE OR REPLACE FUNCTION get_custom_leaderboard_stats(
    v_thresh NUMERIC,
    v_op TEXT,
    p_thresh NUMERIC,
    p_op TEXT
)
RETURNS JSON AS $$
DECLARE
    vol_count INT;
    pnl_count INT;
    combined_count INT;
BEGIN
    -- 1. Count by volume
    IF v_op = 'gt' THEN
        SELECT COUNT(*) INTO vol_count FROM public.leaderboard WHERE cumulative_volume > v_thresh;
    ELSE
        SELECT COUNT(*) INTO vol_count FROM public.leaderboard WHERE cumulative_volume < v_thresh;
    END IF;

    -- 2. Count by pnl
    IF p_op = 'gt' THEN
        SELECT COUNT(*) INTO pnl_count FROM public.leaderboard WHERE cumulative_pnl > p_thresh;
    ELSE
        SELECT COUNT(*) INTO pnl_count FROM public.leaderboard WHERE cumulative_pnl < p_thresh;
    END IF;

    -- 3. Combined count (AND)
    IF v_op = 'gt' AND p_op = 'gt' THEN
        SELECT COUNT(*) INTO combined_count FROM public.leaderboard WHERE cumulative_volume > v_thresh AND cumulative_pnl > p_thresh;
    ELSIF v_op = 'gt' AND p_op = 'lt' THEN
        SELECT COUNT(*) INTO combined_count FROM public.leaderboard WHERE cumulative_volume > v_thresh AND cumulative_pnl < p_thresh;
    ELSIF v_op = 'lt' AND p_op = 'gt' THEN
        SELECT COUNT(*) INTO combined_count FROM public.leaderboard WHERE cumulative_volume < v_thresh AND cumulative_pnl > p_thresh;
    ELSE
        SELECT COUNT(*) INTO combined_count FROM public.leaderboard WHERE cumulative_volume < v_thresh AND cumulative_pnl < p_thresh;
    END IF;

    RETURN json_build_object(
        'volCount', COALESCE(vol_count, 0),
        'pnlCount', COALESCE(pnl_count, 0),
        'combinedCount', COALESCE(combined_count, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_custom_leaderboard_stats TO anon, authenticated;
