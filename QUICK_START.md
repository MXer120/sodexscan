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
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=REDACTED_SUPABASE_SERVICE_ROLE_KEY
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
      'Authorization', 'Bearer REDACTED_SUPABASE_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);
```
REDACTED_SUPABASE_SERVICE_ROLE_KEY



import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // ── Authentication check ────────────────────────────────────────────────
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or malformed Authorization header')
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing/invalid auth header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.split(' ')[1]
    const expectedServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!expectedServiceRole) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not set in environment')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (token !== expectedServiceRole) {
      console.error('Invalid service role token provided')
      return new Response(
        JSON.stringify({ error: 'Forbidden - invalid token' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Supabase client (admin privileges) ─────────────────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      expectedServiceRole
    )

    // ── Find starting point ─────────────────────────────────────────────────
    const { data: lastAccount, error: lastErr } = await supabase
      .from('leaderboard')
      .select('account_id')
      .order('account_id', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastErr) throw lastErr

    const startId = lastAccount?.account_id ? lastAccount.account_id + 1 : 1000
    let currentId = startId
    let newAccounts = 0
    let updated = 0
    const maxRetries = 80          // increased tolerance for gaps
    let consecutiveFailures = 0

    console.log(`Leaderboard sync started | from account_id ${startId}`)

    // ── Discover & sync new accounts ───────────────────────────────────────
    while (consecutiveFailures < maxRetries) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

        // 1. Get wallet address
        const addrRes = await fetch(
          `https://sodex.dev/mainnet/chain/user/${currentId}/address`,
          { signal: controller.signal }
        )
        clearTimeout(timeoutId)

        if (!addrRes.ok) throw new Error(`Address API ${addrRes.status}`)

        const addrData = await addrRes.json()
        if (addrData?.code !== 0 || !addrData?.data?.address) {
          consecutiveFailures++
          currentId++
          continue
        }

        const walletAddress = addrData.data.address

        // 2. Get PnL data
        const pnlRes = await fetch(
          `https://mainnet-data.sodex.dev/api/v1/perps/pnl/overview?account_id=${currentId}`,
          { signal: controller.signal }
        )

        if (!pnlRes.ok) throw new Error(`PnL API ${pnlRes.status}`)

        const pnlData = await pnlRes.json()
        if (pnlData?.code !== 0 || !pnlData?.data) {
          consecutiveFailures++
          currentId++
          continue
        }

        const {
          cumulative_pnl = '0',
          cumulative_quote_volume = '0',
          unrealized_pnl = '0',
          first_trade_ts_ms = null
        } = pnlData.data

        // Upsert new account
        const { error: upsertErr } = await supabase
          .from('leaderboard')
          .upsert({
            account_id: currentId,
            wallet_address: walletAddress,
            cumulative_pnl,
            cumulative_volume: cumulative_quote_volume,
            unrealized_pnl,
            first_trade_ts_ms,
            last_synced_at: new Date().toISOString()
          }, { onConflict: 'account_id' })

        if (upsertErr) throw upsertErr

        newAccounts++
        consecutiveFailures = 0
        console.log(`Synced new account ${currentId} (${walletAddress.slice(0, 8)}...)`)

        currentId++
      } catch (err) {
        console.error(`Error processing account ${currentId}:`, err.message)
        consecutiveFailures++
        currentId++
      }
    }

    // ── Update existing accounts (batched) ─────────────────────────────────
    const { data: existingAccounts, error: existErr } = await supabase
      .from('leaderboard')
      .select('account_id')

    if (existErr) throw existErr

    if (existingAccounts?.length > 0) {
      console.log(`Updating ${existingAccounts.length} existing accounts`)

      const BATCH_SIZE = 10
      for (let i = 0; i < existingAccounts.length; i += BATCH_SIZE) {
        const batch = existingAccounts.slice(i, i + BATCH_SIZE)

        await Promise.allSettled(
          batch.map(async (acc: { account_id: number }) => {
            try {
              const pnlRes = await fetch(
                `https://mainnet-data.sodex.dev/api/v1/perps/pnl/overview?account_id=${acc.account_id}`,
                { signal: AbortSignal.timeout(8000) }
              )

              if (!pnlRes.ok) throw new Error(`PnL ${pnlRes.status}`)

              const pnlData = await pnlRes.json()
              if (pnlData?.code !== 0 || !pnlData?.data) return

              const {
                cumulative_pnl = '0',
                cumulative_quote_volume = '0',
                unrealized_pnl = '0',
                first_trade_ts_ms = null
              } = pnlData.data

              const { error } = await supabase
                .from('leaderboard')
                .update({
                  cumulative_pnl,
                  cumulative_volume: cumulative_quote_volume,
                  unrealized_pnl,
                  first_trade_ts_ms,
                  last_synced_at: new Date().toISOString()
                })
                .eq('account_id', acc.account_id)

              if (error) throw error

              updated++
            } catch (err) {
              console.error(`Failed to update account ${acc.account_id}:`, err)
            }
          })
        )
      }
    }

    // ── Finalize: update ranks ─────────────────────────────────────────────
    const { error: rankErr } = await supabase.rpc('update_leaderboard_ranks')
    if (rankErr) throw rankErr

    const stats = {
      new_accounts: newAccounts,
      updated_accounts: updated,
      scanned_from: startId,
      scanned_to: currentId - 1,
      scanned_total: currentId - startId
    }

    console.log(`Sync completed | ${JSON.stringify(stats)}`)

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        stats
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Critical sync failure:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})




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
  -H "Authorization: Bearer REDACTED_SUPABASE_SERVICE_ROLE_KEY" \
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
