import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
)

const VERSION = '2026-03-10-v8'
const MAINNET_API = 'https://mainnet-data.sodex.dev/api/v1'
const PROCESS_LIMIT = 100
const CONCURRENCY = 3

// ── helpers ──────────────────────────────────────────────

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function apiFetch(url: string): Promise<Response> {
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(15000) })
      if (r.ok) return r
      if (r.status === 429) { await sleep(2000 * (i + 1)); continue }
      throw new Error(`HTTP ${r.status}`)
    } catch (e) {
      if (i === 4) throw e
      await sleep(1000 * (i + 1))
    }
  }
  throw new Error('unreachable')
}

// ── main ─────────────────────────────────────────────────

Deno.serve(async () => {
  const t0 = Date.now()
  try {
    // Fetch accounts with oldest last_synced_at (nulls first = never synced)
    const { data: accounts, error: e1 } = await supabase
      .from('leaderboard')
      .select('account_id, wallet_address, cumulative_pnl, cumulative_volume, unrealized_pnl, first_trade_ts_ms')
      .order('last_synced_at', { ascending: true, nullsFirst: true })
      .limit(PROCESS_LIMIT)
    if (e1) throw e1
    if (!accounts?.length) return json({ message: 'Empty leaderboard' })

    const ids = accounts.map((a: { account_id: number }) => a.account_id)
    console.log(`Fetched ${accounts.length} oldest-synced accounts [${ids[0]}..${ids[ids.length - 1]}]`)

    let errs = 0
    const batchRows: Record<string, unknown>[] = []
    const diag: Record<string, unknown>[] = []

    // Fetch API data for all accounts, collect rows for single batch upsert
    for (let i = 0; i < accounts.length; i += CONCURRENCY) {
      const slice = accounts.slice(i, i + CONCURRENCY)
      await Promise.all(slice.map(async (acc) => {
        try {
          const res = await apiFetch(
            `${MAINNET_API}/perps/pnl/overview?account_id=${acc.account_id}`
          )
          const body = await res.json()
          const d = body?.data

          const rawPnl = d?.cumulative_pnl ?? null
          const rawVol = d?.cumulative_quote_volume ?? null
          const rawUpnl = d?.unrealized_pnl ?? null
          const rawFts = d?.first_trade_ts_ms ?? null

          if (diag.length < 10) {
            diag.push({
              id: acc.account_id,
              api: { pnl: rawPnl, vol: rawVol, upnl: rawUpnl, fts: rawFts },
              db: {
                pnl: acc.cumulative_pnl,
                vol: acc.cumulative_volume,
                upnl: acc.unrealized_pnl,
                fts: acc.first_trade_ts_ms,
                pnl_type: typeof acc.cumulative_pnl,
              },
            })
          }

          batchRows.push({
            account_id: acc.account_id,
            wallet_address: acc.wallet_address,
            cumulative_pnl: (rawPnl && rawPnl !== '0') ? rawPnl : null,
            cumulative_volume: (rawVol && rawVol !== '0') ? rawVol : null,
            unrealized_pnl: (rawUpnl && rawUpnl !== '0') ? rawUpnl : null,
            first_trade_ts_ms: rawFts,
          })
        } catch (err) {
          console.error(`Fetch ${acc.account_id}:`, (err as Error).message)
          errs++
        }
      }))

      if (i + CONCURRENCY < accounts.length) await sleep(200)
    }

    // Single batch upsert (upsert_leaderboard_batch sets last_synced_at = now())
    let changed = 0
    if (batchRows.length > 0) {
      const { data: touched, error } = await supabase.rpc(
        'upsert_leaderboard_batch',
        { rows: batchRows }
      )
      if (error) {
        console.error('Batch RPC error:', error.message)
        errs += batchRows.length
      } else {
        changed = touched ?? 0
      }
    }

    const result = {
      version: VERSION,
      success: true,
      processed: accounts.length,
      changed,
      unchanged: batchRows.length - changed,
      errors: errs,
      diagnostics: diag,
      ms: Date.now() - t0,
    }

    console.log(JSON.stringify(result))
    return json(result)
  } catch (err) {
    console.error('FATAL:', (err as Error).message)
    return json({ error: (err as Error).message }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
