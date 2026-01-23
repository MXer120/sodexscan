-- Add own_wallet field to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS own_wallet TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_own_wallet ON profiles(own_wallet) WHERE own_wallet IS NOT NULL;
