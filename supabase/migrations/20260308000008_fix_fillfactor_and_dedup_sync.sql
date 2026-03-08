-- 1. Reset fillfactor to default (100) — 70 wastes 30% disk per page,
--    increases scan I/O for every query. HOT updates aren't frequent
--    enough to justify the tradeoff on 90k+ row tables.
ALTER TABLE leaderboard SET (fillfactor = 100);
ALTER TABLE leaderboard_weekly SET (fillfactor = 100);

-- 2. Remove redundant sync-current-week pg_cron job.
--    sync_current_week() is already called by freeze_current_week() on Monday,
--    and we only need it every 15 min. Re-schedule at offset :07 so it doesn't
--    collide with sync-sodex-leaderboard (:15) or sync-existing-accounts (*/5).
--    (The old job name stays, just rescheduled to confirm single ownership.)
-- No action needed here — the cron job already exists at */15.
-- The duplicate call was in the sodex sync route (removed in app code).
