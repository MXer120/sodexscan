// Upstream returns { data: { spot: [string|object], futures: [string|object] } }.
// Earlier versions returned objects; current API returns plain symbol strings.
export async function get_incoming_listings({ market }) {
  try {
    const res = await fetch('https://alpha-biz.sodex.dev/biz/config/symbol', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return { error: 'Upstream unavailable', code: 502 }
    const json = await res.json()
    const futures = Array.isArray(json?.data?.futures) ? json.data.futures : []
    const spot = Array.isArray(json?.data?.spot) ? json.data.spot : []

    const norm = (list, mkt) => list.map(s => {
      const isObj = s && typeof s === 'object'
      const symbol = isObj ? (s.symbol ?? s.name ?? '') : String(s)
      return {
        symbol,
        base: isObj ? (s.baseAsset ?? s.base ?? null) : null,
        market: mkt,
        status: isObj ? (s.status ?? null) : null,
        list_time: isObj ? (s.listTime ?? s.onlineTime ?? null) : null,
      }
    }).filter(x => x.symbol)

    if (market === 'spot') return norm(spot, 'spot')
    if (market === 'futures') return norm(futures, 'futures')
    return [...norm(futures, 'futures'), ...norm(spot, 'spot')]
  } catch {
    return { error: 'Upstream unavailable', code: 502 }
  }
}
