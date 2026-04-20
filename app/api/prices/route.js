/**
 * GET /api/prices
 * Lightweight price-only endpoint for live polling on the alerts page.
 * 3 s server-side cache so rapid clients share one upstream fetch.
 */

import { perpsMarkPrices } from '../../lib/sodexApi'

let cache = null
let cacheAt = 0
const TTL = 3_000

export async function GET() {
  if (cache && Date.now() - cacheAt < TTL) {
    return Response.json(cache, {
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  try {
    const raw = await perpsMarkPrices()
    const list = Array.isArray(raw) ? raw : (raw?.data ?? raw?.list ?? [])
    const prices = {}
    for (const m of list) {
      const sym = m.symbol ?? m.s
      const price = parseFloat(m.markPrice ?? m.price ?? m.p ?? 0)
      if (sym && price) prices[sym] = price
    }
    cache = { prices }
    cacheAt = Date.now()
    return Response.json(cache, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    return Response.json({ prices: cache?.prices ?? {} }, { status: 200 })
  }
}
