-- Optimize update_leaderboard_ranks():
--   1. Partial indexes so window functions only scan traders
--   2. Single CTE computes both pnl_rank + volume_rank in one pass
--   3. 2 UPDATEs instead of 4 (traders + clear-non-traders)

-- ── Partial indexes (only traders, skips NULL/zero volume rows) ──
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank_pnl
  ON leaderboard (cumulative_pnl DESC NULLS LAST)
  WHERE cumulative_volume > 0;

CREATE INDEX IF NOT EXISTS idx_leaderboard_rank_volume
  ON leaderboard (cumulative_volume DESC NULLS LAST)
  WHERE cumulative_volume > 0;

-- Index to find non-traders fast for the clear step
CREATE INDEX IF NOT EXISTS idx_leaderboard_nontraders
  ON leaderboard (account_id)
  WHERE cumulative_volume IS NULL OR cumulative_volume <= 0;

-- ── Optimized function ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_leaderboard_ranks()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Single pass over traders: compute both ranks simultaneously
  WITH traders AS (
    SELECT
      account_id,
      ROW_NUMBER() OVER (ORDER BY cumulative_pnl    DESC NULLS LAST) AS pnl_rank,
      ROW_NUMBER() OVER (ORDER BY cumulative_volume DESC NULLS LAST) AS volume_rank
    FROM leaderboard
    WHERE cumulative_volume > 0   -- partial index used here
  )
  UPDATE leaderboard l
  SET
    pnl_rank    = traders.pnl_rank,
    volume_rank = traders.volume_rank
  FROM traders
  WHERE l.account_id = traders.account_id
    AND (
      l.pnl_rank    IS DISTINCT FROM traders.pnl_rank
      OR
      l.volume_rank IS DISTINCT FROM traders.volume_rank
    );

  -- Clear stale ranks for non-traders in one shot
  UPDATE leaderboard
  SET pnl_rank = NULL, volume_rank = NULL
  WHERE (cumulative_volume IS NULL OR cumulative_volume <= 0)
    AND (pnl_rank IS NOT NULL OR volume_rank IS NOT NULL);
END;
$$;
