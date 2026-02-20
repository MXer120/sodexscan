-- Reclaim dead tuple disk space from leaderboard bloat
-- VACUUM FULL rewrites table to minimum size (takes brief exclusive lock)
VACUUM FULL leaderboard;
