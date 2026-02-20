-- Rebuild bloated indexes and refresh row estimate
REINDEX TABLE leaderboard;
ANALYZE leaderboard;
