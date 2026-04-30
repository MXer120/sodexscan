-- Drop the over-restrictive unique constraint that prevents multiple alerts
-- of the same type on the same target (e.g. two BTC price levels).
ALTER TABLE user_alert_settings
  DROP CONSTRAINT IF EXISTS user_alert_settings_user_id_type_target_key;

-- Add market column: 'perps' (default) or 'spot'
ALTER TABLE user_alert_settings
  ADD COLUMN IF NOT EXISTS market text NOT NULL DEFAULT 'perps'
  CHECK (market IN ('spot', 'perps'));
