-- Function to calculate and update ranks
CREATE OR REPLACE FUNCTION update_leaderboard_ranks()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update PnL ranks
  WITH ranked_pnl AS (
    SELECT
      account_id,
      ROW_NUMBER() OVER (ORDER BY cumulative_pnl DESC) as rank
    FROM leaderboard
  )
  UPDATE leaderboard
  SET pnl_rank = ranked_pnl.rank
  FROM ranked_pnl
  WHERE leaderboard.account_id = ranked_pnl.account_id;

  -- Update volume ranks
  WITH ranked_volume AS (
    SELECT
      account_id,
      ROW_NUMBER() OVER (ORDER BY cumulative_volume DESC) as rank
    FROM leaderboard
  )
  UPDATE leaderboard
  SET volume_rank = ranked_volume.rank
  FROM ranked_volume
  WHERE leaderboard.account_id = ranked_volume.account_id;
END;
$$;
