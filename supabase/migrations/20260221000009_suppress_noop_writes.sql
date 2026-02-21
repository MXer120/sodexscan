-- ============================================================
-- Fix: external service doing raw .upsert() ~83 writes/min
-- bypassing our IS DISTINCT FROM RPC.
--
-- Solution: BEFORE UPDATE trigger that suppresses no-op updates
-- at the Postgres level. If no data columns changed, return NULL
-- to cancel the UPDATE entirely (no dead tuple created).
-- ============================================================

-- Remove audit trigger first
DROP TRIGGER IF EXISTS _trg_log_leaderboard ON leaderboard;
DROP FUNCTION IF EXISTS _log_leaderboard_write();
DROP TABLE IF EXISTS public._leaderboard_write_log;

-- Suppress no-op updates at the table level
CREATE OR REPLACE FUNCTION suppress_noop_leaderboard_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- If nothing meaningful changed, cancel the UPDATE (return NULL = skip row)
  IF  NEW.cumulative_pnl     IS NOT DISTINCT FROM OLD.cumulative_pnl
  AND NEW.cumulative_volume   IS NOT DISTINCT FROM OLD.cumulative_volume
  AND NEW.unrealized_pnl      IS NOT DISTINCT FROM OLD.unrealized_pnl
  AND NEW.wallet_address      IS NOT DISTINCT FROM OLD.wallet_address
  AND NEW.pnl_rank            IS NOT DISTINCT FROM OLD.pnl_rank
  AND NEW.volume_rank         IS NOT DISTINCT FROM OLD.volume_rank
  AND NEW.first_trade_ts_ms   IS NOT DISTINCT FROM OLD.first_trade_ts_ms
  AND NEW.is_sodex_owned      IS NOT DISTINCT FROM OLD.is_sodex_owned
  THEN
    RETURN NULL;  -- cancel update, no dead tuple
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_suppress_noop ON leaderboard;
CREATE TRIGGER trg_suppress_noop
  BEFORE UPDATE ON leaderboard
  FOR EACH ROW EXECUTE FUNCTION suppress_noop_leaderboard_update();
