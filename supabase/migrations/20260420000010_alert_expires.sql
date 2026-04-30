-- Active-until expiry for alerts (null = unlimited, default 90 days from creation)
ALTER TABLE user_alert_settings
  ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT NULL;
