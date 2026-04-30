-- Copy-trade v2: inverse mode, stop-loss, fixed-USD mode, max positions
-- All columns are optional / backward-compatible.

ALTER TABLE leader_subscriptions
  ADD COLUMN IF NOT EXISTS inverse        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stop_loss_pct  numeric(5,2),
  ADD COLUMN IF NOT EXISTS mode           text NOT NULL DEFAULT 'ratio' CHECK (mode IN ('ratio','fixed')),
  ADD COLUMN IF NOT EXISTS fixed_usd      numeric(12,2),
  ADD COLUMN IF NOT EXISTS max_positions  integer;
