-- ============================================================
-- Fix: leaderboard table bloated
--
-- Two root causes:
--   A) sync-leaderboard cron wrote columns pnl/volume that don't
--      exist in the migration schema (cumulative_pnl/cumulative_volume).
--      Depending on deployed schema, this either silently failed or
--      inserted rows via a non-PK onConflict path.
--   B) Constant UPDATE churn (22k rows every 15 min) creates dead
--      tuples faster than autovacuum can reclaim, especially under
--      the IOwait caused by pg_net scanning net.http_request_queue.
--
-- This migration:
--   1. Dedupes rows (safe no-op if no dupes exist)
--   2. Adds UNIQUE on wallet_address as safety net
--   3. Tunes autovacuum to keep up with 15-min bulk updates
-- ============================================================

-- 1. Dedupe by account_id: keep the physically last row
--    (safe no-op if account_id PK already prevents dupes)
DELETE FROM leaderboard a
USING leaderboard b
WHERE a.account_id = b.account_id
  AND a.ctid < b.ctid;

-- 2. Dedupe by wallet_address: keep highest account_id
DELETE FROM leaderboard a
USING leaderboard b
WHERE a.wallet_address = b.wallet_address
  AND a.account_id < b.account_id;

-- 3. Add unique constraint on wallet_address (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'leaderboard'::regclass
      AND conname = 'uq_leaderboard_wallet'
  ) THEN
    ALTER TABLE leaderboard
      ADD CONSTRAINT uq_leaderboard_wallet UNIQUE (wallet_address);
  END IF;
END $$;

-- 4. Tune autovacuum for high-churn table
--    ~22k rows updated every 15 min = ~2.1M dead tuples/day
--    Default threshold (50 + 20% of rows) is too lazy.
--    These settings trigger vacuum after ~320 dead tuples
--    (100 + 0.01 * 22000 ≈ 320), i.e. after every sync cycle.
ALTER TABLE leaderboard SET (
  autovacuum_vacuum_threshold = 100,
  autovacuum_vacuum_scale_factor = 0.01,
  autovacuum_analyze_threshold = 100,
  autovacuum_analyze_scale_factor = 0.01
);

-- 5. Reclaim space + reset row estimate
ANALYZE leaderboard;

-- ============================================================
-- AFTER DEPLOYING: run this in Supabase SQL Editor to reclaim
-- all dead-tuple disk space immediately (brief table lock):
--
--   VACUUM FULL leaderboard;
-- ============================================================
