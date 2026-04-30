-- Content Planner: add 'team' role + all content planner tables
-- ============================================================

-- 1. Expand role constraint to include 'team'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'mod', 'owner', 'team'));

-- 2. Helper: is_team_or_mod() — team, mod, owner can access content planner
CREATE OR REPLACE FUNCTION public.is_team_or_mod()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('team', 'mod', 'owner')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 3. Content Ideas — the master list of content types/ideas
CREATE TABLE IF NOT EXISTS content_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  subcategory TEXT,
  description TEXT,
  format TEXT DEFAULT 'post',
  frequency TEXT,
  frequency_detail TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  tags TEXT[] DEFAULT '{}',
  example_caption TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE content_ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_ideas_read" ON content_ideas FOR SELECT TO authenticated USING (is_team_or_mod());
CREATE POLICY "content_ideas_write" ON content_ideas FOR ALL TO authenticated USING (is_team_or_mod()) WITH CHECK (is_team_or_mod());

-- 4. Content Templates — reusable caption/post templates
CREATE TABLE IF NOT EXISTS content_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES content_ideas(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  body TEXT NOT NULL,
  format TEXT DEFAULT 'short',
  hashtags TEXT[] DEFAULT '{}',
  cta TEXT,
  placeholders JSONB DEFAULT '[]',
  is_favorite BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_templates_read" ON content_templates FOR SELECT TO authenticated USING (is_team_or_mod());
CREATE POLICY "content_templates_write" ON content_templates FOR ALL TO authenticated USING (is_team_or_mod()) WITH CHECK (is_team_or_mod());

-- 5. Content Calendar — scheduled posts
CREATE TABLE IF NOT EXISTS content_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES content_ideas(id) ON DELETE SET NULL,
  template_id UUID REFERENCES content_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT,
  media_urls TEXT[] DEFAULT '{}',
  scheduled_at TIMESTAMPTZ NOT NULL,
  publish_status TEXT DEFAULT 'draft' CHECK (publish_status IN ('draft', 'scheduled', 'published', 'failed', 'archived')),
  platform TEXT DEFAULT 'x' CHECK (platform IN ('x', 'instagram', 'tiktok', 'all')),
  recurrence TEXT,
  recurrence_rule JSONB,
  category TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  engagement JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_calendar_scheduled ON content_calendar(scheduled_at);
CREATE INDEX idx_calendar_status ON content_calendar(publish_status);

ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_calendar_read" ON content_calendar FOR SELECT TO authenticated USING (is_team_or_mod());
CREATE POLICY "content_calendar_write" ON content_calendar FOR ALL TO authenticated USING (is_team_or_mod()) WITH CHECK (is_team_or_mod());

-- 6. Content Resources — uploaded assets (images, videos, etc)
CREATE TABLE IF NOT EXISTS content_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'image',
  file_size INTEGER,
  mime_type TEXT,
  category TEXT DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  width INTEGER,
  height INTEGER,
  duration REAL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE content_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_resources_read" ON content_resources FOR SELECT TO authenticated USING (is_team_or_mod());
CREATE POLICY "content_resources_write" ON content_resources FOR ALL TO authenticated USING (is_team_or_mod()) WITH CHECK (is_team_or_mod());

-- 7. Content Comments — team collaboration on ideas/posts
CREATE TABLE IF NOT EXISTS content_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('idea', 'calendar', 'template', 'resource')),
  target_id UUID NOT NULL,
  body TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_comments_target ON content_comments(target_type, target_id);

ALTER TABLE content_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_comments_read" ON content_comments FOR SELECT TO authenticated USING (is_team_or_mod());
CREATE POLICY "content_comments_write" ON content_comments FOR ALL TO authenticated USING (is_team_or_mod()) WITH CHECK (is_team_or_mod());

-- 8. Content Activity Log — audit trail
CREATE TABLE IF NOT EXISTS content_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB DEFAULT '{}',
  actor_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_created ON content_activity_log(created_at DESC);

ALTER TABLE content_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_activity_read" ON content_activity_log FOR SELECT TO authenticated USING (is_team_or_mod());
CREATE POLICY "content_activity_write" ON content_activity_log FOR INSERT TO authenticated WITH CHECK (is_team_or_mod());

-- 9. Add content-planner to page_config + nav_config
INSERT INTO page_config (path, label, visible, permission)
VALUES ('/content-planner', 'Content Planner', true, 'mod')
ON CONFLICT (path) DO NOTHING;

INSERT INTO nav_config (path, label, enabled, tag, sort_order, in_more)
VALUES ('/content-planner', 'Content', true, 'New', 72, false)
ON CONFLICT (path) DO NOTHING;

-- 10. Seed content ideas with all 50+ content types from the strategy
INSERT INTO content_ideas (title, category, subcategory, format, frequency, frequency_detail, description, tags) VALUES
-- Trading & P&L
('P&L Chart of Day/Week', 'trading', 'pnl', 'chart_reel', '3-5x/week', 'Mon-Fri', 'Daily or weekly P&L chart showcasing top performer', ARRAY['trading', 'pnl', 'chart']),
('Leaderboard Spotlight', 'trading', 'leaderboard', 'carousel', '2-3x/week', 'Mon/Wed/Fri', 'Highlight top traders from leaderboard', ARRAY['trading', 'leaderboard']),
('Streak Alert', 'trading', 'streak', 'graphic_reel', 'daily', 'As milestones hit', 'Celebrate trading streak milestones', ARRAY['trading', 'streak', 'celebration']),
('Volume Tuesday', 'trading', 'volume', 'infographic', 'weekly', 'Tuesday', 'Weekly volume analysis and insights', ARRAY['trading', 'volume', 'weekly']),
('Unexpected Move Alert', 'trading', 'alert', 'reel', 'as_needed', 'As it happens', 'Alert for unexpected market moves', ARRAY['trading', 'alert', 'breaking']),

-- Data Updates & Market Intelligence
('Daily Dose of ETFs', 'data', 'etf', 'chart_reel', 'daily_5x', 'Mon-Fri', 'Alpha Dojo style ETF data, minimal interpretation', ARRAY['data', 'etf', 'daily']),
('Bitcoin Updates', 'data', 'bitcoin', 'static_chart', 'multiple_daily', 'As price moves', 'Pure data reading, key levels break', ARRAY['data', 'bitcoin', 'price']),
('Daily Dose of Tokens', 'data', 'tokens', 'carousel', 'daily', 'Daily', 'SOL, AVAX, MATIC, ETH 24h updates', ARRAY['data', 'tokens', 'daily']),
('Macro Index Updates', 'data', 'macro', 'snapshot', '2-3x/week', 'Mon/Wed/Fri', 'S&P 500, Fed rates, DXY, VIX impact', ARRAY['data', 'macro', 'index']),
('Macro Drops', 'data', 'macro', 'reel_carousel', '3-5x/week', 'As published', 'Discord macro analysis shared with annotation', ARRAY['data', 'macro', 'analysis']),
('Funding Rate Alert', 'data', 'funding', 'graphic', '2-3x/week', 'Mon/Wed/Fri', 'Rates spiked, best rates, opportunities', ARRAY['data', 'funding', 'rates']),
('Liquidation Watch', 'data', 'liquidation', 'carousel', 'daily', 'Daily', '24h liquidations, longs vs shorts analysis', ARRAY['data', 'liquidation', 'daily']),
('Open Interest Trends', 'data', 'oi', 'reel', '2-3x/week', 'Tue/Thu/Sat', 'OI at ATH, increasing/decreasing signals', ARRAY['data', 'open_interest']),
('This Week in Numbers', 'data', 'weekly_recap', 'infographic', 'weekly', 'Sunday', 'Volume, movers, pairs, new traders', ARRAY['data', 'weekly', 'recap']),
('Volatility Rankings', 'data', 'volatility', 'carousel_reel', 'weekly', 'Wednesday', 'Most/least volatile, breakout opportunities', ARRAY['data', 'volatility', 'ranking']),

-- Educational Content
('Volume Basics 101', 'education', 'volume', 'carousel', 'monthly', 'First Monday', '6-8 slide carousel on volume basics', ARRAY['education', 'volume', 'beginner']),
('VWAP Explained', 'education', 'vwap', 'carousel_reel', 'bi-weekly', 'Every other Thursday', 'VWAP indicator explained', ARRAY['education', 'vwap', 'indicator']),
('TWAP Explained', 'education', 'twap', 'carousel', 'monthly', 'Third week', '4-slide carousel on TWAP', ARRAY['education', 'twap', 'indicator']),
('Order Types on Sodex', 'education', 'orders', 'carousel_screenshot', 'bi-weekly', 'Rotating', 'Market, Limit, Stop-Loss, Take-Profit, etc.', ARRAY['education', 'orders', 'platform']),
('Volume Profile Deep Dive', 'education', 'volume_profile', 'carousel', 'monthly', 'Second week', '8-slide deep dive', ARRAY['education', 'volume', 'advanced']),
('Bid-Ask Spread', 'education', 'spread', 'carousel', 'monthly', 'As scheduled', 'Understanding bid-ask spread', ARRAY['education', 'spread', 'basics']),
('Liquidity & Slippage', 'education', 'liquidity', 'carousel', 'monthly', 'As scheduled', 'Liquidity and slippage explained', ARRAY['education', 'liquidity']),
('Order Book Reading 101', 'education', 'orderbook', 'carousel', 'monthly', 'As scheduled', '6-slide order book guide', ARRAY['education', 'orderbook', 'beginner']),
('Candle Patterns 101', 'education', 'candles', 'carousel', 'weekly', 'Rotating patterns', '3-4 slides per pattern', ARRAY['education', 'candles', 'patterns']),
('Moving Averages', 'education', 'ma', 'carousel', 'monthly', 'As scheduled', 'MA types and usage', ARRAY['education', 'moving_averages']),
('RSI Momentum', 'education', 'rsi', 'carousel', 'monthly', 'As scheduled', 'RSI indicator deep dive', ARRAY['education', 'rsi', 'momentum']),
('MACD Explained', 'education', 'macd', 'carousel', 'monthly', 'As scheduled', 'MACD indicator explained', ARRAY['education', 'macd']),
('Support & Resistance', 'education', 'sr', 'carousel', 'monthly', 'As scheduled', 'S&R with examples', ARRAY['education', 'support', 'resistance']),
('Trend Lines & Channels', 'education', 'trends', 'carousel', 'monthly', 'As scheduled', 'Drawing and using trend lines', ARRAY['education', 'trends', 'channels']),
('Leverage & Margin', 'education', 'leverage', 'carousel', 'quarterly', 'Start of quarter', 'Leverage and margin explained', ARRAY['education', 'leverage', 'margin']),
('Position Sizing 101', 'education', 'position', 'carousel', 'monthly', 'As scheduled', 'Position sizing fundamentals', ARRAY['education', 'position', 'risk']),
('Risk/Reward Ratio', 'education', 'risk_reward', 'carousel', 'monthly', 'As scheduled', 'R:R ratio explained', ARRAY['education', 'risk', 'reward']),
('Funding Rates Impact', 'education', 'funding_edu', 'carousel', 'bi-weekly', 'Every other week', 'How funding rates affect trading', ARRAY['education', 'funding', 'rates']),
('Liquidation Cascade', 'education', 'liquidation_edu', 'carousel_reel', 'monthly', 'As scheduled', 'Understanding liquidation cascades', ARRAY['education', 'liquidation']),
('1-Minute Sodex Lessons', 'education', 'quick_lessons', 'reel', '3-5x/week', 'Mon-Fri', 'Quick screen recording lessons', ARRAY['education', 'quick', 'video']),
('How to Trade Futures', 'education', 'futures', 'carousel', 'bi-weekly', 'Every other week', 'Futures trading guide', ARRAY['education', 'futures']),
('SoPoints Explained', 'education', 'sopoints', 'carousel', 'monthly', 'As scheduled', 'SoPoints system overview', ARRAY['education', 'sopoints', 'platform']),
('Staking Earnings', 'education', 'staking', 'carousel', 'monthly', 'As scheduled', 'Staking earnings guide', ARRAY['education', 'staking']),
('Fee Tier Breakdown', 'education', 'fees', 'infographic', 'quarterly', 'Start of quarter', 'Fee structure explained', ARRAY['education', 'fees', 'platform']),
('How Sodex Works', 'education', 'platform', 'carousel', 'quarterly', 'Start of quarter', '12-15 slide deep dive or multi-part reel', ARRAY['education', 'platform', 'overview']),
('Sodex vs Competitors', 'education', 'comparison', 'carousel', 'monthly', 'As scheduled', 'Feature comparison', ARRAY['education', 'comparison']),
('Trading Truth (Myth vs Reality)', 'education', 'myths', 'carousel', 'weekly', 'Friday', '2 slides per myth', ARRAY['education', 'myths', 'reality']),
('Security Tips', 'education', 'security', 'carousel_reel', 'bi-weekly', 'Every other week', 'Security best practices', ARRAY['education', 'security']),
('Insurance Explained', 'education', 'insurance', 'carousel', 'monthly', 'As scheduled', 'Insurance fund explanation', ARRAY['education', 'insurance']),
('Backtesting Strategy', 'education', 'backtesting', 'carousel', 'quarterly', 'Start of quarter', 'Backtesting tutorial', ARRAY['education', 'backtesting', 'strategy']),

-- Community & Engagement
('Feature Vote', 'community', 'vote', 'poll_reel', 'bi-weekly', 'Every other week', 'Community votes on features', ARRAY['community', 'vote', 'engagement']),
('Coin Listing Vote', 'community', 'listing', 'poll', 'monthly', 'Last week', 'Vote for next coin listing', ARRAY['community', 'vote', 'listing']),
('Guess the Chart', 'community', 'game', 'reel_carousel', '2-3x/week', 'Mon/Wed/Fri', 'Interactive chart guessing game', ARRAY['community', 'game', 'interactive']),
('Daily Challenge', 'community', 'challenge', 'carousel_pin', 'daily', 'Daily', 'Daily trading challenge', ARRAY['community', 'challenge', 'daily']),
('Guess My Move', 'community', 'game', 'poll', '2-3x/week', 'Tue/Thu/Sat', 'Predict the next trading move', ARRAY['community', 'game', 'prediction']),
('Podium of the Week', 'community', 'podium', 'carousel', 'weekly', 'Friday', 'Weekly top performers spotlight', ARRAY['community', 'podium', 'weekly']),
('Head to Head', 'community', 'competition', 'carousel', 'weekly', 'Wednesday', 'Weekly trader matchup', ARRAY['community', 'competition']),
('AMA Sessions', 'community', 'ama', 'live_reel', 'bi-weekly', 'Every other Thursday', 'Ask Me Anything sessions', ARRAY['community', 'ama', 'live']),
('Community Wins', 'community', 'wins', 'carousel_video', '1-2x/week', 'As available', 'Highlight community achievements', ARRAY['community', 'wins', 'celebration']),
('Trading Humor/Memes', 'community', 'humor', 'meme_reel', '2-3x/week', 'Mon/Wed/Fri', 'Trading memes and humor', ARRAY['community', 'humor', 'memes']),
('Stream Highlights', 'community', 'stream', 'reel', '2-3x/week', 'Post-stream', 'Compilation of stream highlights', ARRAY['community', 'stream', 'highlights']),
('Market Reaction Video', 'community', 'reaction', 'video', 'as_needed', 'As major moves happen', '30-90 sec reaction video', ARRAY['community', 'reaction', 'video']),
('Partner Spotlight', 'community', 'partner', 'carousel_reel', 'monthly', 'Third week', 'Partner feature', ARRAY['community', 'partner']),
('Trading Streaks Celebration', 'community', 'streaks', 'graphic', 'daily', 'When milestones hit', 'Celebrate streak milestones', ARRAY['community', 'streaks']),
('Trade Humor', 'community', 'humor', 'meme', '2-3x/week', 'As created', 'Trading-related memes', ARRAY['community', 'humor']),
('Emoji Battle', 'community', 'emoji', 'caption', '2-3x/week', 'As created', 'Emoji-only caption posts', ARRAY['community', 'emoji', 'fun']),
('Fun Facts', 'community', 'facts', 'carousel', '2-3x/week', 'As created', '1-3 slide fun facts', ARRAY['community', 'facts', 'fun']),

-- Seasonal & Special
('Seasonal Previews', 'seasonal', 'preview', 'carousel', 'quarterly', 'Start of quarter', 'Quarterly season preview', ARRAY['seasonal', 'preview']),
('EOY Review', 'seasonal', 'eoy', 'carousel_video', 'annually', 'December', 'End of year review montage', ARRAY['seasonal', 'eoy', 'review']),
('Holiday Specials', 'seasonal', 'holiday', 'reel_carousel', 'as_needed', 'As applicable', 'Holiday-themed content', ARRAY['seasonal', 'holiday']),
('Milestone Announcements', 'seasonal', 'milestone', 'carousel_reel', 'monthly', 'As milestones hit', 'Platform milestone celebrations', ARRAY['seasonal', 'milestone']),
('Feature Launch', 'seasonal', 'launch', 'reel', 'as_needed', 'As features release', 'New feature walkthrough', ARRAY['seasonal', 'launch', 'product']),
('Maintenance Heads-Up', 'seasonal', 'maintenance', 'notification', 'as_needed', 'As needed', 'Scheduled maintenance notice', ARRAY['seasonal', 'maintenance']),

-- Leaderboard & Recognition
('PnL Chart of Week', 'leaderboard', 'pnl', 'chart', 'weekly', 'Sunday/Monday', 'Weekly top PnL chart with annotation', ARRAY['leaderboard', 'pnl', 'weekly']),
('Leaderboard Toppers', 'leaderboard', 'toppers', 'carousel', '2-3x/week', 'Mon/Wed/Fri', 'Top leaderboard positions', ARRAY['leaderboard', 'toppers']),
('All-Time Rankings', 'leaderboard', 'all_time', 'carousel', 'monthly', 'First of month', 'All-time top performers', ARRAY['leaderboard', 'all_time', 'monthly'])
ON CONFLICT DO NOTHING;
