-- ============================================================
-- Custom HTTP request queue to replace net.http_request_queue
-- Fixes: extreme IOwait from full-table scans on the pg_net
-- internal queue (no indexes, no processed flag).
-- ============================================================

-- 1. Create the replacement queue table
CREATE TABLE IF NOT EXISTS public.http_request_queue (
  id          bigserial    PRIMARY KEY,
  method      text         NOT NULL DEFAULT 'GET',
  url         text         NOT NULL,
  headers     jsonb        NOT NULL DEFAULT '{}'::jsonb,
  body        bytea,
  timeout_milliseconds integer NOT NULL DEFAULT 5000,
  processed   boolean      NOT NULL DEFAULT false,
  created_at  timestamptz  NOT NULL DEFAULT now()
);

-- 2. Index for efficient polling (unprocessed jobs, oldest first)
CREATE INDEX idx_http_queue_pending
  ON public.http_request_queue (processed, created_at)
  WHERE processed = false;

-- 3. Copy existing pending jobs from the pg_net internal queue
INSERT INTO public.http_request_queue (method, url, headers, body, timeout_milliseconds)
SELECT method, url, headers, body, timeout_milliseconds
FROM net.http_request_queue
ON CONFLICT DO NOTHING;

-- 4. RPC: Poll next unprocessed job (atomic lock via FOR UPDATE SKIP LOCKED)
CREATE OR REPLACE FUNCTION public.poll_http_queue()
RETURNS TABLE (
  job_id      bigint,
  method      text,
  url         text,
  headers     jsonb,
  body        bytea,
  timeout_ms  integer
)
LANGUAGE sql
AS $$
  SELECT id, method, url, headers, body, timeout_milliseconds
  FROM public.http_request_queue
  WHERE processed = false
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
$$;

-- 5. RPC: Mark a job as processed
CREATE OR REPLACE FUNCTION public.mark_http_job_done(job_id bigint)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.http_request_queue
  SET processed = true
  WHERE id = job_id;
$$;

-- 6. Updated cron wrapper: enqueue into public table instead of net.http_get
CREATE OR REPLACE FUNCTION call_snapshot_spot_volumes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_url    TEXT;
  cron_secret TEXT;
BEGIN
  SELECT decrypted_secret INTO app_url
    FROM vault.decrypted_secrets WHERE name = 'APP_URL';
  SELECT decrypted_secret INTO cron_secret
    FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET';

  IF app_url IS NULL OR cron_secret IS NULL THEN
    RAISE EXCEPTION 'Missing vault secrets APP_URL or CRON_SECRET';
  END IF;

  -- Enqueue into custom table instead of net.http_get
  INSERT INTO public.http_request_queue (method, url, headers)
  VALUES (
    'GET',
    app_url || '/api/cron/snapshot-spot-volumes',
    jsonb_build_object('Authorization', 'Bearer ' || cron_secret)
  );
END;
$$;

-- 7. Optional: cleanup old processed jobs (run weekly via pg_cron)
CREATE OR REPLACE FUNCTION public.cleanup_http_queue(older_than interval DEFAULT '7 days')
RETURNS integer
LANGUAGE sql
AS $$
  WITH deleted AS (
    DELETE FROM public.http_request_queue
    WHERE processed = true
      AND created_at < now() - older_than
    RETURNING 1
  )
  SELECT count(*)::integer FROM deleted;
$$;

-- Schedule weekly cleanup (Sunday 03:00 UTC)
SELECT cron.schedule(
  'cleanup-http-queue',
  '0 3 * * 0',
  $$SELECT public.cleanup_http_queue()$$
);

-- ============================================================
-- SWITCHOVER STEPS (run manually after deploying the new
-- /api/cron/process-queue endpoint):
--
-- 1. The queue processor endpoint at /api/cron/process-queue
--    should be called periodically. Set up an external cron
--    (Vercel cron, GitHub Actions, etc.) to hit it every minute:
--
--    GET {APP_URL}/api/cron/process-queue
--    Header: Authorization: Bearer {CRON_SECRET}
--
-- 2. Once confirmed working, disable pg_net to stop the
--    internal queue scanner causing IOwait:
--
--    DROP EXTENSION IF EXISTS pg_net CASCADE;
--
--    WARNING: this will drop net.http_request_queue and any
--    functions depending on it. Only run after all callers
--    have been switched to the new public.http_request_queue.
-- ============================================================
