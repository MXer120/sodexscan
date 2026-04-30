-- SoSoValue API cache table
-- Stores proxied SoSoValue API responses to stay within 20 req/min free-tier limit.
-- RLS: public read (anon), service-role write only.

CREATE TABLE IF NOT EXISTS sosovalue_cache (
  module      text NOT NULL,
  key         text NOT NULL,
  payload     jsonb NOT NULL DEFAULT '{}',
  fetched_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (module, key)
);

ALTER TABLE sosovalue_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read sosovalue_cache"
  ON sosovalue_cache FOR SELECT
  USING (true);

-- Only service role can write (enforced by anon not having INSERT/UPDATE/DELETE grants)
