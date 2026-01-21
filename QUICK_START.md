# Quick Start Guide

## Deploy in 5 Steps

### 1. Setup Supabase Database
```sql
-- Run this in Supabase SQL Editor
-- Copy from: supabase/schema.sql
```

### 2. Deploy Edge Function (Optional - skip if already done)
```bash
# Use npx (no install needed)
npx supabase login
npx supabase link --project-ref yifkydhsbflzfprteots
npx supabase functions deploy sync-all
npx supabase secrets set SUPABASE_URL=https://yifkydhsbflzfprteots.supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZmt5ZGhzYmZsemZwcnRlb3RzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODk5MjU0NywiZXhwIjoyMDg0NTY4NTQ3fQ.ySGaIpjs5BeV9oKmAC8cbeoK6-KUZLvTey3EHzKnzto
```

**Note:** You mentioned skipping this step - if Edge Function already deployed, skip to Step 3.

### 3. Schedule Cron (Supabase SQL Editor)
```sql
create extension if not exists pg_cron;

select cron.schedule(
  'sync-all-data',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://yifkydhsbflzfprteots.supabase.co/functions/v1/sync-all',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZmt5ZGhzYmZsemZwcnRlb3RzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODk5MjU0NywiZXhwIjoyMDg0NTY4NTQ3fQ.ySGaIpjs5BeV9oKmAC8cbeoK6-KUZLvTey3EHzKnzto'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### 3.5 Verify Cron & Manually Trigger First Sync
```sql
-- Verify cron created
select * from cron.job;

-- Check if http extension exists
select * from pg_extension where extname = 'http';

-- If not, enable it (required for net.http_post)
create extension if not exists http with schema extensions;
```

Then manually trigger first sync:
```bash
curl -X POST https://yifkydhsbflzfprteots.supabase.co/functions/v1/sync-all \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZmt5ZGhzYmZsemZwcnRlb3RzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODk5MjU0NywiZXhwIjoyMDg0NTY4NTQ3fQ.ySGaIpjs5BeV9oKmAC8cbeoK6-KUZLvTey3EHzKnzto" \
  -H "Content-Type: application/json"
```

Wait 2-3 mins, then verify data:
```sql
select count(*) from account_mapping;
select count(*) from leaderboard;
```

### 4. Deploy to Vercel
```bash
git add .
git commit -m "Deploy with Supabase sync"
git push origin main
```

### 5. Set Vercel Env Vars
Vercel Dashboard → Settings → Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL = https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY = eyJhbGc...
```

Apply to: **All environments** (Dev, Preview, Production)

---

## Verify

1. **Check cron:** `select * from cron.job;` (should show `sync-all-data`)
2. **Check data:** `select count(*) from account_mapping;` (should be > 0 after 15min)
3. **Check UI:** Go to your site → Click **⚙** (bottom right) → See green ✓ for all syncs

---

## What Changed

### ❌ Removed:
- All Vercel cron jobs (vercel.json now empty)
- Unused dependencies (cors, express, papaparse, concurrently)
- Unused scripts (server, tracker)
- CSV files (data now in Supabase)

### ✅ Added:
- Supabase Edge Function (`supabase/functions/sync-all/`)
- Debug panel (⚙ button bottom right)
- Manual sync API (`/api/sync`)

---

## Environment Variables

| Variable | Where | Env | Required |
|----------|-------|-----|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel | All | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel | All | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel + Supabase Secrets | All | ✅ |

Get from: **Supabase Dashboard → Settings → API**

---

## Troubleshooting

### No data after 15 minutes?
```bash
# Manually trigger sync
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-all \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### Debug panel shows errors?
1. Check Supabase logs: Dashboard → Edge Functions → sync-all → Logs
2. Verify cron running: `select * from cron.job_run_details order by start_time desc limit 5;`
3. Check env vars set correctly in Vercel

### Build fails?
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## Cost: $0/month

- ✅ Vercel Hobby: Free
- ✅ Supabase Free: 500MB DB, 500K function invocations
- ✅ Usage: ~3K function calls/month (well under limit)

---

## Full Docs

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed guide.
