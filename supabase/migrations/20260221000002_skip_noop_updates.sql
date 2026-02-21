-- ============================================================
-- Fix: leaderboard dead tuple bloat from no-op updates
--
-- Root cause: every upsert/update creates dead tuples even when
-- values are identical. With ~22k rows updated every sync cycle,
-- autovacuum can't keep up → 300MB bloat in 24h.
--
-- Fix: add WHERE clauses to skip rows where nothing changed.
-- ============================================================

-- 1. Batch upsert RPC that skips unchanged rows
--    Accepts JSON array, only touches rows with actual changes.
CREATE OR REPLACE FUNCTION upsert_leaderboard_batch(rows jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  touched integer;
BEGIN
  -- Insert new rows or update ONLY if values differ
  WITH input AS (
    SELECT
      (r->>'account_id')::integer AS account_id,
      r->>'wallet_address' AS wallet_address,
      (r->>'cumulative_pnl')::numeric(30,18) AS cumulative_pnl,
      (r->>'cumulative_volume')::numeric(30,18) AS cumulative_volume
    FROM jsonb_array_elements(rows) AS r
  )
  INSERT INTO leaderboard (account_id, wallet_address, cumulative_pnl, cumulative_volume, last_synced_at)
  SELECT account_id, wallet_address, cumulative_pnl, cumulative_volume, now()
  FROM input
  ON CONFLICT (account_id) DO UPDATE SET
    wallet_address     = EXCLUDED.wallet_address,
    cumulative_pnl     = EXCLUDED.cumulative_pnl,
    cumulative_volume  = EXCLUDED.cumulative_volume,
    last_synced_at     = now()
  WHERE
    leaderboard.cumulative_pnl    IS DISTINCT FROM EXCLUDED.cumulative_pnl
    OR leaderboard.cumulative_volume IS DISTINCT FROM EXCLUDED.cumulative_volume
    OR leaderboard.wallet_address    IS DISTINCT FROM EXCLUDED.wallet_address;

  GET DIAGNOSTICS touched = ROW_COUNT;
  RETURN touched;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_leaderboard_batch(jsonb) TO service_role;

-- 2. Fix update_leaderboard_ranks() to skip unchanged ranks
CREATE OR REPLACE FUNCTION update_leaderboard_ranks()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update PnL ranks, skip rows where rank unchanged
  WITH ranked_pnl AS (
    SELECT
      account_id,
      ROW_NUMBER() OVER (ORDER BY cumulative_pnl DESC) as rank
    FROM leaderboard
  )
  UPDATE leaderboard
  SET pnl_rank = ranked_pnl.rank
  FROM ranked_pnl
  WHERE leaderboard.account_id = ranked_pnl.account_id
    AND leaderboard.pnl_rank IS DISTINCT FROM ranked_pnl.rank;

  -- Update volume ranks, skip rows where rank unchanged
  WITH ranked_volume AS (
    SELECT
      account_id,
      ROW_NUMBER() OVER (ORDER BY cumulative_volume DESC) as rank
    FROM leaderboard
  )
  UPDATE leaderboard
  SET volume_rank = ranked_volume.rank
  FROM ranked_volume
  WHERE leaderboard.account_id = ranked_volume.account_id
    AND leaderboard.volume_rank IS DISTINCT FROM ranked_volume.rank;
END;
$$;

-- 3. Fix sync_current_week() to skip unchanged rows
CREATE OR REPLACE FUNCTION sync_current_week()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  synced INT;
BEGIN
  -- Upsert all users with volume > 0, skip unchanged rows
  INSERT INTO leaderboard_weekly (
    week_number, account_id, wallet_address,
    cumulative_pnl, cumulative_volume, unrealized_pnl,
    first_trade_ts_ms, is_sodex_owned, last_synced_at
  )
  SELECT
    0, account_id, wallet_address,
    cumulative_pnl, cumulative_volume, unrealized_pnl,
    first_trade_ts_ms, is_sodex_owned, NOW()
  FROM leaderboard
  WHERE cumulative_volume > 0
  ON CONFLICT (week_number, account_id)
  DO UPDATE SET
    wallet_address     = EXCLUDED.wallet_address,
    cumulative_pnl     = EXCLUDED.cumulative_pnl,
    cumulative_volume  = EXCLUDED.cumulative_volume,
    unrealized_pnl     = EXCLUDED.unrealized_pnl,
    first_trade_ts_ms  = EXCLUDED.first_trade_ts_ms,
    is_sodex_owned     = EXCLUDED.is_sodex_owned,
    last_synced_at     = NOW()
  WHERE
    leaderboard_weekly.cumulative_pnl     IS DISTINCT FROM EXCLUDED.cumulative_pnl
    OR leaderboard_weekly.cumulative_volume  IS DISTINCT FROM EXCLUDED.cumulative_volume
    OR leaderboard_weekly.unrealized_pnl    IS DISTINCT FROM EXCLUDED.unrealized_pnl
    OR leaderboard_weekly.wallet_address    IS DISTINCT FROM EXCLUDED.wallet_address
    OR leaderboard_weekly.first_trade_ts_ms IS DISTINCT FROM EXCLUDED.first_trade_ts_ms
    OR leaderboard_weekly.is_sodex_owned    IS DISTINCT FROM EXCLUDED.is_sodex_owned;

  GET DIAGNOSTICS synced = ROW_COUNT;

  -- Recompute PnL ranks for week 0, skip unchanged
  WITH ranked_pnl AS (
    SELECT account_id, ROW_NUMBER() OVER (ORDER BY cumulative_pnl DESC) AS r
    FROM leaderboard_weekly WHERE week_number = 0
  )
  UPDATE leaderboard_weekly w
  SET pnl_rank = ranked_pnl.r
  FROM ranked_pnl
  WHERE w.account_id = ranked_pnl.account_id
    AND w.week_number = 0
    AND w.pnl_rank IS DISTINCT FROM ranked_pnl.r;

  -- Recompute volume ranks for week 0, skip unchanged
  WITH ranked_vol AS (
    SELECT account_id, ROW_NUMBER() OVER (ORDER BY cumulative_volume DESC) AS r
    FROM leaderboard_weekly WHERE week_number = 0
  )
  UPDATE leaderboard_weekly w
  SET volume_rank = ranked_vol.r
  FROM ranked_vol
  WHERE w.account_id = ranked_vol.account_id
    AND w.week_number = 0
    AND w.volume_rank IS DISTINCT FROM ranked_vol.r;

  RETURN json_build_object('synced', synced);
END;
$$;
