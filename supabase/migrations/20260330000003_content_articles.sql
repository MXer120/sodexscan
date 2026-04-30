-- Articles section for educational content
CREATE TABLE IF NOT EXISTS content_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  body TEXT,
  status TEXT DEFAULT 'saved' CHECK (status IN ('saved', 'draft', 'published', 'archived')),
  published_url TEXT,
  published_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  idea_id UUID REFERENCES content_ideas(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE content_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_articles_read" ON content_articles FOR SELECT TO authenticated USING (is_team_or_mod());
CREATE POLICY "content_articles_write" ON content_articles FOR ALL TO authenticated USING (is_team_or_mod()) WITH CHECK (is_team_or_mod());
