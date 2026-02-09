-- Metadata table (singleton) for weekly leaderboard state
CREATE TABLE leaderboard_meta (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  current_week_number INTEGER NOT NULL DEFAULT 1,
  week_start_ts TIMESTAMPTZ NOT NULL DEFAULT '2026-02-09T00:00:00Z',
  pool_size NUMERIC(30, 2) NOT NULL DEFAULT 1000000
);

INSERT INTO leaderboard_meta (id, current_week_number, week_start_ts, pool_size)
VALUES (1, 1, '2026-02-09T00:00:00Z', 1000000);

ALTER TABLE leaderboard_meta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON leaderboard_meta FOR SELECT USING (true);

-- Weekly leaderboard table
-- week_number = 0: live current week (continuously updated)
-- week_number = 1, 2, 3...: frozen weekly snapshots
CREATE TABLE leaderboard_weekly (
  week_number INTEGER NOT NULL,
  account_id INTEGER NOT NULL,
  wallet_address TEXT NOT NULL,
  cumulative_pnl NUMERIC(30, 18) DEFAULT 0,
  cumulative_volume NUMERIC(30, 18) DEFAULT 0,
  unrealized_pnl NUMERIC(30, 18) DEFAULT 0,
  first_trade_ts_ms BIGINT,
  pnl_rank INTEGER,
  volume_rank INTEGER,
  is_sodex_owned BOOLEAN,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (week_number, account_id)
);

-- Indexes for fast sorting within a week
CREATE INDEX idx_weekly_week ON leaderboard_weekly(week_number);
CREATE INDEX idx_weekly_pnl_rank ON leaderboard_weekly(week_number, pnl_rank) WHERE pnl_rank IS NOT NULL;
CREATE INDEX idx_weekly_vol_rank ON leaderboard_weekly(week_number, volume_rank) WHERE volume_rank IS NOT NULL;
CREATE INDEX idx_weekly_wallet ON leaderboard_weekly(week_number, wallet_address);

ALTER TABLE leaderboard_weekly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON leaderboard_weekly FOR SELECT USING (true);
