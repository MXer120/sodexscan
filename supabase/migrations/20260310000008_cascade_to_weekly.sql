-- ============================================================
-- Cascade: when Sodex API data lands in leaderboard, immediately
-- update leaderboard_weekly week 0 too. No waiting for sync_current_week cron.
-- Weekly delta = (live Sodex data in week 0) - (frozen snapshot).
-- ============================================================

-- 1. upsert_sodex_batch: cascade sodex_total_volume + sodex_pnl to week 0
CREATE OR REPLACE FUNCTION upsert_sodex_batch(rows jsonb)
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
      (r->>'sodex_total_volume')::numeric(30,18) AS sodex_total_volume,
      (r->>'sodex_pnl')::numeric(30,18) AS sodex_pnl
    FROM jsonb_array_elements(rows) AS r
  )
  INSERT INTO leaderboard (
    account_id, wallet_address,
    sodex_total_volume, sodex_pnl, last_synced_at
  )
  SELECT
    account_id, wallet_address,
    sodex_total_volume, sodex_pnl, now()
  FROM input
  ON CONFLICT (account_id) DO UPDATE SET
    wallet_address     = COALESCE(EXCLUDED.wallet_address, leaderboard.wallet_address),
    sodex_total_volume = EXCLUDED.sodex_total_volume,
    sodex_pnl          = EXCLUDED.sodex_pnl,
    last_synced_at     = now()
  WHERE
    leaderboard.sodex_total_volume IS DISTINCT FROM EXCLUDED.sodex_total_volume
    OR leaderboard.sodex_pnl IS DISTINCT FROM EXCLUDED.sodex_pnl;

  GET DIAGNOSTICS touched = ROW_COUNT;

  -- Cascade to week 0: immediately reflect Sodex data in weekly LB
  UPDATE leaderboard_weekly w
  SET sodex_total_volume = l.sodex_total_volume,
      sodex_pnl          = l.sodex_pnl,
      last_synced_at     = now()
  FROM leaderboard l
  WHERE w.week_number = 0
    AND w.account_id = l.account_id
    AND l.account_id IN (
      SELECT (r->>'account_id')::integer FROM jsonb_array_elements(rows) r
    );

  RETURN touched;
END;
$$;

-- 2. upsert_leaderboard_batch: cascade futures data to week 0
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

  -- Cascade to week 0: immediately reflect futures data in weekly LB
  UPDATE leaderboard_weekly w
  SET cumulative_pnl    = l.cumulative_pnl,
      cumulative_volume = l.cumulative_volume,
      unrealized_pnl    = l.unrealized_pnl,
      last_synced_at    = now()
  FROM leaderboard l
  WHERE w.week_number = 0
    AND w.account_id = l.account_id
    AND l.account_id IN (
      SELECT (r->>'account_id')::integer FROM jsonb_array_elements(rows) r
    );

  RETURN touched;
END;
$$;
