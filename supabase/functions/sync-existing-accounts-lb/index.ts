import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
)

const VERSION = '2026-03-11-v9'
const MAINNET_API = 'https://mainnet-data.sodex.dev/api/v1'
const SODEX_RANK_API = 'https://mainnet-data.sodex.dev/api/v1/leaderboard/rank'
const PROCESS_LIMIT = 150
const BATCH_SIZE = 10

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

// ── fetch both APIs for one account ─────────────────────

interface AccountRow {
  account_id: number
  wallet_address: string
}

interface SyncResult {
  account_id: number
  wallet_address: string
  // Futures (perps API)
  cumulative_pnl: string | null
  cumulative_volume: string | null
  unrealized_pnl: string | null
  first_trade_ts_ms: number | null
  // Sodex total (rank API)
  sodex_total_volume: number | null
  sodex_pnl: number | null
}

async function fetchAccount(acc: AccountRow): Promise<SyncResult> {
  // Parallel: perps API + Sodex rank API
  const [perpsRes, sodexRes] = await Promise.all([
    apiFetch(`${MAINNET_API}/perps/pnl/overview?account_id=${acc.account_id}`)
      .then(r => r.json())
      .catch(() => null),
    apiFetch(`${SODEX_RANK_API}?window_type=ALL_TIME&sort_by=volume&wallet_address=${acc.wallet_address}`)
      .then(r => r.json())
      .catch(() => null),
  ])

  // Futures data
  const d = perpsRes?.data
  const rawPnl = d?.cumulative_pnl ?? null
  const rawVol = d?.cumulative_quote_volume ?? null
  const rawUpnl = d?.unrealized_pnl ?? null
  const rawFts = d?.first_trade_ts_ms ?? null

  // Sodex combined data
  const sodexItem = (sodexRes?.code === 0 && sodexRes?.data?.found) ? sodexRes.data.item : null
  const sodexVol = sodexItem ? (parseFloat(sodexItem.volume_usd) || 0) : null
  const sodexPnl = sodexItem ? (parseFloat(sodexItem.pnl_usd) || 0) : null

  return {
    account_id: acc.account_id,
    wallet_address: acc.wallet_address,
    cumulative_pnl: (rawPnl && rawPnl !== '0') ? rawPnl : null,
    cumulative_volume: (rawVol && rawVol !== '0') ? rawVol : null,
    unrealized_pnl: (rawUpnl && rawUpnl !== '0') ? rawUpnl : null,
    first_trade_ts_ms: rawFts,
    sodex_total_volume: sodexVol,
    sodex_pnl: sodexPnl,
  }
}

// ── main ─────────────────────────────────────────────────

Deno.serve(async () => {
  const t0 = Date.now()
  try {
    // Fetch 150 accounts with oldest last_synced_at (nulls first = never synced)
    const { data: accounts, error: e1 } = await supabase
      .from('leaderboard')
      .select('account_id, wallet_address')
      .order('last_synced_at', { ascending: true, nullsFirst: true })
      .limit(PROCESS_LIMIT)
    if (e1) throw e1
    if (!accounts?.length) return json({ message: 'Empty leaderboard' })

    console.log(`Fetching ${accounts.length} oldest-synced accounts`)

    let errs = 0
    const futuresRows: Record<string, unknown>[] = []
    const sodexRows: Record<string, unknown>[] = []

    // Process in batches of 10 (parallel per batch)
    for (let i = 0; i < accounts.length; i += BATCH_SIZE) {
      const slice = accounts.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        slice.map((acc: AccountRow) => fetchAccount(acc))
      )

      for (const r of results) {
        if (r.status === 'rejected') { errs++; continue }
        const row = r.value

        // Futures batch
        futuresRows.push({
          account_id: row.account_id,
          wallet_address: row.wallet_address,
          cumulative_pnl: row.cumulative_pnl,
          cumulative_volume: row.cumulative_volume,
          unrealized_pnl: row.unrealized_pnl,
          first_trade_ts_ms: row.first_trade_ts_ms,
        })

        // Sodex batch (only if rank API returned data)
        if (row.sodex_total_volume !== null) {
          sodexRows.push({
            account_id: row.account_id,
            wallet_address: row.wallet_address,
            sodex_total_volume: row.sodex_total_volume,
            sodex_pnl: row.sodex_pnl,
          })
        }
      }

      // Small delay between batches to be nice to API
      if (i + BATCH_SIZE < accounts.length) await sleep(100)
    }

    // Batch upsert futures data (cascades to week 0)
    let futuresChanged = 0
    if (futuresRows.length > 0) {
      const { data, error } = await supabase.rpc('upsert_leaderboard_batch', { rows: futuresRows })
      if (error) { console.error('Futures RPC:', error.message); errs += futuresRows.length }
      else futuresChanged = data ?? 0
    }

    // Batch upsert sodex data (cascades to week 0)
    let sodexChanged = 0
    if (sodexRows.length > 0) {
      const { data, error } = await supabase.rpc('upsert_sodex_batch', { rows: sodexRows })
      if (error) { console.error('Sodex RPC:', error.message); errs += sodexRows.length }
      else sodexChanged = data ?? 0
    }

    const result = {
      version: VERSION,
      success: true,
      processed: accounts.length,
      futures: { changed: futuresChanged, total: futuresRows.length },
      sodex: { changed: sodexChanged, total: sodexRows.length },
      errors: errs,
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
