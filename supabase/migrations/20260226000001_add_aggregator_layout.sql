-- Add aggregator dashboard layout + widget configs to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS aggregator_layout JSONB DEFAULT NULL;
