-- sync-existing-accounts: */2 → every 1 min
SELECT cron.unschedule('sync-existing-accounts');
SELECT cron.schedule(
  'sync-existing-accounts',
  '* * * * *',
  'SELECT call_sync_existing_accounts()'
);

-- sync-new-accounts: */5 → every 15 min
SELECT cron.unschedule('sync-new-accounts');
SELECT cron.schedule(
  'sync-new-accounts',
  '*/15 * * * *',
  'SELECT call_sync_new_accounts()'
);
