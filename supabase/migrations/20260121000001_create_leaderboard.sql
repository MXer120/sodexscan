-- Drop table if exists to start fresh
DROP TABLE IF EXISTS leaderboard;

-- Leaderboard table
CREATE TABLE leaderboard (
  account_id INTEGER PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  cumulative_pnl NUMERIC(30, 18) DEFAULT 0,
  cumulative_volume NUMERIC(30, 18) DEFAULT 0,
  unrealized_pnl NUMERIC(30, 18) DEFAULT 0,
  first_trade_ts_ms BIGINT,
  pnl_rank INTEGER,
  volume_rank INTEGER,
  last_synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast sorting
CREATE INDEX idx_leaderboard_pnl_rank ON leaderboard(pnl_rank) WHERE pnl_rank IS NOT NULL;
CREATE INDEX idx_leaderboard_volume_rank ON leaderboard(volume_rank) WHERE volume_rank IS NOT NULL;
CREATE INDEX idx_leaderboard_pnl_desc ON leaderboard(cumulative_pnl DESC);
CREATE INDEX idx_leaderboard_volume_desc ON leaderboard(cumulative_volume DESC);

-- Enable RLS
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read" ON leaderboard FOR SELECT USING (true);
