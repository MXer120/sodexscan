-- ============================================================
-- Unified sync: edge fn now fetches BOTH futures + sodex per account
-- Fix cascade: INSERT ON CONFLICT instead of bare UPDATE (missed new accounts)
-- Drop stale sodex cron (now handled by sync-existing-accounts-lb)
-- Drop dead leaderboard_sync_queue table
-- ============================================================

-- 1. Fix upsert_sodex_batch cascade: INSERT ON CONFLICT (upsert) into week 0
--    Previously used UPDATE which skipped accounts not yet in week 0
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

  -- Cascade to week 0: INSERT ON CONFLICT (upsert) — handles new accounts too
  INSERT INTO leaderboard_weekly (
    week_number, account_id, wallet_address,
    sodex_total_volume, sodex_pnl, last_synced_at
  )
  SELECT
    0, l.account_id, l.wallet_address,
    l.sodex_total_volume, l.sodex_pnl, now()
  FROM leaderboard l
  WHERE l.account_id IN (
    SELECT (r->>'account_id')::integer FROM jsonb_array_elements(rows) r
  )
  ON CONFLICT (week_number, account_id) DO UPDATE SET
    sodex_total_volume = EXCLUDED.sodex_total_volume,
    sodex_pnl          = EXCLUDED.sodex_pnl,
    last_synced_at     = EXCLUDED.last_synced_at
  WHERE
    leaderboard_weekly.sodex_total_volume IS DISTINCT FROM EXCLUDED.sodex_total_volume
    OR leaderboard_weekly.sodex_pnl IS DISTINCT FROM EXCLUDED.sodex_pnl;

  RETURN touched;
END;
$$;

-- 2. Fix upsert_leaderboard_batch cascade: INSERT ON CONFLICT into week 0
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

  -- Cascade to week 0: INSERT ON CONFLICT (upsert) — handles new accounts too
  INSERT INTO leaderboard_weekly (
    week_number, account_id, wallet_address,
    cumulative_pnl, cumulative_volume, unrealized_pnl, last_synced_at
  )
  SELECT
    0, l.account_id, l.wallet_address,
    l.cumulative_pnl, l.cumulative_volume, l.unrealized_pnl, now()
  FROM leaderboard l
  WHERE l.account_id IN (
    SELECT (r->>'account_id')::integer FROM jsonb_array_elements(rows) r
  )
  ON CONFLICT (week_number, account_id) DO UPDATE SET
    cumulative_pnl    = EXCLUDED.cumulative_pnl,
    cumulative_volume = EXCLUDED.cumulative_volume,
    unrealized_pnl    = EXCLUDED.unrealized_pnl,
    last_synced_at    = EXCLUDED.last_synced_at
  WHERE
    leaderboard_weekly.cumulative_pnl     IS DISTINCT FROM EXCLUDED.cumulative_pnl
    OR leaderboard_weekly.cumulative_volume IS DISTINCT FROM EXCLUDED.cumulative_volume
    OR leaderboard_weekly.unrealized_pnl    IS DISTINCT FROM EXCLUDED.unrealized_pnl;

  RETURN touched;
END;
$$;

-- 3. Disable old sodex paginated cron (now handled by unified edge fn)
SELECT cron.unschedule('sync-sodex-leaderboard');

-- 4. Drop dead sync queue table + its RPC
DROP TABLE IF EXISTS public.leaderboard_sync_queue;
DROP FUNCTION IF EXISTS public.bump_sync_queue(integer[]);
