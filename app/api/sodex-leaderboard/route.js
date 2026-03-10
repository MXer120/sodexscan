/**
 * Proxy for Sodex all-time leaderboard API.
 * Used by "Total + All-time" view to show 100% live Sodex data.
 *
 * GET /api/sodex-leaderboard?page=1&limit=20&type=volume
 */

const SODEX_LB_API = 'https://mainnet-data.sodex.dev/api/v1/leaderboard'
const PAGE_SIZE = 50 // Sodex API page size (fixed)

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const type = searchParams.get('type') || 'volume'

  try {
    // Calculate which Sodex API pages we need
    const startIdx = (page - 1) * limit
    const endIdx = startIdx + limit
    const firstApiPage = Math.floor(startIdx / PAGE_SIZE) + 1
    const lastApiPage = Math.floor((endIdx - 1) / PAGE_SIZE) + 1

    // Fetch needed pages from Sodex
    const pages = []
    for (let p = firstApiPage; p <= lastApiPage; p++) {
      const res = await fetch(`${SODEX_LB_API}?window_type=ALL_TIME&page=${p}&page_size=${PAGE_SIZE}`)
      const d = await res.json()
      if (d.code !== 0 || !d.data?.items) throw new Error('Sodex API error: ' + (d.message || 'unknown'))
      pages.push({ page: p, items: d.data.items, total: d.data.total })
    }

    const total = pages[0].total

    // Merge all fetched items and slice to requested range
    let allItems = []
    for (const p of pages) allItems.push(...p.items)

    // Offset within the first fetched page
    const offsetInFetched = startIdx - (firstApiPage - 1) * PAGE_SIZE
    const sliced = allItems.slice(offsetInFetched, offsetInFetched + limit)

    // Sort by PnL if requested (Sodex API always sorts by volume)
    if (type === 'pnl') {
      sliced.sort((a, b) => parseFloat(b.pnl_usd || 0) - parseFloat(a.pnl_usd || 0))
    }

    // Format to match our frontend expectations
    const data = sliced.map((item, idx) => ({
      accountId: item.account_id,
      walletAddress: item.wallet_address?.toLowerCase(),
      sodexVolume: parseFloat(item.volume_usd) || 0,
      sodexPnl: parseFloat(item.pnl_usd) || 0,
      // These can't be split from the Sodex all-time endpoint
      volume: 0,
      pnl: 0,
      spotVolume: 0,
      spotPnl: 0,
      unrealizedPnl: 0,
    }))

    return Response.json({
      data,
      meta: { page, per_page: limit, total, type }
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' }
    })
  } catch (error) {
    console.error('Sodex LB proxy error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
