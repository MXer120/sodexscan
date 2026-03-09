-- Enable RLS on internal infrastructure tables
-- These are only accessed via service_role (which bypasses RLS)
-- No permissive policy needed - blocks anon/authenticated access

ALTER TABLE public.leaderboard_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.http_request_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.http_request_queue_new ENABLE ROW LEVEL SECURITY;
