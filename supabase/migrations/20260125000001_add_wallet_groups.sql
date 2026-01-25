-- Add group support to wallet_tags table
-- Groups are stored as rows with is_group = true
-- Wallet tags can reference a group via group_name

-- Add new columns for group support
ALTER TABLE wallet_tags ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT false;
ALTER TABLE wallet_tags ADD COLUMN IF NOT EXISTS group_name TEXT;
ALTER TABLE wallet_tags ADD COLUMN IF NOT EXISTS group_color TEXT;

-- For group rows (is_group = true):
--   - wallet_address can be empty string (groups don't have wallet)
--   - tag_name should be empty (groups use group_name instead)
--   - group_name = the group's label (unique per user)
--   - group_color = one of 10 preset colors

-- For wallet+tag rows (is_group = false):
--   - wallet_address = the wallet
--   - tag_name = the tag label
--   - group_name = name of assigned group (nullable, references a group row)
--   - group_color = null (color comes from the group)

-- Create index for efficient group queries
CREATE INDEX IF NOT EXISTS idx_wallet_tags_group ON wallet_tags(user_id, is_group);
CREATE INDEX IF NOT EXISTS idx_wallet_tags_group_name ON wallet_tags(user_id, group_name);

-- Add unique constraint for group names per user (only for group rows)
-- Note: This is handled in application logic since partial unique indexes
-- require proper setup. We'll enforce uniqueness in the UI.
