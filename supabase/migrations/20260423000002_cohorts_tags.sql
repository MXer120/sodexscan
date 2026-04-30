-- Cohorts: named groups of wallets for comparison
CREATE TABLE IF NOT EXISTS wallet_cohorts (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  color      text DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wallet_cohorts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cohorts" ON wallet_cohorts
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS cohort_wallets (
  cohort_id      uuid REFERENCES wallet_cohorts(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  added_at       timestamptz DEFAULT now(),
  PRIMARY KEY (cohort_id, wallet_address)
);

ALTER TABLE cohort_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cohort wallets" ON cohort_wallets
  USING (EXISTS (SELECT 1 FROM wallet_cohorts c WHERE c.id = cohort_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM wallet_cohorts c WHERE c.id = cohort_id AND c.user_id = auth.uid()));

-- Tags: label wallets with custom text tags
CREATE TABLE IF NOT EXISTS wallet_tags (
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  tag            text NOT NULL,
  color          text DEFAULT '#6366f1',
  created_at     timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, wallet_address, tag)
);

ALTER TABLE wallet_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tags" ON wallet_tags
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_cohort_wallets_cohort ON cohort_wallets(cohort_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tags_user ON wallet_tags(user_id, wallet_address);
