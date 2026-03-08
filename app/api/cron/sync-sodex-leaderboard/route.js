import { supabaseAdmin as supabase } from '../../../lib/supabaseServer'

const SODEX_LB_API = 'https://mainnet-data.sodex.dev/api/v1/leaderboard'
const PAGE_SIZE = 50
const CONCURRENCY = 10
const UPSERT_BATCH = 500

// Server-side cache: avoid re-fetching 90k items from Sodex API within 30min
let sodexCache = { items: null, timestamp: 0 }
const CACHE_TTL = 30 * 60 * 1000 // 30 min

async function fetchAllSodexItems() {
  // Return cached if fresh
  if (sodexCache.items && Date.now() - sodexCache.timestamp < CACHE_TTL) {
    return { items: sodexCache.items, fromCache: true }
  }

  const allItems = []
  const firstRes = await fetch(`${SODEX_LB_API}?window_type=ALL_TIME&page=1&page_size=${PAGE_SIZE}`)
  const firstData = await firstRes.json()
  if (firstData.code !== 0) throw new Error('Sodex API error: ' + firstData.message)

  allItems.push(...firstData.data.items)
  const totalPages = Math.ceil(firstData.data.total / PAGE_SIZE)

  for (let i = 2; i <= totalPages; i += CONCURRENCY) {
    const batch = []
    for (let j = i; j < i + CONCURRENCY && j <= totalPages; j++) {
      batch.push(
        fetch(`${SODEX_LB_API}?window_type=ALL_TIME&page=${j}&page_size=${PAGE_SIZE}`)
          .then(r => r.json())
          .then(d => (d.code === 0 && d.data?.items) ? d.data.items : [])
          .catch(() => [])
      )
    }
    const results = await Promise.all(batch)
    for (const items of results) allItems.push(...items)
  }

  sodexCache = { items: allItems, timestamp: Date.now() }
  return { items: allItems, fromCache: false }
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const { items: allItems, fromCache } = await fetchAllSodexItems()

    // Batch upsert into leaderboard via RPC
    let totalUpserted = 0
    for (let i = 0; i < allItems.length; i += UPSERT_BATCH) {
      const batch = allItems.slice(i, i + UPSERT_BATCH).map(item => ({
        account_id: item.account_id,
        wallet_address: item.wallet_address.toLowerCase(),
        sodex_total_volume: parseFloat(item.volume_usd) || 0,
        sodex_pnl: parseFloat(item.pnl_usd) || 0
      }))

      const { data, error } = await supabase.rpc('upsert_sodex_batch', { rows: batch })
      if (error) console.error('Upsert batch error:', error)
      else totalUpserted += data || 0
    }

    // Sync leaderboard → leaderboard_weekly week 0 so weekly LB has fresh sodex data
    const { data: syncResult, error: syncError } = await supabase.rpc('sync_current_week')
    if (syncError) console.error('sync_current_week error:', syncError)

    return Response.json({
      success: true,
      fetched: allItems.length,
      fromCache,
      upserted: totalUpserted,
      weekSync: syncResult
    })
  } catch (error) {
    console.error('Sync sodex leaderboard error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
