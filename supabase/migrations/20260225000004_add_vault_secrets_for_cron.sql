-- Add vault secrets for edge function cron invocation
-- These are used by call_sync_existing_accounts() and call_sync_new_accounts()
SELECT vault.create_secret(
  'https://yifkydhsbflzfprteots.supabase.co',
  'SUPABASE_URL'
);

SELECT vault.create_secret(
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZmt5ZGhzYmZsemZwcnRlb3RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5OTI1NDcsImV4cCI6MjA4NDU2ODU0N30.1AcXhJsis40LU1O8xbLgzY-jGzFcBrF28eGVHYzDXDA',
  'SUPABASE_ANON_KEY'
);
