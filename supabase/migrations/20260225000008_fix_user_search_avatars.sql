-- ============================================================
-- Fix User Search Avatar Loading
-- ============================================================

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
  -- 1. Correctly map tickets to users, including avatar lookups by ID and Username
  ticket_base AS (
    -- (a) Opener has a discord_id → standard join
    SELECT 
      t.id AS ticket_id,
      t.status,
      t.opener_discord_id AS opener_key,
      COALESCE(du.username, REGEXP_REPLACE(t.channel_name, '^ticket-', '')) AS username,
      COALESCE(du.display_name, REGEXP_REPLACE(t.channel_name, '^ticket-', '')) AS display_name,
      du.avatar_url,
      COALESCE(du.is_mod, FALSE) AS is_mod
    FROM tickets t
    JOIN discord_users du ON du.id = t.opener_discord_id
    WHERE t.opener_discord_id IS NOT NULL

    UNION ALL

    -- (b) Opener has a discord_id but NOT in discord_users table yet
    SELECT 
      t.id,
      t.status,
      t.opener_discord_id,
      REGEXP_REPLACE(t.channel_name, '^ticket-', ''),
      REGEXP_REPLACE(t.channel_name, '^ticket-', ''),
      NULL::TEXT,
      FALSE
    FROM tickets t
    WHERE t.opener_discord_id IS NOT NULL 
      AND NOT EXISTS (SELECT 1 FROM discord_users du WHERE du.id = t.opener_discord_id)

    UNION ALL

    -- (c) Opener discord_id is NULL → attempt to match by username in channel_name
    SELECT 
      t.id,
      t.status,
      COALESCE(du.id, t.channel_name),
      COALESCE(du.username, REGEXP_REPLACE(t.channel_name, '^ticket-', '')),
      COALESCE(du.display_name, REGEXP_REPLACE(t.channel_name, '^ticket-', '')),
      du.avatar_url,
      COALESCE(du.is_mod, FALSE)
    FROM tickets t
    LEFT JOIN discord_users du ON du.username = REGEXP_REPLACE(t.channel_name, '^ticket-', '')
    WHERE t.opener_discord_id IS NULL AND t.channel_name ILIKE 'ticket-%'
  ),

  -- 2. Last non-mod activity (for active/inactive filters)
  lnm AS (
    SELECT 
      tm.ticket_id,
      MAX(tm.timestamp) AS last_non_mod
    FROM ticket_messages tm
    LEFT JOIN discord_users du ON du.id = tm.author_id
    WHERE NOT tm.is_deleted AND COALESCE(du.is_mod, FALSE) = FALSE
    GROUP BY tm.ticket_id
  ),

  -- 3. Filter by status
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

  -- 4. Aggregate by user
  grouped_users AS (
    SELECT 
      ft.opener_key AS id,
      MAX(ft.username) AS username,
      MAX(ft.display_name) AS display_name,
      MAX(ft.avatar_url) AS avatar_url,
      BOOL_OR(ft.is_mod) AS is_mod,
      COUNT(DISTINCT ft.ticket_id)::BIGINT AS ticket_count
    FROM filtered_tickets ft
    GROUP BY ft.opener_key
  ),

  -- 5. Filter by search query
  searched_users AS (
    SELECT *
    FROM grouped_users gu
    WHERE 
      p_query = ''
      OR gu.username ILIKE '%' || p_query || '%'
      OR gu.display_name ILIKE '%' || p_query || '%'
  ),

  -- 6. Total count for pagination
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
