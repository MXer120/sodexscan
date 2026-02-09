-- Fix: Week 1 was seeded prematurely on Feb 8.
-- Week 1 should freeze at Feb 9 00:00 UTC via pg_cron.
-- Right now we are IN week 1, not week 2.

-- Remove premature week 1 snapshot
DELETE FROM leaderboard_weekly WHERE week_number = 1;

-- Set meta back to week 1 (we're currently in week 1)
UPDATE leaderboard_meta SET current_week_number = 1;

-- Re-sync week 0 (live) to ensure it's fresh
SELECT sync_current_week();
