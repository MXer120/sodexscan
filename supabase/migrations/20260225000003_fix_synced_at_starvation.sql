-- ============================================================
-- Fix: sync-existing-accounts-lb rotation
--
-- Uses cursor-based sequential scan instead of last_synced_at.
-- Each invocation processes the next 100 accounts by account_id,
-- wrapping around when done. Zero dependency on last_synced_at
-- for rotation. Zero bloat.
-- ============================================================

-- Cursor table (just 1 row)
CREATE TABLE IF NOT EXISTS sync_cursor (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_account_id INTEGER NOT NULL DEFAULT 0
);

INSERT INTO sync_cursor (id, last_account_id)
VALUES (1, 0)
ON CONFLICT DO NOTHING;

-- Allow service_role to read/write
ALTER TABLE sync_cursor ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON sync_cursor
  FOR ALL USING (true) WITH CHECK (true);
