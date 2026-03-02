CREATE TABLE IF NOT EXISTS page_config (
  path TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  visible BOOLEAN DEFAULT true,
  permission TEXT DEFAULT 'auth',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE page_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "page_config_read" ON page_config FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "page_config_write" ON page_config FOR ALL TO authenticated USING (is_mod()) WITH CHECK (is_mod());

INSERT INTO page_config (path, label, visible, permission) VALUES
  ('/tracker', 'Scan', true, 'anon'),
  ('/mainnet', 'Leaderboard', true, 'auth'),
  ('/sopoints', 'SoPoints', true, 'auth'),
  ('/social', 'Social', true, 'auth'),
  ('/social/stats', 'Social Stats', true, 'auth'),
  ('/referral', 'Referral', true, 'auth'),
  ('/watchlist', 'Watchlist', true, 'auth'),
  ('/aggregator', 'Aggregator', true, 'auth'),
  ('/tickets', 'Tickets', true, 'mod'),
  ('/platform', 'Platform', true, 'anon'),
  ('/incoming', 'Incoming', true, 'auth'),
  ('/reverse-search', 'Reverse Search', true, 'auth')
ON CONFLICT (path) DO NOTHING;

CREATE TABLE IF NOT EXISTS sopoints_week_config (
  week_num INTEGER PRIMARY KEY,
  include_spot BOOLEAN DEFAULT true,
  include_futures BOOLEAN DEFAULT true,
  spot_multiplier NUMERIC(4,2) DEFAULT 2.0,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sopoints_week_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sopoints_week_config_read" ON sopoints_week_config FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "sopoints_week_config_write" ON sopoints_week_config FOR ALL TO authenticated USING (is_mod()) WITH CHECK (is_mod());

CREATE TABLE IF NOT EXISTS cms_content (
  key TEXT PRIMARY KEY,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cms_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cms_content_read" ON cms_content FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "cms_content_write" ON cms_content FOR ALL TO authenticated USING (is_mod()) WITH CHECK (is_mod());
