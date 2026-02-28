-- Auto-resolve account_id from leaderboard when wallet_address is set on a ticket.
-- Runs inside PG = zero egress. Uses uq_leaderboard_wallet index.

CREATE OR REPLACE FUNCTION auto_resolve_account_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Only resolve when wallet_address changes and account_id isn't manually set
  IF NEW.wallet_address IS NOT NULL
     AND (NEW.account_id IS NULL OR OLD.wallet_address IS DISTINCT FROM NEW.wallet_address)
  THEN
    SELECT l.account_id::text INTO NEW.account_id
    FROM public.leaderboard l
    WHERE lower(l.wallet_address) = lower(NEW.wallet_address)
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_resolve_account_id ON public.tickets;
CREATE TRIGGER trg_auto_resolve_account_id
BEFORE INSERT OR UPDATE OF wallet_address ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION auto_resolve_account_id();

-- Backfill: resolve account_id for all existing tickets with wallet but no account_id
UPDATE public.tickets t
SET account_id = l.account_id::text
FROM public.leaderboard l
WHERE t.wallet_address IS NOT NULL
  AND t.account_id IS NULL
  AND lower(t.wallet_address) = lower(l.wallet_address);
