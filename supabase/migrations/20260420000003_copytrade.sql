-- Copy-trade: leader subscriptions, paper fills, leaderboard view
-- Signal-only + paper simulation — no real order execution, no key custody.

CREATE TABLE IF NOT EXISTS leader_subscriptions (
  id             bigserial PRIMARY KEY,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leader_wallet  text NOT NULL,
  copy_ratio     numeric(5,4) NOT NULL DEFAULT 0.1 CHECK (copy_ratio > 0 AND copy_ratio <= 1),
  max_notional   numeric(18,2),
  symbols        text[] DEFAULT '{}',
  channels       jsonb NOT NULL DEFAULT '{}',  -- {telegram: true, discord: true}
  enabled        boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, leader_wallet)
);

ALTER TABLE leader_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own subscriptions"
  ON leader_subscriptions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Paper copy fills: purely simulated — no real money
CREATE TABLE IF NOT EXISTS paper_copy_fills (
  id             bigserial PRIMARY KEY,
  follower_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leader_wallet  text NOT NULL,
  symbol         text NOT NULL,
  side           text NOT NULL CHECK (side IN ('long', 'short')),
  leader_size    numeric(18,6) NOT NULL,
  follower_size  numeric(18,6) NOT NULL,
  entry_px       numeric(18,6) NOT NULL,
  exit_px        numeric(18,6),
  pnl            numeric(18,2),
  opened_at      timestamptz NOT NULL DEFAULT now(),
  closed_at      timestamptz
);

ALTER TABLE paper_copy_fills ENABLE ROW LEVEL SECURITY;

-- Public read for leaderboard; service-role writes
CREATE POLICY "Public read paper fills"
  ON paper_copy_fills FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_paper_copy_fills_leader ON paper_copy_fills(leader_wallet);
CREATE INDEX IF NOT EXISTS idx_paper_copy_fills_follower ON paper_copy_fills(follower_id);

-- Materialized view: copy-trade leaderboard ranked by avg follower PnL
CREATE MATERIALIZED VIEW IF NOT EXISTS copy_leaderboard AS
SELECT
  leader_wallet,
  COUNT(DISTINCT follower_id)                AS follower_count,
  COUNT(*)                                   AS total_trades,
  ROUND(AVG(pnl)::numeric, 2)               AS avg_pnl_per_trade,
  ROUND(SUM(pnl)::numeric, 2)               AS total_follower_pnl,
  ROUND(
    SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END)::numeric
    / NULLIF(COUNT(*), 0) * 100, 1
  )                                          AS win_rate_pct,
  MIN(opened_at)                             AS first_trade_at,
  MAX(COALESCE(closed_at, opened_at))        AS last_trade_at
FROM paper_copy_fills
WHERE closed_at IS NOT NULL
GROUP BY leader_wallet
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_copy_leaderboard_wallet
  ON copy_leaderboard(leader_wallet);

-- Refresh function called by cron
CREATE OR REPLACE FUNCTION refresh_copy_leaderboard()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY copy_leaderboard;
$$;
