-- Add updated_at to user_alert_settings for accurate 90-day disabled-alert cleanup.
ALTER TABLE user_alert_settings
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE user_alert_settings SET updated_at = created_at WHERE updated_at = now();

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_alert_settings_updated_at ON user_alert_settings;
CREATE TRIGGER user_alert_settings_updated_at
  BEFORE UPDATE ON user_alert_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
