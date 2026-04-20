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
  const windowType = searchParams.get('window_type') || 'ALL_TIME'

  try {
    const url = `${SODEX_API}?window_type=${windowType}&sort_by=${sortBy}&sort_order=${sortOrder}&page=${page}&pageSize=${pageSize}`
    const res = await fetch(url)
    const json = await res.json()

    if (json.code !== 0 || !json.data?.items) {
      throw new Error('Sodex API error: ' + (json.message || 'unknown'))
    }

    return Response.json({
      code: 0,
      data: {
        items: json.data.items,
        total: json.data.total,
      }
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' }
    })
  } catch (error) {
    console.error('Sodex LB proxy error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
