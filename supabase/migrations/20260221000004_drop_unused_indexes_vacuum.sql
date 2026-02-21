-- ============================================================
-- Fix: 12 indexes on leaderboard (77MB) vs 29MB table data
-- Each UPDATE rewrites every index → massive write amplification.
-- Drop unused/redundant indexes, keep only essential ones.
-- ============================================================

-- Drop 6 unnecessary indexes
DROP INDEX IF EXISTS idx_leaderboard_wallet_search;
DROP INDEX IF EXISTS leaderboard_first_trade_ts_ms_idx;
DROP INDEX IF EXISTS leaderboard_is_sodex_owned_idx;
DROP INDEX IF EXISTS leaderboard_priority_idx;
DROP INDEX IF EXISTS leaderboard_last_synced_at_idx;
DROP INDEX IF EXISTS leaderboard_unrealized_pnl_idx;

-- Refresh stats
ANALYZE leaderboard;
