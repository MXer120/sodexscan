# Deployment Checklist

Copy/paste this checklist and check off items as you go.

---

## Pre-Deployment

- [ ] Supabase project created
- [ ] Database schema applied (`supabase/schema.sql`)
- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Logged into Supabase CLI (`supabase login`)
- [ ] Project linked (`supabase link --project-ref YOUR_REF`)

---

## Supabase Edge Function

- [ ] Edge function deployed: `supabase functions deploy sync-all`
- [ ] Secrets set:
  ```bash
  supabase secrets set SUPABASE_URL=https://YOUR_REF.supabase.co
  supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
  ```
- [ ] Test function manually:
  ```bash
  curl -X POST https://YOUR_REF.supabase.co/functions/v1/sync-all \
    -H "Authorization: Bearer YOUR_SERVICE_KEY"
  ```
- [ ] Response shows `"success": true`

---

## Supabase Cron Job

- [ ] Run in Supabase SQL Editor:
  ```sql
  create extension if not exists pg_cron;

  select cron.schedule(
    'sync-all-data',
    '*/15 * * * *',
    $$
    select net.http_post(
      url := 'https://YOUR_REF.supabase.co/functions/v1/sync-all',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
    $$
  );
  ```
- [ ] Verify cron created: `select * from cron.job;`
- [ ] Job shows `sync-all-data` with schedule `*/15 * * * *`

---

## Vercel Deployment

- [ ] Code committed:
  ```bash
  git add .
  git commit -m "Migrate to Supabase Edge Functions"
  git push origin main
  ```
- [ ] Vercel project connected to GitHub repo
- [ ] Environment variables set (all 3 environments):
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` = `https://YOUR_REF.supabase.co`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGc...`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` = `eyJhbGc...`
- [ ] Deployment triggered (auto or manual)
- [ ] Build succeeded
- [ ] Site live at `https://your-app.vercel.app`

---

## Verification (15 minutes after deployment)

- [ ] Check cron ran:
  ```sql
  select * from cron.job_run_details
  where jobid = (select jobid from cron.job where jobname = 'sync-all-data')
  order by start_time desc limit 5;
  ```
- [ ] At least 1 run shows status `succeeded`

- [ ] Check data in tables:
  ```sql
  select count(*) from account_mapping;    -- Should be > 0
  select count(*) from leaderboard;        -- Should be > 0
  select count(*) from open_positions;     -- Should be > 0
  ```

- [ ] Visit site: `https://your-app.vercel.app/mainnet`
- [ ] Click **⚙** button (bottom right)
- [ ] Debug panel opens
- [ ] All 7 items show:
  - [ ] Green ✓ (or yellow ⚠ if < 15min old)
  - [ ] Count > 0
  - [ ] Last sync time < 20 min

- [ ] Click **↻ Refresh** button
- [ ] Wait 30 seconds
- [ ] Counts/times update

---

## Final Checks

- [ ] Leaderboard shows data (User tab)
- [ ] Top 10 Gainers/Losers visible
- [ ] Search wallet works
- [ ] Platform tab shows charts
- [ ] No console errors (F12 → Console)

---

## Troubleshooting (if any checks fail)

### Cron not running?
```sql
-- Check cron extension enabled
select * from pg_extension where extname = 'pg_cron';

-- If not, enable it:
create extension if not exists pg_cron;
```

### No data in tables?
```bash
# Manually trigger sync
curl -X POST https://YOUR_REF.supabase.co/functions/v1/sync-all \
  -H "Authorization: Bearer YOUR_SERVICE_KEY" \
  -H "Content-Type: application/json"

# Check response
```

### Debug panel shows errors?
- Check Edge Function logs: Supabase Dashboard → Edge Functions → sync-all → Logs
- Verify secrets set: `supabase secrets list`
- Test API reachable: `curl https://mainnet-data.sodex.dev/api/v1/account/1000000/info`

### Vercel build failed?
```bash
# Locally
rm -rf node_modules package-lock.json
npm install
npm run build

# If works, commit and push
git add .
git commit -m "Fix build"
git push
```

---

## Post-Deployment

- [ ] Monitor debug panel for 1 hour
- [ ] Confirm syncs run every 15 minutes
- [ ] Check Supabase usage dashboard (should be minimal)
- [ ] Bookmark debug panel URL for monitoring

---

## Success Criteria

✅ All checks passed
✅ Data refreshing every 15 min
✅ Debug panel shows green ✓
✅ Frontend displays leaderboard & charts
✅ No errors in logs

**Deployment complete!** 🎉

---

## Need Help?

- [QUICK_START.md](./QUICK_START.md) - 5-step guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Full documentation
- [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md) - What changed & why
