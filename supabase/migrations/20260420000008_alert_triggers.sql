-- Expand alert_type_enum to include all types the UI supports
ALTER TYPE alert_type_enum ADD VALUE IF NOT EXISTS 'price_level';
ALTER TYPE alert_type_enum ADD VALUE IF NOT EXISTS 'new_listing';
ALTER TYPE alert_type_enum ADD VALUE IF NOT EXISTS 'new_incoming';
ALTER TYPE alert_type_enum ADD VALUE IF NOT EXISTS 'wallet_deposit';
ALTER TYPE alert_type_enum ADD VALUE IF NOT EXISTS 'wallet_withdrawal';
ALTER TYPE alert_type_enum ADD VALUE IF NOT EXISTS 'position_open';
ALTER TYPE alert_type_enum ADD VALUE IF NOT EXISTS 'position_close';
ALTER TYPE alert_type_enum ADD VALUE IF NOT EXISTS 'order_placed';
ALTER TYPE alert_type_enum ADD VALUE IF NOT EXISTS 'order_cancelled';
ALTER TYPE alert_type_enum ADD VALUE IF NOT EXISTS 'daily_pnl';
ALTER TYPE alert_type_enum ADD VALUE IF NOT EXISTS 'weekly_pnl';
ALTER TYPE alert_type_enum ADD VALUE IF NOT EXISTS 'total_pnl';
ALTER TYPE alert_type_enum ADD VALUE IF NOT EXISTS 'sodex_announcement';

-- Trigger frequency: max_triggers=null → unlimited, 1 → once, N → N times
ALTER TABLE user_alert_settings
  ADD COLUMN IF NOT EXISTS max_triggers int DEFAULT NULL;

-- Running fire count tracked by the cron
ALTER TABLE user_alert_settings
  ADD COLUMN IF NOT EXISTS fire_count int NOT NULL DEFAULT 0;
