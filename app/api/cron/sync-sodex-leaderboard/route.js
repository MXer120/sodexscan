import { supabaseAdmin as supabase } from '../../../lib/supabaseServer'

const SODEX_LB_API = 'https://mainnet-data.sodex.dev/api/v1/leaderboard'
const PAGE_SIZE = 50
const BATCH_PAGES = 3       // 3 pages × 50 = 150 items per run
const CONCURRENCY = 3
const UPSERT_BATCH = 150

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    // Get current offset from meta
    const { data: meta } = await supabase
      .from('leaderboard_meta')
      .select('sodex_sync_offset')
      .eq('id', 1)
      .single()
    let offset = meta?.sodex_sync_offset || 0

    // Fetch page 1 (or first page of batch) to get total count
    const probeRes = await fetch(`${SODEX_LB_API}?window_type=ALL_TIME&page=1&pageSize=1`)
    const probeData = await probeRes.json()
    if (probeData.code !== 0) throw new Error('Sodex API error: ' + probeData.message)
    const totalItems = probeData.data.total
    const totalPages = Math.ceil(totalItems / PAGE_SIZE)

    // Calculate page range for this batch
    let startPage = Math.floor(offset / PAGE_SIZE) + 1
    if (startPage > totalPages) {
      startPage = 1
      offset = 0
    }
    const endPage = Math.min(startPage + BATCH_PAGES - 1, totalPages)

    // Fetch pages in parallel batches
    const allItems = []
    for (let i = startPage; i <= endPage; i += CONCURRENCY) {
      const fetches = []
      for (let j = i; j < i + CONCURRENCY && j <= endPage; j++) {
        fetches.push(
          fetch(`${SODEX_LB_API}?window_type=ALL_TIME&page=${j}&pageSize=${PAGE_SIZE}`)
            .then(r => r.json())
            .then(d => (d.code === 0 && d.data?.items) ? d.data.items : [])
            .catch(() => [])
        )
      }
      const results = await Promise.all(fetches)
      for (const items of results) allItems.push(...items)
    }

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

    // Update offset — wrap around when done
    const newOffset = endPage >= totalPages ? 0 : endPage * PAGE_SIZE
    await supabase
      .from('leaderboard_meta')
      .update({ sodex_sync_offset: newOffset })
      .eq('id', 1)

    return Response.json({
      success: true,
      totalItems,
      fetched: allItems.length,
      pages: `${startPage}-${endPage}/${totalPages}`,
      upserted: totalUpserted,
      wrapped: endPage >= totalPages
    })
  } catch (error) {
    console.error('Sync sodex leaderboard error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
