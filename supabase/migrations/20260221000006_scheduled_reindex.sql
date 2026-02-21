-- Schedule daily REINDEX to prevent index bloat
-- Postgres B-tree indexes grow but never shrink from autovacuum.
-- With constant update churn (~3/sec), indexes bloat ~3x/day.
-- REINDEX CONCURRENTLY rebuilds without blocking reads/writes.
SELECT cron.schedule(
  'reindex-leaderboard',
  '0 4 * * *',
  $$REINDEX TABLE CONCURRENTLY leaderboard$$
);
