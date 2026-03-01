-- Add theme preference columns to profiles
-- Using TEXT with no check constraint to support all current and future schemes (including cli, nsa)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS color_scheme TEXT DEFAULT 'cyan',
  ADD COLUMN IF NOT EXISTS theme_mode TEXT DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS bullish_color TEXT DEFAULT '#22c55e',
  ADD COLUMN IF NOT EXISTS bearish_color TEXT DEFAULT '#ef4444',
  ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#1230B7',
  ADD COLUMN IF NOT EXISTS auto_sync_colors BOOLEAN DEFAULT false;
