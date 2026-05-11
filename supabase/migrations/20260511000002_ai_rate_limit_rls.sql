-- Enable RLS on the rate-limit log table.
-- No user-facing policies are needed — the SECURITY DEFINER functions
-- (check_ai_rate_limit, prune_ai_rate_limit_log) run as the function owner
-- and bypass RLS automatically, so they continue to work unchanged.
ALTER TABLE ai_rate_limit_log ENABLE ROW LEVEL SECURITY;
