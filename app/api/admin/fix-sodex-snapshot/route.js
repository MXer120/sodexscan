import { supabaseAdmin as supabase } from '../../../lib/supabaseServer'

const SODEX_LB_API = 'https://mainnet-data.sodex.dev/api/v1/leaderboard'
const PAGE_SIZE = 50
const CONCURRENCY = 10

/**
 * One-time fix: set prev_week snapshot's sodex values so weekly deltas are correct.
 *
 * Logic: prev_week.sodex_total_volume = current_all_time - 24h_volume
 * This means: weekly_delta = current_all_time - (current_all_time - 24h) = 24h_value
 * As the week progresses, current_all_time grows, and deltas stay accurate.
 */
export async function POST(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    // 1. Get current week number → prev week to fix
    const { data: meta } = await supabase
      .from('leaderboard_meta')
      .select('current_week_number')
      .eq('id', 1)
      .single()
    const prevWeek = (meta?.current_week_number || 1) - 1
    if (prevWeek < 1) {
      return Response.json({ error: 'No previous week to fix' }, { status: 400 })
    }

    // 2. Fetch 24h LB from sodex API
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

    // 3. Build lookup: account_id → { 24h_volume, 24h_pnl }
    const lookup24h = {}
    for (const item of allItems24h) {
      lookup24h[item.account_id] = {
        volume: parseFloat(item.volume_usd) || 0,
        pnl: parseFloat(item.pnl_usd) || 0
      }
    }

    // 4. Get current ALL_TIME sodex values from leaderboard
    const { data: allTimeRows, error: atErr } = await supabase
      .from('leaderboard')
      .select('account_id, sodex_total_volume, sodex_pnl')
      .gt('sodex_total_volume', 0)
    if (atErr) throw atErr

    // 5. Compute snapshot values: prev_week.sodex = all_time - 24h
    let updated = 0
    const BATCH = 500
    const updates = []

    for (const row of (allTimeRows || [])) {
      const h24 = lookup24h[row.account_id]
      const snapshotVol = h24
        ? Math.max(parseFloat(row.sodex_total_volume) - h24.volume, 0)
        : parseFloat(row.sodex_total_volume) // no 24h data → assume 0 weekly activity
      const snapshotPnl = h24
        ? parseFloat(row.sodex_pnl) - h24.pnl
        : parseFloat(row.sodex_pnl)

      updates.push({
        account_id: row.account_id,
        sodex_total_volume: snapshotVol,
        sodex_pnl: snapshotPnl
      })
    }

    // 6. Batch update prev week snapshot
    for (let i = 0; i < updates.length; i += BATCH) {
      const batch = updates.slice(i, i + BATCH)
      for (const u of batch) {
        const { error } = await supabase
          .from('leaderboard_weekly')
          .update({
            sodex_total_volume: u.sodex_total_volume,
            sodex_pnl: u.sodex_pnl
          })
          .eq('week_number', prevWeek)
          .eq('account_id', u.account_id)
        if (!error) updated++
      }
    }

    // 7. Trigger sync_current_week to refresh week 0
    await supabase.rpc('sync_current_week')

    return Response.json({
      success: true,
      prevWeek,
      fetched24h: allItems24h.length,
      allTimeAccounts: allTimeRows?.length || 0,
      updatedSnapshots: updated
    })
  } catch (error) {
    console.error('Fix sodex snapshot error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
