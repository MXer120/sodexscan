-- Full aggregator support: profiles columns, helper functions,
-- global_templates, and RLS. Safe to run multiple times.

-- ── Profile columns ───────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role              TEXT    DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS aggregator_layout JSONB   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS color_scheme      TEXT    DEFAULT 'cyan',
  ADD COLUMN IF NOT EXISTS theme_mode        TEXT    DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS bullish_color     TEXT    DEFAULT '#22c55e',
  ADD COLUMN IF NOT EXISTS bearish_color     TEXT    DEFAULT '#ef4444',
  ADD COLUMN IF NOT EXISTS accent_color      TEXT    DEFAULT '#1230B7',
  ADD COLUMN IF NOT EXISTS auto_sync_colors  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS own_wallet        TEXT    DEFAULT '';

-- Supports: user | mod | owner  (TEXT — no constraint on color_scheme so cli/nsa work freely)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'mod', 'owner'));

-- ── Helper functions ──────────────────────────────────────────────────────────
-- SECURITY DEFINER bypasses RLS inside the function to avoid recursion.

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_mod()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('mod', 'owner')
  );
$$;

-- ── Global Templates ──────────────────────────────────────────────────────────
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

DROP POLICY IF EXISTS "global_templates_read"         ON public.global_templates;
DROP POLICY IF EXISTS "global_templates_owner_write"  ON public.global_templates;

CREATE POLICY "global_templates_read"
  ON public.global_templates FOR SELECT USING (true);

CREATE POLICY "global_templates_owner_write"
  ON public.global_templates FOR ALL USING (is_owner());

-- ── Profile RLS ───────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ── handle_new_user: initialize all defaults on signup ───────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, color_scheme, theme_mode, own_wallet)
  VALUES (NEW.id, NEW.email, 'user', 'cyan', 'dark', '')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
