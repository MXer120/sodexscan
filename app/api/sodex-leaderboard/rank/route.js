/**
 * Proxy for Sodex rank lookup by wallet address.
 * Used for "Your Row" in Total + All-time view — zero DB.
 *
 * GET /api/sodex-leaderboard/rank?wallet_address=0x...&sort_by=volume
 */

const SODEX_API = 'https://mainnet-data.sodex.dev/api/v1/leaderboard/rank'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const wallet = searchParams.get('wallet_address')
  const sortBy = searchParams.get('sort_by') || 'volume'
  const windowType = searchParams.get('window_type') || 'ALL_TIME'

  if (!wallet) {
    return Response.json({ error: 'wallet_address required' }, { status: 400 })
  }

  try {
    const url = `${SODEX_API}?window_type=${windowType}&sort_by=${sortBy}&wallet_address=${wallet}`
    const res = await fetch(url)
    const json = await res.json()

    if (json.code !== 0 || !json.data) {
      throw new Error('Sodex API error: ' + (json.message || 'unknown'))
    }

    if (!json.data.found || !json.data.item) {
      return Response.json({ code: 0, data: null })
    }

    const item = json.data.item
    return Response.json({
      code: 0,
      data: {
        rank: item.rank,
        wallet_address: item.wallet_address,
        pnl_usd: item.pnl_usd,
        volume_usd: item.volume_usd,
      }
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' }
    })
  } catch (error) {
    console.error('Sodex rank proxy error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
