-- Alert system: settings, notification channels, queue, history
-- v1: Telegram + Discord only. Schema is channel-extensible.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_type_enum') THEN
    CREATE TYPE alert_type_enum AS ENUM (
      'price_movement',
      'wallet_fill',
      'wallet_activity',
      'maintenance'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_status_enum') THEN
    CREATE TYPE alert_status_enum AS ENUM (
      'pending',
      'sending',
      'sent',
      'failed'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_alert_settings (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        alert_type_enum NOT NULL,
  target      text NOT NULL,           -- symbol (BTC-USDT) or wallet address
  thresholds  jsonb NOT NULL DEFAULT '{}',  -- {pct: 5} or {fill: true}
  channels    jsonb NOT NULL DEFAULT '{"telegram": true}',
  enabled     boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, type, target)
);

ALTER TABLE user_alert_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own alert settings"
  ON user_alert_settings
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Verified delivery channels per user
CREATE TABLE IF NOT EXISTS user_notification_channels (
  id           bigserial PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel      text NOT NULL CHECK (channel IN ('telegram', 'discord', 'email')),
  address      text NOT NULL,          -- Telegram chat_id, Discord webhook URL, or email
  verified_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, channel)
);

ALTER TABLE user_notification_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own channels"
  ON user_notification_channels
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Alert queue: pending → sending → sent|failed
CREATE TABLE IF NOT EXISTS alert_queue (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        alert_type_enum NOT NULL,
  payload     jsonb NOT NULL DEFAULT '{}',
  status      alert_status_enum NOT NULL DEFAULT 'pending',
  retries     smallint NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  sent_at     timestamptz
);

ALTER TABLE alert_queue ENABLE ROW LEVEL SECURITY;

-- Only service role reads/writes queue
CREATE POLICY "Service role manages alert queue"
  ON alert_queue
  USING (false)
  WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_alert_queue_status ON alert_queue(status) WHERE status = 'pending';

-- Alert history for dedup + rate-limiting
CREATE TABLE IF NOT EXISTS alert_history (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        alert_type_enum NOT NULL,
  target      text NOT NULL,
  channel     text NOT NULL,
  sent_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own alert history"
  ON alert_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_alert_history_dedup
  ON alert_history(user_id, type, target, sent_at DESC);

-- Telegram link tokens: short-lived token to bind chat_id to user
CREATE TABLE IF NOT EXISTS telegram_link_tokens (
  token      text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '15 minutes'
);

ALTER TABLE telegram_link_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own tokens"
  ON telegram_link_tokens FOR SELECT
  USING (auth.uid() = user_id);
