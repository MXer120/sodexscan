/**
 * Proxy for Sodex all-time leaderboard API.
 * Total + All-time view uses ONLY this — zero DB involvement.
 *
 * GET /api/sodex-leaderboard?page=1&page_size=20&sort_by=volume&sort_order=desc
 */

const SODEX_API = 'https://mainnet-data.sodex.dev/api/v1/leaderboard'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const page = searchParams.get('page') || '1'
  const pageSize = searchParams.get('page_size') || '20'
  const sortBy = searchParams.get('sort_by') || 'volume'
  const sortOrder = searchParams.get('sort_order') || 'desc'

  try {
    const url = `${SODEX_API}?window_type=ALL_TIME&sort_by=${sortBy}&sort_order=${sortOrder}&page=${page}&page_size=${pageSize}`
    const res = await fetch(url)
    const json = await res.json()

    if (json.code !== 0 || !json.data?.items) {
      throw new Error('Sodex API error: ' + (json.message || 'unknown'))
    }

    const data = json.data.items.map(item => ({
      accountId: item.account_id,
      walletAddress: item.wallet_address?.toLowerCase(),
      sodexVolume: parseFloat(item.volume_usd) || 0,
      sodexPnl: parseFloat(item.pnl_usd) || 0,
      rank: item.rank,
      volume: 0,
      pnl: 0,
      spotVolume: 0,
      spotPnl: 0,
      unrealizedPnl: 0,
    }))

    return Response.json({
      data,
      meta: {
        page: parseInt(page),
        per_page: parseInt(pageSize),
        total: json.data.total,
        sort_by: sortBy,
        sort_order: sortOrder
      }
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' }
    })
  } catch (error) {
    console.error('Sodex LB proxy error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
