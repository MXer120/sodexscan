-- Add show_zero_data preference to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_zero_data BOOLEAN DEFAULT false;

-- Create leaderboard_smart view that filters based on auth state and user preference
CREATE OR REPLACE VIEW leaderboard_smart AS
SELECT
  l.account_id,
  l.wallet_address,
  l.cumulative_pnl,
  l.cumulative_volume,
  l.unrealized_pnl,
  l.first_trade_ts_ms,
  l.pnl_rank,
  l.volume_rank,
  l.last_synced_at
FROM leaderboard l
LEFT JOIN profiles p ON p.id = auth.uid()
WHERE
  -- If not authenticated: only show non-zero data
  (auth.uid() IS NULL AND (l.cumulative_pnl != 0 OR l.cumulative_volume > 0))
  OR
  -- If authenticated and show_zero_data is true: show all
  (auth.uid() IS NOT NULL AND COALESCE(p.show_zero_data, false) = true)
  OR
  -- If authenticated and show_zero_data is false: only show non-zero data
  (auth.uid() IS NOT NULL AND COALESCE(p.show_zero_data, false) = false AND (l.cumulative_pnl != 0 OR l.cumulative_volume > 0));

-- Enable RLS on view (inherits from leaderboard table)
ALTER VIEW leaderboard_smart SET (security_barrier = true);

-- Grant public read access to the view
GRANT SELECT ON leaderboard_smart TO anon;
GRANT SELECT ON leaderboard_smart TO authenticated;
