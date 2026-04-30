-- Price cache for cron cold-start survival.
-- Vercel is stateless; prevPrices in-memory Map resets every invocation.
-- This table persists the last-seen price per symbol so crossing detection works.

CREATE TABLE IF NOT EXISTS cron_price_cache (
  symbol     text PRIMARY KEY,
  price      numeric NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Server-side only — no RLS needed
ALTER TABLE cron_price_cache DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON cron_price_cache TO service_role;
