-- Wallet watchlist: users track wallets they want to monitor / copy
CREATE TABLE IF NOT EXISTS watchlist_wallets (
  user_id        uuid    REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address text    NOT NULL,
  added_at       timestamptz DEFAULT now(),
  tag            text,            -- optional label: "whale", "btc-only", etc.
  notes          text,
  PRIMARY KEY (user_id, wallet_address)
);

ALTER TABLE watchlist_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own watchlist"
  ON watchlist_wallets
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_wallet ON watchlist_wallets(wallet_address);

-- Add active column to leader_subscriptions (for pausing/resuming copy trades)
ALTER TABLE leader_subscriptions
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- Add updated_at
ALTER TABLE leader_subscriptions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
