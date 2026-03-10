-- sync_current_week() times out on 98k rows because of two
-- ROW_NUMBER() ranking UPDATEs. The live weekly RPC already
-- sorts by computed deltas, so ranks are only needed at freeze
-- time (for the exported JSON). Remove ranking from sync,
-- keep it in freeze only.

CREATE OR REPLACE FUNCTION sync_current_week()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '120s'
AS $$
DECLARE
  synced INT;
BEGIN
  INSERT INTO leaderboard_weekly (
    week_number, account_id, wallet_address,
    cumulative_pnl, cumulative_volume, unrealized_pnl,
    is_sodex_owned, sodex_total_volume, sodex_pnl
  )
  SELECT
    0, account_id, wallet_address,
    cumulative_pnl, cumulative_volume, unrealized_pnl,
    is_sodex_owned, sodex_total_volume, sodex_pnl
  FROM leaderboard
  WHERE cumulative_volume > 0 OR sodex_total_volume > 0
  ON CONFLICT (week_number, account_id)
  DO UPDATE SET
    wallet_address     = EXCLUDED.wallet_address,
    cumulative_pnl     = EXCLUDED.cumulative_pnl,
    cumulative_volume  = EXCLUDED.cumulative_volume,
    unrealized_pnl     = EXCLUDED.unrealized_pnl,
    is_sodex_owned     = EXCLUDED.is_sodex_owned,
    sodex_total_volume = EXCLUDED.sodex_total_volume,
    sodex_pnl          = EXCLUDED.sodex_pnl;

  GET DIAGNOSTICS synced = ROW_COUNT;
  RETURN json_build_object('synced', synced);
END;
$$;

-- Immediately run it to populate week 0 with fresh data
SELECT sync_current_week();
