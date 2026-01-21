-- Account Mapping Table
CREATE TABLE account_mapping (
  account_id TEXT PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_wallet_address ON account_mapping(wallet_address);

-- Sync State Table (track last fetched IDs)
CREATE TABLE sync_state (
  id TEXT PRIMARY KEY,
  last_account_id TEXT,
  last_synced_at TIMESTAMP DEFAULT NOW()
);

-- Insert initial sync state
INSERT INTO sync_state (id, last_account_id) VALUES ('account_mapping', '0');

-- Leaderboard Table
CREATE TABLE leaderboard (
  wallet_address TEXT PRIMARY KEY,
  account_id TEXT,
  pnl NUMERIC DEFAULT 0,
  volume NUMERIC DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pnl ON leaderboard(pnl DESC);
CREATE INDEX idx_volume ON leaderboard(volume DESC);

-- Position History Table
CREATE TABLE position_history (
  id SERIAL PRIMARY KEY,
  account_id TEXT NOT NULL,
  symbol TEXT,
  side TEXT,
  entry_price NUMERIC,
  exit_price NUMERIC,
  size NUMERIC,
  pnl NUMERIC,
  opened_at TIMESTAMP,
  closed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_account_history ON position_history(account_id, closed_at DESC);
CREATE INDEX idx_closed_at ON position_history(closed_at DESC);

-- Open Positions Table
CREATE TABLE open_positions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  symbol TEXT,
  side TEXT,
  entry_price NUMERIC,
  current_price NUMERIC,
  size NUMERIC,
  unrealized_pnl NUMERIC,
  leverage NUMERIC,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_account_positions ON open_positions(account_id);

-- Withdrawals Table
CREATE TABLE withdrawals (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  amount NUMERIC,
  asset TEXT,
  status TEXT,
  transaction_hash TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_account_withdrawals ON withdrawals(account_id, created_at DESC);

-- PnL History Table
CREATE TABLE pnl_history (
  id SERIAL PRIMARY KEY,
  account_id TEXT NOT NULL,
  date DATE NOT NULL,
  daily_pnl NUMERIC DEFAULT 0,
  cumulative_pnl NUMERIC DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(account_id, date)
);

CREATE INDEX idx_account_pnl ON pnl_history(account_id, date DESC);

-- Spot Balances Table
CREATE TABLE spot_balances (
  account_id TEXT NOT NULL,
  asset TEXT NOT NULL,
  balance NUMERIC DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY(account_id, asset)
);

CREATE INDEX idx_account_balances ON spot_balances(account_id);

-- Platform Stats Cache (for dashboard)
CREATE TABLE platform_stats_cache (
  stat_key TEXT PRIMARY KEY,
  stat_value JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_account_mapping_updated_at BEFORE UPDATE ON account_mapping
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leaderboard_updated_at BEFORE UPDATE ON leaderboard
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
