-- ============================================================
-- Ticket v3: upsert mod list, responder RPC, user search RPC
-- ============================================================

-- 1. Upsert all known mods
INSERT INTO discord_users (id, username, display_name, is_mod) VALUES
  ('877444818643599420', 'forsom', 'eric', TRUE),
  ('1035494175606591499', 'nanee70092', 'Cryptoboy/Sodex', TRUE),
  ('955706126563967036', 'yucelcrypto', 'Yucel | SoSoValue', TRUE),
  ('878554789766660136', 'manjirow555', 'manjirow', TRUE),
  ('927577910892711946', 'lutzs120', 'LutzS120', TRUE),
  ('970506842318995487', '.oliver6', 'Oliver', TRUE),
  ('1197970651781275698', 'mickmite.', 'Mickmite', TRUE),
  ('751097503637700609', 'frankabababa', 'FrankAba | SoSoValue', TRUE),
  ('885109448799043585', 'djye', 'djye', TRUE),
  ('627282807600840715', 'kouhi2550', 'Dobee', TRUE),
  ('1010844860510646332', 'yuxialun', 'SoSoValue Jazon', TRUE),
  ('1450674711682879498', 'sodexteam', 'sherry', TRUE),
  ('1087899759425097860', 'dongdongrobin', 'dongdong', TRUE),
  ('954206609486254110', 'jasminezhong7089', 'jasminezhong', TRUE),
  ('952765858822881310', '.0xtab', '0xTab', TRUE),
  ('1232027142284640299', 'yefz1688', 'SODEX yefz', TRUE)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  display_name = EXCLUDED.display_name,
  is_mod = TRUE;

-- 2. RPC: get mod responders (unique tickets responded to, counted per mod)
DROP FUNCTION IF EXISTS get_mod_responders();
CREATE OR REPLACE FUNCTION get_mod_responders()
RETURNS TABLE (
  id TEXT,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  tickets_responded BIGINT,
  message_count BIGINT
) AS $$
BEGIN
  IF NOT public.is_mod() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    du.id, du.username, du.display_name, du.avatar_url,
    COUNT(DISTINCT tm.ticket_id) AS tickets_responded,
    COUNT(tm.id) AS message_count
  FROM discord_users du
  JOIN ticket_messages tm ON tm.author_id = du.id AND NOT tm.is_deleted
  WHERE du.is_mod = TRUE
  GROUP BY du.id
  ORDER BY tickets_responded DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC: search all ticket openers
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
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC: get tickets for a user (with filters)
DROP FUNCTION IF EXISTS get_user_tickets(TEXT);
CREATE OR REPLACE FUNCTION get_user_tickets(p_discord_id TEXT)
RETURNS TABLE (
  id BIGINT,
  channel_id TEXT,
  channel_name TEXT,
  status TEXT,
  open_date TIMESTAMPTZ,
  close_date TIMESTAMPTZ,
  project TEXT,
  progress TEXT,
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
    t.project, t.progress,
    MAX(tm.timestamp) AS last_message,
    COUNT(tm.id) AS message_count,
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT CASE WHEN du.is_mod = TRUE THEN tm.author_id END), NULL) AS responding_mods
  FROM tickets t
  LEFT JOIN ticket_messages tm ON tm.ticket_id = t.id AND NOT tm.is_deleted
  LEFT JOIN discord_users du ON du.id = tm.author_id
  WHERE t.opener_discord_id = p_discord_id
  GROUP BY t.id
  ORDER BY t.open_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
