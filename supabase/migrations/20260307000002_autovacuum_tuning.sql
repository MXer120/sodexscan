-- Aggressive autovacuum for high-churn tables (leaderboard, leaderboard_weekly)
-- These get frequent upserts from edge functions + sync_current_week() cron
-- Default autovacuum_vacuum_threshold=50, scale_factor=0.2 is too lazy

-- leaderboard: upserted every 5 min (100 rows), ranks recomputed every 15 min
ALTER TABLE leaderboard SET (
  autovacuum_vacuum_threshold = 25,
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_threshold = 25,
  autovacuum_analyze_scale_factor = 0.05,
  fillfactor = 70  -- reserve 30% for HOT updates (avoids index bloat)
);

-- leaderboard_weekly: sync_current_week() touches all week-0 rows every 15 min
ALTER TABLE leaderboard_weekly SET (
  autovacuum_vacuum_threshold = 25,
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_threshold = 25,
  autovacuum_analyze_scale_factor = 0.05,
  fillfactor = 70
);

-- http_request_queue: high insert/delete churn (every minute)
ALTER TABLE http_request_queue SET (
  autovacuum_vacuum_threshold = 10,
  autovacuum_vacuum_scale_factor = 0.01
);
