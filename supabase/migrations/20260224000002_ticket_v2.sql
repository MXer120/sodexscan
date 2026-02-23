-- ============================================================
-- Ticket System v2: assigned as array, progress auto-detect,
-- last_non_mod_message in RPC, mod responding mods
-- ============================================================

-- 1. Change assigned from TEXT to TEXT[] (already applied if re-running)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tickets' AND column_name = 'assigned' AND data_type = 'text'
  ) THEN
    ALTER TABLE tickets ALTER COLUMN assigned TYPE TEXT[] USING
      CASE WHEN assigned IS NOT NULL AND assigned != '' THEN ARRAY[assigned] ELSE '{}'::TEXT[] END;
  END IF;
END $$;
ALTER TABLE tickets ALTER COLUMN assigned SET DEFAULT '{}';

-- Drop old index, recreate for array
DROP INDEX IF EXISTS idx_tickets_assigned;
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets USING GIN(assigned);

-- 2. Update update_ticket_fields to handle assigned as array + project/progress enums
CREATE OR REPLACE FUNCTION update_ticket_fields(
  p_ticket_id BIGINT,
  p_fields JSONB
) RETURNS void AS $$
DECLARE
  v_assigned TEXT[];
BEGIN
  IF NOT public.is_mod() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Parse assigned array from JSONB if provided
  IF p_fields ? 'assigned' THEN
    SELECT ARRAY(SELECT jsonb_array_elements_text(p_fields->'assigned')) INTO v_assigned;
    UPDATE tickets SET assigned = v_assigned WHERE id = p_ticket_id;
  END IF;

  UPDATE tickets SET
    details        = COALESCE(p_fields->>'details', details),
    project        = COALESCE(p_fields->>'project', project),
    issue_type     = COALESCE(p_fields->>'issue_type', issue_type),
    progress       = COALESCE(p_fields->>'progress', progress),
    wallet_address = COALESCE(p_fields->>'wallet_address', wallet_address),
    account_id     = COALESCE(p_fields->>'account_id', account_id),
    tx_id          = COALESCE(p_fields->>'tx_id', tx_id)
  WHERE id = p_ticket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Drop + recreate get_tickets_with_activity (return type changed)
DROP FUNCTION IF EXISTS get_tickets_with_activity();
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
  assigned TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_opener_message TIMESTAMPTZ,
  last_non_mod_message TIMESTAMPTZ,
  last_message TIMESTAMPTZ,
  message_count BIGINT,
  responding_mods TEXT[]
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
    MAX(CASE WHEN du.is_mod IS NOT TRUE THEN tm.timestamp END) AS last_non_mod_message,
    MAX(tm.timestamp) AS last_message,
    COUNT(tm.id) AS message_count,
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT CASE WHEN du.is_mod = TRUE THEN tm.author_id END), NULL) AS responding_mods
  FROM tickets t
  LEFT JOIN ticket_messages tm ON tm.ticket_id = t.id AND NOT tm.is_deleted
  LEFT JOIN discord_users du ON du.id = tm.author_id
  GROUP BY t.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update get_discord_user_stats for array assigned
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
    (SELECT COUNT(*) FROM tickets WHERE p_discord_id = ANY(assigned)),
    (SELECT COUNT(*) FROM ticket_messages WHERE author_id = p_discord_id AND NOT is_deleted);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: get all mods (for Users section)
CREATE OR REPLACE FUNCTION get_all_mods()
RETURNS TABLE (
  id TEXT,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  ticket_count BIGINT,
  message_count BIGINT
) AS $$
BEGIN
  IF NOT public.is_mod() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    du.id, du.username, du.display_name, du.avatar_url,
    (SELECT COUNT(*) FROM tickets WHERE du.id = ANY(assigned)) AS ticket_count,
    (SELECT COUNT(*) FROM ticket_messages WHERE author_id = du.id AND NOT is_deleted) AS message_count
  FROM discord_users du
  WHERE du.is_mod = TRUE
  ORDER BY message_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: get top ticket openers
CREATE OR REPLACE FUNCTION get_top_ticket_openers(p_limit INT DEFAULT 20)
RETURNS TABLE (
  id TEXT,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  is_mod BOOLEAN,
  ticket_count BIGINT,
  latest_ticket TIMESTAMPTZ
) AS $$
BEGIN
  IF NOT public.is_mod() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    du.id, du.username, du.display_name, du.avatar_url, du.is_mod,
    COUNT(t.id) AS ticket_count,
    MAX(t.open_date) AS latest_ticket
  FROM discord_users du
  JOIN tickets t ON t.opener_discord_id = du.id
  GROUP BY du.id
  ORDER BY ticket_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC: get recent ticket openers
CREATE OR REPLACE FUNCTION get_recent_ticket_openers(p_limit INT DEFAULT 20)
RETURNS TABLE (
  id TEXT,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  is_mod BOOLEAN,
  ticket_name TEXT,
  ticket_id BIGINT,
  open_date TIMESTAMPTZ
) AS $$
BEGIN
  IF NOT public.is_mod() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    du.id, du.username, du.display_name, du.avatar_url, du.is_mod,
    t.channel_name AS ticket_name, t.id AS ticket_id, t.open_date
  FROM tickets t
  JOIN discord_users du ON du.id = t.opener_discord_id
  ORDER BY t.open_date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
