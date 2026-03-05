-- Egress optimization migration

-- 1. Add missing index for is_sodex_owned filter on leaderboard_weekly
-- Most queries filter WHERE is_sodex_owned IS NOT TRUE
CREATE INDEX IF NOT EXISTS idx_weekly_not_sodex
  ON leaderboard_weekly(week_number)
  WHERE is_sodex_owned IS NOT TRUE;

-- 2. Drop redundant indexes superseded by partial indexes from 20260227
-- idx_leaderboard_rank_pnl (WHERE cumulative_volume > 0) replaces idx_leaderboard_pnl_desc
-- idx_leaderboard_rank_volume (WHERE cumulative_volume > 0) replaces idx_leaderboard_volume_desc
DROP INDEX IF EXISTS idx_leaderboard_pnl_desc;
DROP INDEX IF EXISTS idx_leaderboard_volume_desc;

-- 3. Truncate search_history (write-only table, data never read back by any feature)
TRUNCATE search_history;

-- 4. Add weekly cleanup cron for search_history to prevent unbounded growth
SELECT cron.schedule(
  'cleanup-search-history',
  '0 4 * * 0',
  $$DELETE FROM search_history WHERE searched_at < now() - interval '30 days'$$
);
