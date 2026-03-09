-- Performance fixes: RLS initplan, duplicate index, unused indexes, missing index

-- ============================================================
-- 1) Fix auth_rls_initplan: wrap auth.uid() in (select ...)
--    Prevents per-row re-evaluation, identical logic
-- ============================================================

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- ticket_stars
DROP POLICY IF EXISTS "Mods can view own stars" ON public.ticket_stars;
CREATE POLICY "Mods can view own stars" ON public.ticket_stars
  FOR SELECT USING ((select auth.uid()) = user_id AND public.is_mod());

DROP POLICY IF EXISTS "Mods can insert stars" ON public.ticket_stars;
CREATE POLICY "Mods can insert stars" ON public.ticket_stars
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id AND public.is_mod());

DROP POLICY IF EXISTS "Mods can delete own stars" ON public.ticket_stars;
CREATE POLICY "Mods can delete own stars" ON public.ticket_stars
  FOR DELETE USING ((select auth.uid()) = user_id AND public.is_mod());

-- ============================================================
-- 2) Drop duplicate index on spot_volume_snapshots
-- ============================================================
DROP INDEX IF EXISTS public.idx_spot_snapshots_week;

-- ============================================================
-- 3) Drop unused indexes
-- ============================================================
DROP INDEX IF EXISTS public.idx_weekly_pnl_rank;
DROP INDEX IF EXISTS public.idx_weekly_vol_rank;
DROP INDEX IF EXISTS public.idx_sync_queue_fetched;
DROP INDEX IF EXISTS public.idx_leaderboard_nontraders;
DROP INDEX IF EXISTS public.idx_group_stats_daily_group_id;
DROP INDEX IF EXISTS public.idx_tickets_assigned;
DROP INDEX IF EXISTS public.idx_http_queue_pending;
DROP INDEX IF EXISTS public.idx_tickets_status;

-- ============================================================
-- 4) Add missing index on user_stats_daily.user_id FK
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_stats_daily_user_id
  ON public.user_stats_daily(user_id);
