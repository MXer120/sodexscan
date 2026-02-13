-- ============================================================
-- 1. Change freeze schedule from Monday to Saturday 00:00 UTC
-- ============================================================
SELECT cron.unschedule('freeze-weekly-leaderboard');
SELECT cron.schedule(
  'freeze-weekly-leaderboard',
  '0 0 * * 6',
  'SELECT freeze_current_week()'
);

-- ============================================================
-- 2. Create spot_volume_snapshots table
-- Stores weekly spot volume snapshots (taken at freeze time)
-- ============================================================
CREATE TABLE IF NOT EXISTS spot_volume_snapshots (
  week_number INTEGER NOT NULL,
  wallet_address TEXT NOT NULL,
  volume NUMERIC(30, 6) NOT NULL DEFAULT 0,
  user_id TEXT,
  last_ts TEXT,
  snapshot_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (week_number, wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_spot_snap_week ON spot_volume_snapshots(week_number);

ALTER TABLE spot_volume_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON spot_volume_snapshots FOR SELECT USING (true);

-- ============================================================
-- 3. RPC to get spot snapshot for a given week
-- Returns JSON object keyed by wallet_address
-- ============================================================
CREATE OR REPLACE FUNCTION get_spot_snapshot(p_week INT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_object_agg(
    wallet_address,
    json_build_object('vol', volume, 'userId', user_id, 'last_ts', last_ts)
  ) INTO result
  FROM spot_volume_snapshots
  WHERE week_number = p_week;

  RETURN COALESCE(result, '{}'::JSON);
END;
$$;

GRANT EXECUTE ON FUNCTION get_spot_snapshot TO anon, authenticated;

-- ============================================================
-- 4. Add total_user_counts column if not exists
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leaderboard_meta' AND column_name = 'total_user_counts'
  ) THEN
    ALTER TABLE leaderboard_meta ADD COLUMN total_user_counts JSONB DEFAULT '{}';
  END IF;
END $$;
