-- Upgrade upsert_leaderboard_batch to handle all synced fields
-- (unrealized_pnl, first_trade_ts_ms were missing)
CREATE OR REPLACE FUNCTION upsert_leaderboard_batch(rows jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  touched integer;
BEGIN
  WITH input AS (
    SELECT
      (r->>'account_id')::integer AS account_id,
      r->>'wallet_address' AS wallet_address,
      (r->>'cumulative_pnl')::numeric(30,18) AS cumulative_pnl,
      (r->>'cumulative_volume')::numeric(30,18) AS cumulative_volume,
      (r->>'unrealized_pnl')::numeric(30,18) AS unrealized_pnl,
      (r->>'first_trade_ts_ms')::bigint AS first_trade_ts_ms
    FROM jsonb_array_elements(rows) AS r
  )
  INSERT INTO leaderboard (
    account_id, wallet_address,
    cumulative_pnl, cumulative_volume, unrealized_pnl,
    first_trade_ts_ms, last_synced_at
  )
  SELECT
    account_id, wallet_address,
    cumulative_pnl, cumulative_volume, unrealized_pnl,
    first_trade_ts_ms, now()
  FROM input
  ON CONFLICT (account_id) DO UPDATE SET
    wallet_address     = EXCLUDED.wallet_address,
    cumulative_pnl     = EXCLUDED.cumulative_pnl,
    cumulative_volume  = EXCLUDED.cumulative_volume,
    unrealized_pnl     = EXCLUDED.unrealized_pnl,
    first_trade_ts_ms  = EXCLUDED.first_trade_ts_ms,
    last_synced_at     = now()
  WHERE
    leaderboard.cumulative_pnl     IS DISTINCT FROM EXCLUDED.cumulative_pnl
    OR leaderboard.cumulative_volume IS DISTINCT FROM EXCLUDED.cumulative_volume
    OR leaderboard.unrealized_pnl    IS DISTINCT FROM EXCLUDED.unrealized_pnl
    OR leaderboard.wallet_address    IS DISTINCT FROM EXCLUDED.wallet_address
    OR leaderboard.first_trade_ts_ms IS DISTINCT FROM EXCLUDED.first_trade_ts_ms;

  GET DIAGNOSTICS touched = ROW_COUNT;
  RETURN touched;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_leaderboard_batch(jsonb) TO service_role;
