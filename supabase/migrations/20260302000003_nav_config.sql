CREATE TABLE IF NOT EXISTS nav_config (
  path TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  tag TEXT DEFAULT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  in_more BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE nav_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nav_config_read" ON nav_config FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "nav_config_write" ON nav_config FOR ALL TO authenticated USING (is_mod()) WITH CHECK (is_mod());

INSERT INTO nav_config (path, label, enabled, tag, sort_order, in_more) VALUES
  ('/tracker',       'Scan',           true, NULL,  10,  false),
  ('/mainnet',       'Leaderboard',    true, NULL,  20,  false),
  ('/sopoints',      'SoPoints',       true, 'V1',  30,  false),
  ('/social',        'Social',         true, NULL,  40,  false),
  ('/watchlist',     'Watchlist',      true, NULL,  50,  false),
  ('/aggregator',    'Aggregator',     true, 'V1',  60,  false),
  ('/tickets',       'Tickets',        true, NULL,  70,  false),
  ('/admin',         'Admin',          true, NULL,  80,  false),
  ('/platform',      'Platform',       true, NULL,  90,  true),
  ('/incoming',      'Incoming',       true, NULL,  100, true),
  ('/reverse-search','Reverse Search', true, NULL,  110, true)
ON CONFLICT (path) DO NOTHING;
