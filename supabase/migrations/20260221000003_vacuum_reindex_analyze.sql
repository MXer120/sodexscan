-- Drop the stale trigger from schema.sql if it exists
-- (fires on every update, sets non-existent updated_at column)
DROP TRIGGER IF EXISTS update_leaderboard_updated_at ON leaderboard;

-- Reclaim space
VACUUM FULL leaderboard;
REINDEX TABLE leaderboard;
ANALYZE leaderboard;
