-- AI rate-limit tracking table + RPC
-- Roles: owner=unlimited, mod=100/min·2000/day, buildathon=60/min·600/day, user=20/min·200/day, anon=5/min·20/day

CREATE TABLE IF NOT EXISTS ai_rate_limit_log (
  id          BIGSERIAL PRIMARY KEY,
  identifier  TEXT NOT NULL,
  role        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_rate_limit_log_lookup
  ON ai_rate_limit_log(identifier, created_at DESC);

-- Purge entries older than 24 h to keep the table small
CREATE OR REPLACE FUNCTION prune_ai_rate_limit_log() RETURNS void
LANGUAGE sql SECURITY DEFINER AS $$
  DELETE FROM ai_rate_limit_log WHERE created_at < now() - INTERVAL '1 day';
$$;

CREATE OR REPLACE FUNCTION check_ai_rate_limit(
  p_identifier TEXT,
  p_role       TEXT
) RETURNS TABLE(allowed BOOLEAN, retry_after INT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_per_min  INT;
  v_per_day  INT;
  v_cnt_min  INT;
  v_cnt_day  INT;
BEGIN
  CASE p_role
    WHEN 'buildathon' THEN v_per_min := 60;  v_per_day := 600;
    WHEN 'mod'        THEN v_per_min := 100; v_per_day := 2000;
    WHEN 'user'       THEN v_per_min := 20;  v_per_day := 200;
    ELSE                   v_per_min := 5;   v_per_day := 20;   -- anon
  END CASE;

  SELECT COUNT(*) INTO v_cnt_min
  FROM ai_rate_limit_log
  WHERE identifier = p_identifier
    AND created_at > now() - INTERVAL '1 minute';

  IF v_cnt_min >= v_per_min THEN
    RETURN QUERY SELECT false, 60;
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_cnt_day
  FROM ai_rate_limit_log
  WHERE identifier = p_identifier
    AND created_at > now() - INTERVAL '1 day';

  IF v_cnt_day >= v_per_day THEN
    RETURN QUERY SELECT false, 3600;
    RETURN;
  END IF;

  INSERT INTO ai_rate_limit_log(identifier, role) VALUES (p_identifier, p_role);

  RETURN QUERY SELECT true, 0;
END;
$$;

-- Allow service role to call the function
GRANT EXECUTE ON FUNCTION check_ai_rate_limit(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION prune_ai_rate_limit_log() TO service_role;

-- Extend profiles role constraint to include buildathon
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['user','mod','owner','team','buildathon']));
