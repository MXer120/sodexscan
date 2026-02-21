-- Temporary debug: log which columns differ in updates
CREATE TABLE IF NOT EXISTS public._update_diff_log (
  id serial PRIMARY KEY,
  account_id integer,
  pnl_diff boolean,
  vol_diff boolean,
  upnl_diff boolean,
  wallet_diff boolean,
  pnlrank_diff boolean,
  volrank_diff boolean,
  trade_diff boolean,
  sodex_diff boolean,
  synced_diff boolean,
  old_pnl numeric,
  new_pnl numeric,
  old_vol numeric,
  new_vol numeric,
  ts timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION suppress_noop_leaderboard_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Log first 5 per minute for debugging
  IF (SELECT count(*) FROM public._update_diff_log WHERE ts > now() - interval '1 minute') < 5 THEN
    INSERT INTO public._update_diff_log (
      account_id,
      pnl_diff, vol_diff, upnl_diff, wallet_diff,
      pnlrank_diff, volrank_diff, trade_diff, sodex_diff, synced_diff,
      old_pnl, new_pnl, old_vol, new_vol
    ) VALUES (
      NEW.account_id,
      NEW.cumulative_pnl IS DISTINCT FROM OLD.cumulative_pnl,
      NEW.cumulative_volume IS DISTINCT FROM OLD.cumulative_volume,
      NEW.unrealized_pnl IS DISTINCT FROM OLD.unrealized_pnl,
      NEW.wallet_address IS DISTINCT FROM OLD.wallet_address,
      NEW.pnl_rank IS DISTINCT FROM OLD.pnl_rank,
      NEW.volume_rank IS DISTINCT FROM OLD.volume_rank,
      NEW.first_trade_ts_ms IS DISTINCT FROM OLD.first_trade_ts_ms,
      NEW.is_sodex_owned IS DISTINCT FROM OLD.is_sodex_owned,
      NEW.last_synced_at IS DISTINCT FROM OLD.last_synced_at,
      OLD.cumulative_pnl, NEW.cumulative_pnl,
      OLD.cumulative_volume, NEW.cumulative_volume
    );
  END IF;

  -- Suppress if all data columns unchanged
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
