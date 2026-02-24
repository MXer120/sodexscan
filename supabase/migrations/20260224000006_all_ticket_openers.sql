-- ============================================================
-- V5: Remove LIMIT on search_ticket_openers so Users page
-- can list ALL openers (empty query = everyone)
-- ============================================================

DROP FUNCTION IF EXISTS search_ticket_openers(TEXT);
CREATE OR REPLACE FUNCTION search_ticket_openers(p_query TEXT DEFAULT '')
RETURNS TABLE (
  id TEXT,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  is_mod BOOLEAN,
  ticket_count BIGINT
) AS $$
BEGIN
  IF NOT public.is_mod() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  (
    SELECT
      du.id, du.username, du.display_name, du.avatar_url, du.is_mod,
      COUNT(t.id) AS ticket_count
    FROM discord_users du
    JOIN tickets t ON t.opener_discord_id = du.id
    WHERE
      p_query = '' OR
      du.username ILIKE '%' || p_query || '%' OR
      du.display_name ILIKE '%' || p_query || '%'
    GROUP BY du.id
    ORDER BY ticket_count DESC
  )
  UNION ALL
  (
    SELECT
      t.opener_discord_id AS id,
      REGEXP_REPLACE(t.channel_name, '^ticket-', '') AS username,
      REGEXP_REPLACE(t.channel_name, '^ticket-', '') AS display_name,
      NULL AS avatar_url,
      FALSE AS is_mod,
      COUNT(*) AS ticket_count
    FROM tickets t
    WHERE
      t.channel_name ILIKE 'ticket-%' AND
      t.opener_discord_id IS NOT NULL AND
      t.opener_discord_id NOT IN (SELECT du2.id FROM discord_users du2) AND
      (
        p_query = '' OR
        REGEXP_REPLACE(t.channel_name, '^ticket-', '') ILIKE '%' || p_query || '%'
      )
    GROUP BY t.opener_discord_id, t.channel_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
