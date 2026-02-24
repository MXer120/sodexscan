-- ============================================================
-- Fix Mod Stats and User Search
-- ============================================================

-- 1. Update get_mod_responders to include ALL mods even with 0 stats
DROP FUNCTION IF EXISTS get_mod_responders();
CREATE OR REPLACE FUNCTION get_mod_responders()
RETURNS TABLE (
  id TEXT,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  tickets_responded BIGINT,
  message_count BIGINT,
  tickets_assigned BIGINT
) AS $$
BEGIN
  IF NOT public.is_mod() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    du.id,
    du.username,
    du.display_name,
    du.avatar_url,
    (SELECT COUNT(DISTINCT tm.ticket_id) FROM ticket_messages tm WHERE tm.author_id = du.id AND NOT tm.is_deleted) AS tickets_responded,
    (SELECT COUNT(*) FROM ticket_messages tm WHERE tm.author_id = du.id AND NOT tm.is_deleted) AS message_count,
    (SELECT COUNT(*) FROM tickets t WHERE du.id = ANY(t.assigned)) AS tickets_assigned
  FROM discord_users du
  WHERE du.is_mod = TRUE
  ORDER BY message_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Robust User Search with Pagination
DROP FUNCTION IF EXISTS search_ticket_openers(TEXT, TEXT, INT, INT);
CREATE OR REPLACE FUNCTION search_ticket_openers(
  p_query     TEXT DEFAULT '',
  p_status    TEXT DEFAULT '',
  p_page      INT  DEFAULT 0,
  p_page_size INT  DEFAULT 10
)
RETURNS TABLE (
  id           TEXT,
  username     TEXT,
  display_name TEXT,
  avatar_url   TEXT,
  is_mod       BOOLEAN,
  ticket_count BIGINT,
  total_count  BIGINT
) AS $$
DECLARE
  v_uid UUID;
BEGIN
  IF NOT public.is_mod() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_uid := auth.uid();

  RETURN QUERY
  WITH 
  -- Combine all tickets and derive opener info
  ticket_base AS (
    SELECT 
      t.id AS ticket_id,
      t.status,
      COALESCE(t.opener_discord_id, t.channel_name) AS opener_key,
      COALESCE(du.username, REGEXP_REPLACE(t.channel_name, '^ticket-', '')) AS username,
      COALESCE(du.display_name, REGEXP_REPLACE(t.channel_name, '^ticket-', '')) AS display_name,
      du.avatar_url,
      COALESCE(du.is_mod, FALSE) AS is_mod
    FROM tickets t
    LEFT JOIN discord_users du ON du.id = t.opener_discord_id
    WHERE t.opener_discord_id IS NOT NULL OR t.channel_name ILIKE 'ticket-%'
  ),
  -- Last non-mod activity
  lnm AS (
    SELECT 
      tm.ticket_id,
      MAX(tm.timestamp) AS last_non_mod
    FROM ticket_messages tm
    LEFT JOIN discord_users du ON du.id = tm.author_id
    WHERE NOT tm.is_deleted AND COALESCE(du.is_mod, FALSE) = FALSE
    GROUP BY tm.ticket_id
  ),
  -- Filter by status
  filtered_tickets AS (
    SELECT tb.*
    FROM ticket_base tb
    LEFT JOIN lnm ON lnm.ticket_id = tb.ticket_id
    WHERE 
      (p_status = '' OR p_status IS NULL)
      OR (p_status = 'archived' AND tb.status = 'closed')
      OR (p_status = 'active' AND tb.status = 'open' AND (lnm.last_non_mod IS NULL OR NOW() - lnm.last_non_mod <= INTERVAL '48 hours'))
      OR (p_status = 'inactive' AND tb.status = 'open' AND lnm.last_non_mod IS NOT NULL AND NOW() - lnm.last_non_mod > INTERVAL '48 hours')
      OR (p_status = 'starred' AND EXISTS (SELECT 1 FROM ticket_stars ts WHERE ts.ticket_id = tb.ticket_id AND ts.user_id = v_uid))
  ),
  -- Aggregate by user
  grouped_users AS (
    SELECT 
      ft.opener_key AS id,
      COALESCE(MAX(ft.username), ft.opener_key) AS username,
      COALESCE(MAX(ft.display_name), ft.opener_key) AS display_name,
      MAX(ft.avatar_url) AS avatar_url,
      BOOL_OR(ft.is_mod) AS is_mod,
      COUNT(*)::BIGINT AS ticket_count
    FROM filtered_tickets ft
    GROUP BY ft.opener_key
  ),
  -- Filter by search query
  searched_users AS (
    SELECT *
    FROM grouped_users gu
    WHERE 
      p_query = ''
      OR gu.username ILIKE '%' || p_query || '%'
      OR gu.display_name ILIKE '%' || p_query || '%'
  ),
  -- Total count for pagination
  total AS (
    SELECT COUNT(*)::BIGINT AS count FROM searched_users
  )
  SELECT 
    su.id, su.username, su.display_name, su.avatar_url, su.is_mod, su.ticket_count,
    t.count
  FROM searched_users su
  CROSS JOIN total t
  ORDER BY su.ticket_count DESC
  LIMIT p_page_size
  OFFSET p_page * p_page_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
