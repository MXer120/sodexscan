-- ============================================================
-- Cleanup historical weekly leaderboard rows after GitHub export.
-- Keeps: week 0 (live) + latest frozen week (needed for delta calc).
-- Deletes: all older frozen weeks (already exported to static JSON).
-- ============================================================

-- Safety: only delete weeks older than the previous frozen week
-- current_week_number = 6 → keep week 0 and week 5, delete weeks 1-4
DELETE FROM leaderboard_weekly
WHERE week_number >= 1
  AND week_number < (SELECT current_week_number - 1 FROM leaderboard_meta WHERE id = 1);
