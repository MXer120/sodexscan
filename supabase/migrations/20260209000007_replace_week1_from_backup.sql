-- Replace week 1 frozen snapshot with lbbackup data (00:00 UTC backup)
-- lbbackup may have TEXT columns, cast to NUMERIC

DELETE FROM leaderboard_weekly WHERE week_number = 1;

INSERT INTO leaderboard_weekly (
  week_number, account_id, wallet_address,
  cumulative_pnl, cumulative_volume, unrealized_pnl,
  first_trade_ts_ms, is_sodex_owned, last_synced_at
)
SELECT
  1,
  account_id::INTEGER,
  wallet_address,
  cumulative_pnl::NUMERIC(30,18),
  cumulative_volume::NUMERIC(30,18),
  unrealized_pnl::NUMERIC(30,18),
  first_trade_ts_ms::BIGINT,
  is_sodex_owned::BOOLEAN,
  NOW()
FROM lbbackup
WHERE cumulative_volume::NUMERIC > 0
ON CONFLICT (week_number, account_id) DO NOTHING;

-- Recompute ranks for week 1
WITH ranked_pnl AS (
  SELECT account_id, ROW_NUMBER() OVER (ORDER BY cumulative_pnl DESC) AS r
  FROM leaderboard_weekly WHERE week_number = 1
)
UPDATE leaderboard_weekly w
SET pnl_rank = ranked_pnl.r
FROM ranked_pnl
WHERE w.account_id = ranked_pnl.account_id AND w.week_number = 1;

WITH ranked_vol AS (
  SELECT account_id, ROW_NUMBER() OVER (ORDER BY cumulative_volume DESC) AS r
  FROM leaderboard_weekly WHERE week_number = 1
)
UPDATE leaderboard_weekly w
SET volume_rank = ranked_vol.r
FROM ranked_vol
WHERE w.account_id = ranked_vol.account_id AND w.week_number = 1;
