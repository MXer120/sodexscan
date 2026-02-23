-- ============================================================
-- Fix week 3 stats:
--   1. Reduce total_user_counts week 3 by 900
--   2. Delete 164 lowest-volume rows from leaderboard_weekly week 3
-- ============================================================

-- 1. Update total_user_counts: subtract 900 from week 3 value
UPDATE leaderboard_meta
SET total_user_counts = jsonb_set(
  total_user_counts,
  '{3}',
  to_jsonb((total_user_counts->>'3')::int - 900)
)
WHERE id = 1
  AND total_user_counts ? '3';

-- 2. Delete 164 lowest-volume traders from week 3
DELETE FROM leaderboard_weekly
WHERE ctid IN (
  SELECT ctid
  FROM leaderboard_weekly
  WHERE week_number = 3
    AND cumulative_volume > 0
    AND is_sodex_owned IS NOT TRUE
  ORDER BY cumulative_volume ASC
  LIMIT 164
);
