-- Extend alert_type_enum with new alert categories
-- Run after 20260420000004_alerts.sql

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

-- Optional label column for user-defined alert names
ALTER TABLE user_alert_settings ADD COLUMN IF NOT EXISTS label text;
