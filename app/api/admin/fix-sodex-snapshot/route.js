import { supabaseAdmin as supabase } from '../../../lib/supabaseServer'

const SODEX_LB_API = 'https://mainnet-data.sodex.dev/api/v1/leaderboard'
const PAGE_SIZE = 50
const CONCURRENCY = 10

/**
 * One-time snapshot fix: set prev_week.sodex = all_time - 24h
 * Uses batch RPC to avoid Vercel function timeout.
 */
export async function POST(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    // 1. Get prev week number
    const { data: meta } = await supabase
      .from('leaderboard_meta')
      .select('current_week_number')
      .eq('id', 1)
      .single()
    const prevWeek = (meta?.current_week_number || 1) - 1
    if (prevWeek < 1) {
      return Response.json({ error: 'No previous week to fix' }, { status: 400 })
    }

    // 2. Fetch ALL pages of 24h LB
    const allItems24h = []
    const firstRes = await fetch(`${SODEX_LB_API}?window_type=24H&page=1&page_size=${PAGE_SIZE}`)
    const firstData = await firstRes.json()
    if (firstData.code !== 0) throw new Error('Sodex 24H API error: ' + firstData.message)
    allItems24h.push(...firstData.data.items)
    const totalPages = Math.ceil(firstData.data.total / PAGE_SIZE)

    for (let i = 2; i <= totalPages; i += CONCURRENCY) {
      const batch = []
      for (let j = i; j < i + CONCURRENCY && j <= totalPages; j++) {
        batch.push(
          fetch(`${SODEX_LB_API}?window_type=24H&page=${j}&page_size=${PAGE_SIZE}`)
            .then(r => r.json())
            .then(d => (d.code === 0 && d.data?.items) ? d.data.items : [])
            .catch(() => [])
        )
      }
      const results = await Promise.all(batch)
      for (const items of results) allItems24h.push(...items)
    }

    // 3. Build lookup: account_id → 24h values
    const lookup24h = {}
    for (const item of allItems24h) {
      lookup24h[item.account_id] = {
        volume: parseFloat(item.volume_usd) || 0,
        pnl: parseFloat(item.pnl_usd) || 0
      }
    }

    // 4. Get ALL current ALL_TIME sodex values (paginate)
    const allTimeRows = []
    let from = 0
    while (true) {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('account_id, sodex_total_volume, sodex_pnl')
        .gt('sodex_total_volume', 0)
        .range(from, from + 999)
      if (error) throw error
      if (!data || data.length === 0) break
      allTimeRows.push(...data)
      if (data.length < 1000) break
      from += 1000
    }

    // 5. Compute snapshots and batch-update via RPC
    let totalUpdated = 0
    const BATCH = 500
    const updates = allTimeRows.map(row => {
      const h24 = lookup24h[row.account_id]
      const allTimeVol = parseFloat(row.sodex_total_volume)
      const allTimePnl = parseFloat(row.sodex_pnl)
      return {
        account_id: row.account_id,
        sodex_total_volume: h24 ? Math.max(allTimeVol - h24.volume, 0) : allTimeVol,
        sodex_pnl: h24 ? allTimePnl - h24.pnl : allTimePnl
      }
    })

    for (let i = 0; i < updates.length; i += BATCH) {
      const batch = updates.slice(i, i + BATCH)
      const { data, error } = await supabase.rpc('fix_weekly_sodex_snapshot', {
        p_week: prevWeek,
        rows: batch
      })
      if (error) console.error('Batch error:', error)
      else totalUpdated += data || 0
    }

    // 6. Refresh week 0
    await supabase.rpc('sync_current_week')

    return Response.json({
      success: true,
      prevWeek,
      fetched24h: allItems24h.length,
      allTimeAccounts: allTimeRows.length,
      updatedSnapshots: totalUpdated
    })
  } catch (error) {
    console.error('Fix sodex snapshot error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
