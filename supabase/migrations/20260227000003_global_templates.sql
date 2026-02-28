-- ── Global Templates ──────────────────────────────────────────────
-- Owner-managed templates visible to all users in the aggregator.

CREATE TABLE IF NOT EXISTS public.global_templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  icon        TEXT        NOT NULL DEFAULT '📋',
  description TEXT        NOT NULL DEFAULT '',
  layouts     JSONB       NOT NULL DEFAULT '{"lg":[],"md":[],"sm":[]}',
  widgets     JSONB       NOT NULL DEFAULT '{}',
  sort_order  INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.global_templates ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anon) can read global templates
CREATE POLICY "global_templates_read" ON public.global_templates
  FOR SELECT USING (true);

-- Only owners can write
CREATE POLICY "global_templates_owner_write" ON public.global_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- ── Owner role ────────────────────────────────────────────────────
-- Expand role check constraint to include 'owner'.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'mod', 'owner'));

-- Set the owner role for the designated account.
UPDATE public.profiles
SET role = 'owner'
WHERE id IN (
  SELECT p.id FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE LOWER(u.email) = LOWER('no-reply-Error@outlook.com')
);
