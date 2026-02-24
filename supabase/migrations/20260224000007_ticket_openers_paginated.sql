-- ============================================================
-- V7: Paginated search_ticket_openers with status filter
-- Replaces V5/V6 single-call version with offset pagination
-- and optional ticket-status filtering (active/inactive/archived/starred).
--
-- active   = open tickets whose last non-mod message is within 48h (or has no non-mod msg)
-- inactive = open tickets whose last non-mod message is older than 48h
-- archived = closed tickets
-- starred  = tickets starred by the calling user (via ticket_stars)
-- (empty)  = all tickets (no status filter)
--
-- Also returns the total count for pagination.
-- ============================================================

DROP FUNCTION IF EXISTS search_ticket_openers(TEXT);
DROP FUNCTION IF EXISTS search_ticket_openers(TEXT, TEXT, INT, INT);

CREATE OR REPLACE FUNCTION search_ticket_openers(
  p_query     TEXT    DEFAULT '',
  p_status    TEXT    DEFAULT '',    -- 'active'|'inactive'|'archived'|'starred'|''
  p_page      INT     DEFAULT 0,     -- 0-based page index
  p_page_size INT     DEFAULT 10
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
  v_now            TIMESTAMPTZ := NOW();
  v_48h            INTERVAL    := INTERVAL '48 hours';
  v_calling_user   UUID        := auth.uid();
BEGIN
  IF NOT public.is_mod() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  WITH

  -- 1. Get all tickets with activity data (mirrors get_tickets_with_activity)
  ticket_activity AS (
    SELECT
      t.id             AS ticket_id,
      t.opener_discord_id,
      t.status,
      MAX(CASE WHEN du_msg.is_mod IS NOT TRUE THEN tm.timestamp END) AS last_non_mod_message
    FROM tickets t
    LEFT JOIN ticket_messages tm ON tm.ticket_id = t.id AND NOT tm.is_deleted
    LEFT JOIN discord_users du_msg ON du_msg.id = tm.author_id
    GROUP BY t.id
  ),

  -- 2. Starred ticket IDs for the calling user
  starred_ticket_ids AS (
    SELECT ticket_id FROM ticket_stars WHERE user_id = v_calling_user
  ),

  -- 3. Categorise each ticket
  categorised AS (
    SELECT
      ta.ticket_id,
      ta.opener_discord_id,
      CASE
        WHEN p_status = 'archived' THEN (ta.status = 'closed')
        WHEN p_status = 'starred'  THEN (ta.ticket_id IN (SELECT ticket_id FROM starred_ticket_ids))
        WHEN p_status = 'active'   THEN (
          ta.status = 'open' AND (
            ta.last_non_mod_message IS NULL OR
            (v_now - ta.last_non_mod_message) <= v_48h
          )
        )
        WHEN p_status = 'inactive' THEN (
          ta.status = 'open' AND
          ta.last_non_mod_message IS NOT NULL AND
          (v_now - ta.last_non_mod_message) > v_48h
        )
        ELSE TRUE  -- no filter → all tickets
      END AS matches_status
    FROM ticket_activity ta
  ),

  -- 4. Aggregate per opener (known discord users)
  known_openers AS (
    SELECT
      du.id,
      du.username,
      du.display_name,
      du.avatar_url,
      du.is_mod,
      COUNT(c.ticket_id) AS ticket_count
    FROM discord_users du
    JOIN categorised c ON c.opener_discord_id = du.id AND c.matches_status
    WHERE
      p_query = '' OR
      du.username     ILIKE '%' || p_query || '%' OR
      du.display_name ILIKE '%' || p_query || '%'
    GROUP BY du.id
  ),

  -- 5. Unknown openers (only channel_name available, not in discord_users)
  unknown_openers AS (
    SELECT
      t.opener_discord_id                            AS id,
      REGEXP_REPLACE(t.channel_name, '^ticket-', '') AS username,
      REGEXP_REPLACE(t.channel_name, '^ticket-', '') AS display_name,
      NULL::TEXT                                     AS avatar_url,
      FALSE                                          AS is_mod,
      COUNT(c.ticket_id)                             AS ticket_count
    FROM tickets t
    JOIN categorised c ON c.ticket_id = t.id AND c.matches_status
    WHERE
      t.channel_name ILIKE 'ticket-%' AND
      t.opener_discord_id IS NOT NULL AND
      t.opener_discord_id NOT IN (SELECT du2.id FROM discord_users du2) AND
      (
        p_query = '' OR
        REGEXP_REPLACE(t.channel_name, '^ticket-', '') ILIKE '%' || p_query || '%'
      )
    GROUP BY t.opener_discord_id, t.channel_name
  ),

  -- 6. Union both sets, filter out zero-ticket rows (can happen with status filter)
  all_openers AS (
    SELECT * FROM known_openers  WHERE ticket_count > 0
    UNION ALL
    SELECT * FROM unknown_openers WHERE ticket_count > 0
  ),

  -- 7. Total count (for pagination)
  counted AS (
    SELECT COUNT(*) AS total FROM all_openers
  )

  SELECT
    ao.id,
    ao.username,
    ao.display_name,
    ao.avatar_url,
    ao.is_mod,
    ao.ticket_count,
    c.total AS total_count
  FROM all_openers ao
  CROSS JOIN counted c
  ORDER BY ao.ticket_count DESC
  LIMIT  p_page_size
  OFFSET p_page * p_page_size;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
