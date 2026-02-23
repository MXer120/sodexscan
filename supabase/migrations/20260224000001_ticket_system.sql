-- ============================================================
-- Ticket System: roles, tables, RLS, RPCs, storage
-- ============================================================

-- 1. Add role to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'mod'));
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role) WHERE role = 'mod';

-- 2. is_mod() helper
CREATE OR REPLACE FUNCTION public.is_mod()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'mod'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 3. Discord users
CREATE TABLE IF NOT EXISTS discord_users (
  id            TEXT PRIMARY KEY,
  username      TEXT,
  display_name  TEXT,
  avatar_url    TEXT,
  is_mod        BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_discord_users_updated_at
  BEFORE UPDATE ON discord_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Tickets
CREATE TABLE IF NOT EXISTS tickets (
  id                BIGSERIAL PRIMARY KEY,
  channel_id        TEXT NOT NULL UNIQUE,
  channel_name      TEXT,
  status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  open_date         TIMESTAMPTZ,
  close_date        TIMESTAMPTZ,
  opener_discord_id TEXT REFERENCES discord_users(id),
  details           TEXT,
  project           TEXT,
  issue_type        TEXT,
  wallet_address    TEXT,
  account_id        TEXT,
  tx_id             TEXT,
  progress          TEXT DEFAULT 'new',
  assigned          TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_channel ON tickets(channel_id);
CREATE INDEX idx_tickets_assigned ON tickets(assigned);
CREATE INDEX idx_tickets_opener ON tickets(opener_discord_id);

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Ticket messages
CREATE TABLE IF NOT EXISTS ticket_messages (
  id            BIGSERIAL PRIMARY KEY,
  ticket_id     BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  message_id    TEXT NOT NULL,
  content       TEXT,
  author_id     TEXT NOT NULL,
  author_name   TEXT NOT NULL,
  timestamp     TIMESTAMPTZ NOT NULL,
  attachments   JSONB DEFAULT '[]',
  is_edit       BOOLEAN DEFAULT FALSE,
  is_deleted    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ticket_id, message_id)
);

CREATE INDEX idx_ticket_messages_ticket ON ticket_messages(ticket_id, timestamp);
CREATE INDEX idx_ticket_messages_author ON ticket_messages(author_id);
CREATE INDEX idx_ticket_messages_msgid ON ticket_messages(message_id);

-- 6. Ticket stars (mod bookmarks)
CREATE TABLE IF NOT EXISTS ticket_stars (
  id         BIGSERIAL PRIMARY KEY,
  ticket_id  BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ticket_id, user_id)
);

CREATE INDEX idx_ticket_stars_user ON ticket_stars(user_id);

-- ============================================================
-- 7. RLS
-- ============================================================

ALTER TABLE discord_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_stars ENABLE ROW LEVEL SECURITY;

-- discord_users: mods read
CREATE POLICY "Mods can view discord users"
  ON discord_users FOR SELECT USING (public.is_mod());

-- tickets: mods read
CREATE POLICY "Mods can view tickets"
  ON tickets FOR SELECT USING (public.is_mod());

-- ticket_messages: mods read
CREATE POLICY "Mods can view messages"
  ON ticket_messages FOR SELECT USING (public.is_mod());

-- ticket_stars: mods CRUD own
CREATE POLICY "Mods can view own stars"
  ON ticket_stars FOR SELECT USING (auth.uid() = user_id AND public.is_mod());
CREATE POLICY "Mods can insert stars"
  ON ticket_stars FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_mod());
CREATE POLICY "Mods can delete own stars"
  ON ticket_stars FOR DELETE USING (auth.uid() = user_id AND public.is_mod());

-- ============================================================
-- 8. RPCs
-- ============================================================

-- Mod-only ticket field update
CREATE OR REPLACE FUNCTION update_ticket_fields(
  p_ticket_id BIGINT,
  p_fields JSONB
) RETURNS void AS $$
BEGIN
  IF NOT public.is_mod() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE tickets SET
    details        = COALESCE(p_fields->>'details', details),
    project        = COALESCE(p_fields->>'project', project),
    issue_type     = COALESCE(p_fields->>'issue_type', issue_type),
    progress       = COALESCE(p_fields->>'progress', progress),
    assigned       = COALESCE(p_fields->>'assigned', assigned),
    wallet_address = COALESCE(p_fields->>'wallet_address', wallet_address),
    account_id     = COALESCE(p_fields->>'account_id', account_id),
    tx_id          = COALESCE(p_fields->>'tx_id', tx_id)
  WHERE id = p_ticket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get tickets with latest message info (for inactive detection)
CREATE OR REPLACE FUNCTION get_tickets_with_activity()
RETURNS TABLE (
  id BIGINT,
  channel_id TEXT,
  channel_name TEXT,
  status TEXT,
  open_date TIMESTAMPTZ,
  close_date TIMESTAMPTZ,
  opener_discord_id TEXT,
  details TEXT,
  project TEXT,
  issue_type TEXT,
  wallet_address TEXT,
  account_id TEXT,
  tx_id TEXT,
  progress TEXT,
  assigned TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_opener_message TIMESTAMPTZ,
  last_message TIMESTAMPTZ,
  message_count BIGINT
) AS $$
BEGIN
  IF NOT public.is_mod() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    t.id, t.channel_id, t.channel_name, t.status, t.open_date, t.close_date,
    t.opener_discord_id, t.details, t.project, t.issue_type,
    t.wallet_address, t.account_id, t.tx_id, t.progress, t.assigned,
    t.created_at, t.updated_at,
    MAX(CASE WHEN tm.author_id = t.opener_discord_id THEN tm.timestamp END) AS last_opener_message,
    MAX(tm.timestamp) AS last_message,
    COUNT(tm.id) AS message_count
  FROM tickets t
  LEFT JOIN ticket_messages tm ON tm.ticket_id = t.id AND NOT tm.is_deleted
  GROUP BY t.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Discord user stats
CREATE OR REPLACE FUNCTION get_discord_user_stats(p_discord_id TEXT)
RETURNS TABLE (
  tickets_opened BIGINT,
  tickets_assigned BIGINT,
  messages_sent BIGINT
) AS $$
BEGIN
  IF NOT public.is_mod() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM tickets WHERE opener_discord_id = p_discord_id),
    (SELECT COUNT(*) FROM tickets WHERE assigned = p_discord_id),
    (SELECT COUNT(*) FROM ticket_messages WHERE author_id = p_discord_id AND NOT is_deleted);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 9. Supabase Storage bucket for attachments
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public reads
CREATE POLICY "Public read ticket attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ticket-attachments');

-- Allow service role writes (bot uses service key, bypasses RLS anyway)
-- No additional policy needed for service role
