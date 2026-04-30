-- Add payload column to alert_history so in-app notifications can show price details
ALTER TABLE alert_history
  ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}';

-- Enable Realtime on alert_history so the client can subscribe to new notifications
ALTER TABLE alert_history REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE alert_history;
