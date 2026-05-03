-- AI chat history + usage log

-- ── Chat history ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_chat_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT,
  messages    JSONB NOT NULL DEFAULT '[]'::jsonb,
  model       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ai_chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own chats"
  ON ai_chat_history
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX ai_chat_history_user_updated
  ON ai_chat_history(user_id, updated_at DESC);

-- ── Usage log ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id                BIGSERIAL PRIMARY KEY,
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  model             TEXT NOT NULL,
  prompt_tokens     INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  total_tokens      INT NOT NULL DEFAULT 0,
  finish_reason     TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

-- Service role can insert; users can only see their own rows
CREATE POLICY "service role inserts usage"
  ON ai_usage_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "users read own usage"
  ON ai_usage_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX ai_usage_log_user_at
  ON ai_usage_log(user_id, created_at DESC);

-- ── Updated-at trigger for chat_history ──────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER ai_chat_history_updated_at
  BEFORE UPDATE ON ai_chat_history
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
