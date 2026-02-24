-- ============================================================
-- V9: Include ALL tickets — even those with NULL opener_discord_id.
-- For those, we derive the "user" from channel_name (ticket-USERNAME).
-- ============================================================

DROP FUNCTION IF EXISTS search_ticket_openers(TEXT, TEXT, INT, INT);
DROP FUNCTION IF EXISTS search_ticket_openers(TEXT);

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

  -- Pre-compute last non-mod message per ticket (for active/inactive filter)
  lnm AS (
    SELECT
      tm.ticket_id,
      MAX(CASE WHEN COALESCE(du_m.is_mod, FALSE) = FALSE THEN tm.timestamp END) AS last_non_mod
    FROM ticket_messages tm
    LEFT JOIN discord_users du_m ON du_m.id = tm.author_id
    WHERE NOT tm.is_deleted
    GROUP BY tm.ticket_id
  ),

  -- Map EVERY ticket to a logical "opener key":
  --   a) opener_discord_id present → use it as the key
  --   b) opener_discord_id NULL + channel_name 'ticket-%' →
  --      try to match discord_users by username; else use channel_name as key
  ticket_opener_map AS (
    -- (a) Known discord_id
    SELECT
      t.id                AS ticket_id,
      t.status,
      t.opener_discord_id AS opener_key,
      du.username,
      du.display_name,
      du.avatar_url,
      du.is_mod
    FROM tickets t
    JOIN discord_users du ON du.id = t.opener_discord_id

    UNION ALL

    -- (b1) Has discord_id but NOT in discord_users
    SELECT
      t.id,
      t.status,
      t.opener_discord_id,
      REGEXP_REPLACE(t.channel_name, '^ticket-', '') AS username,
      REGEXP_REPLACE(t.channel_name, '^ticket-', '') AS display_name,
      NULL::TEXT,
      FALSE
    FROM tickets t
    WHERE t.opener_discord_id IS NOT NULL
      AND t.channel_name ILIKE 'ticket-%'
      AND t.opener_discord_id NOT IN (SELECT id FROM discord_users)

    UNION ALL

    -- (b2) NULL discord_id — derive opener from channel_name
    --      Try to match a discord_user by username; fallback to channel-derived name
    SELECT
      t.id,
      t.status,
      COALESCE(du_match.id, t.channel_name) AS opener_key,
      COALESCE(du_match.username,     REGEXP_REPLACE(t.channel_name, '^ticket-', '')) AS username,
      COALESCE(du_match.display_name, REGEXP_REPLACE(t.channel_name, '^ticket-', '')) AS display_name,
      du_match.avatar_url,
      COALESCE(du_match.is_mod, FALSE) AS is_mod
    FROM tickets t
    LEFT JOIN discord_users du_match
           ON du_match.username = REGEXP_REPLACE(t.channel_name, '^ticket-', '')
    WHERE t.opener_discord_id IS NULL
      AND t.channel_name ILIKE 'ticket-%'
  ),

  -- Apply the optional status filter
  filtered_map AS (
    SELECT tom.*
    FROM ticket_opener_map tom
    LEFT JOIN lnm ON lnm.ticket_id = tom.ticket_id
    WHERE
      p_status = '' OR p_status IS NULL
      OR (p_status = 'archived'  AND tom.status = 'closed')
      OR (p_status = 'starred'   AND EXISTS (
            SELECT 1 FROM ticket_stars ts
            WHERE ts.ticket_id = tom.ticket_id AND ts.user_id = v_uid))
      OR (p_status = 'active'    AND tom.status = 'open'
            AND (lnm.last_non_mod IS NULL
              OR NOW() - lnm.last_non_mod <= INTERVAL '48 hours'))
      OR (p_status = 'inactive'  AND tom.status = 'open'
            AND lnm.last_non_mod IS NOT NULL
            AND NOW() - lnm.last_non_mod > INTERVAL '48 hours')
  ),

  -- Aggregate per opener_key (= unique user)
  grouped AS (
    SELECT
      fm.opener_key                            AS id,
      MAX(fm.username)                         AS username,
      MAX(fm.display_name)                     AS display_name,
      MAX(fm.avatar_url)                       AS avatar_url,
      bool_or(fm.is_mod)                       AS is_mod,
      COUNT(DISTINCT fm.ticket_id)::BIGINT     AS ticket_count
    FROM filtered_map fm
    GROUP BY fm.opener_key
    HAVING
      p_query = ''
      OR MAX(fm.username)     ILIKE '%' || p_query || '%'
      OR MAX(fm.display_name) ILIKE '%' || p_query || '%'
  ),

  counted AS (
    SELECT COUNT(*)::BIGINT AS total FROM grouped
  )

  SELECT
    g.id, g.username, g.display_name, g.avatar_url,
    g.is_mod, g.ticket_count,
    c.total AS total_count
  FROM grouped g
  CROSS JOIN counted c
  ORDER BY g.ticket_count DESC
  LIMIT  p_page_size
  OFFSET p_page * p_page_size;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
