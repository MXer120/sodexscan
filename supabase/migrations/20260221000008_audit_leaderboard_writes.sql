-- Temporary audit: log who writes to leaderboard
-- Remove after debugging with migration 20260221000009

CREATE TABLE IF NOT EXISTS public._leaderboard_write_log (
  id serial PRIMARY KEY,
  op text,
  account_id integer,
  app_name text,
  username text,
  client_addr text,
  query_snippet text,
  ts timestamptz DEFAULT now()
);

ALTER TABLE public._leaderboard_write_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION _log_leaderboard_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public._leaderboard_write_log (op, account_id, app_name, username, client_addr, query_snippet)
  VALUES (
    TG_OP,
    COALESCE(NEW.account_id, OLD.account_id),
    current_setting('application_name', true),
    session_user,
    inet_client_addr()::text,
    left(current_query(), 500)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS _trg_log_leaderboard ON leaderboard;
CREATE TRIGGER _trg_log_leaderboard
  AFTER INSERT OR UPDATE ON leaderboard
  FOR EACH ROW EXECUTE FUNCTION _log_leaderboard_write();
