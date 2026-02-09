-- DEPRECATED: This migration was premature.
-- Week 1 snapshot is now handled by pg_cron freeze_current_week()
-- at Feb 9 00:00 UTC (Monday). See 20260209000005_fix_week1_timing.sql
--
-- Original: seeded week 1 from leaderboard + computed ranks + synced week 0
-- That data is removed by migration 000005.

-- Keep sync_current_week() call to ensure week 0 is populated
SELECT sync_current_week();
