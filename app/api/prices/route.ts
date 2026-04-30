/**
 * GET /api/prices
 * Returns mark price per symbol (perps + spot).
 * bid/ask/mid are provided by the browser-side WebSocket to SoDEX directly.
 * 1 s server-side cache.
 */

import { perpsTickers, spotTickers } from '../../lib/sodexApi'

let cache = null
let cacheAt = 0
const TTL = 1_000

function toList(raw) {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    if (Array.isArray(raw.data)) return raw.data
    if (Array.isArray(raw.list)) return raw.list
  }
  return []
}

export async function GET() {
  if (cache && Date.now() - cacheAt < TTL) {
    return Response.json(cache, { headers: { 'Cache-Control': 'no-store' } })
  }

  try {
    const [rawPerps, rawSpot] = await Promise.allSettled([
      perpsTickers(),
      spotTickers(),
    ])

    const mark = {}

    if (rawPerps.status === 'fulfilled') {
      for (const m of toList(rawPerps.value)) {
        const sym = m.symbol ?? m.s
        const p = parseFloat(m.markPrice ?? m.mark ?? m.p ?? m.price ?? 0)
        if (sym && p) mark[sym] = p
      }
    }

    if (rawSpot.status === 'fulfilled') {
      for (const m of toList(rawSpot.value)) {
        const sym = m.symbol ?? m.s
        const p = parseFloat(m.lastPrice ?? m.lastPx ?? m.price ?? m.p ?? 0)
        if (sym && p) mark[sym] = p
      }
    }

    cache = { mark }
    cacheAt = Date.now()
    return Response.json(cache, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    return Response.json(cache ?? { mark: {} }, { status: 200 })
  }
}
