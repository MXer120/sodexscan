-- Reduce leaderboard seq scans:
--   useProfile.ts queries leaderboard.wallet_address with eq()
--   wallet API queries leaderboard_smart with ilike (no wildcards)

CREATE INDEX IF NOT EXISTS idx_leaderboard_wallet_address
  ON leaderboard(wallet_address);

CREATE INDEX IF NOT EXISTS idx_leaderboard_wallet_lower
  ON leaderboard(lower(wallet_address));
