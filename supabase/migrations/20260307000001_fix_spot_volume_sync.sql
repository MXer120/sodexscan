-- Fix: sync-sodex-leaderboard cron fails with "Missing vault secrets APP_URL or CRON_SECRET"
-- Root cause: vault secrets APP_URL and CRON_SECRET were never added.
-- The sodex sync never ran → sodex_total_volume stayed 0 → spot volume = 0.
--
-- Also increases sync frequency from hourly → every 15 min.

-- ============================================================
-- 1. Add missing vault secrets
-- ============================================================
SELECT vault.create_secret(
  'https://www.communityscan-sodex.com',
  'APP_URL'
);

-- IMPORTANT: You must also add CRON_SECRET via Supabase Dashboard:
--   Project Settings → Vault → New Secret
--   Name: CRON_SECRET
--   Value: (same as CRON_SECRET env var in Vercel)
-- Without it, the sync endpoint returns 401.

-- ============================================================
-- 2. Reschedule Sodex sync: hourly → every 15 min
-- ============================================================
SELECT cron.unschedule('sync-sodex-leaderboard');
SELECT cron.schedule(
  'sync-sodex-leaderboard',
  '*/15 * * * *',
  'SELECT call_sync_sodex_leaderboard()'
);

-- ============================================================
-- 3. Force re-sync current week with whatever data exists
-- ============================================================
SELECT sync_current_week();
