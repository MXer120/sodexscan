-- Generic state-snapshot cache for diff-based cron alerts.
-- The price cache (cron_price_cache) is typed for numerics.
-- This table stores arbitrary JSON blobs keyed by a string label,
-- so any future cron can persist/compare snapshots without a new table.
--
-- Pattern used by check-listing-alerts:
--   key = 'perps_symbols'    → JSON array of known perps symbol strings
--   key = 'spot_symbols'     → JSON array of known spot symbol strings
--   key = 'perps_incoming'   → JSON array of symbols currently in incoming state

CREATE TABLE IF NOT EXISTS cron_state_cache (
  key        text PRIMARY KEY,
  value      jsonb        NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz  NOT NULL DEFAULT now()
);

-- Server-side only — no RLS needed
ALTER TABLE cron_state_cache DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON cron_state_cache TO service_role;
