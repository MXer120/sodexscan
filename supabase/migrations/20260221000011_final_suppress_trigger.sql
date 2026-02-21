-- Cleanup debug infrastructure
DROP TABLE IF EXISTS public._update_diff_log;

-- Final trigger: suppress updates where NOTHING changed at all
-- (only last_synced_at differs). Allow rank changes through.
CREATE OR REPLACE FUNCTION suppress_noop_leaderboard_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Only suppress if literally nothing changed except last_synced_at
  IF  NEW.cumulative_pnl     IS NOT DISTINCT FROM OLD.cumulative_pnl
  AND NEW.cumulative_volume   IS NOT DISTINCT FROM OLD.cumulative_volume
  AND NEW.unrealized_pnl      IS NOT DISTINCT FROM OLD.unrealized_pnl
  AND NEW.wallet_address      IS NOT DISTINCT FROM OLD.wallet_address
  AND NEW.pnl_rank            IS NOT DISTINCT FROM OLD.pnl_rank
  AND NEW.volume_rank         IS NOT DISTINCT FROM OLD.volume_rank
  AND NEW.first_trade_ts_ms   IS NOT DISTINCT FROM OLD.first_trade_ts_ms
  AND NEW.is_sodex_owned      IS NOT DISTINCT FROM OLD.is_sodex_owned
  THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;
