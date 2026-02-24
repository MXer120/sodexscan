-- ============================================================
-- Update get_tickets_with_activity to include opener info
-- ============================================================

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
  responding_mods TEXT[],
  opener_username TEXT,
  opener_display_name TEXT,
  opener_avatar_url TEXT
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
    MAX(CASE WHEN du_msg.is_mod IS NOT TRUE THEN tm.timestamp END) AS last_non_mod_message,
    MAX(tm.timestamp) AS last_message,
    COUNT(tm.id) AS message_count,
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT CASE WHEN du_msg.is_mod = TRUE THEN tm.author_id END), NULL) AS responding_mods,
    du_open.username AS opener_username,
    du_open.display_name AS opener_display_name,
    du_open.avatar_url AS opener_avatar_url
  FROM tickets t
  LEFT JOIN ticket_messages tm ON tm.ticket_id = t.id AND NOT tm.is_deleted
  LEFT JOIN discord_users du_msg ON du_msg.id = tm.author_id
  LEFT JOIN discord_users du_open ON du_open.id = t.opener_discord_id
  GROUP BY t.id, du_open.username, du_open.display_name, du_open.avatar_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
