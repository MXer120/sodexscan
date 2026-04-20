/**
 * GET /api/prices
 * Returns mark, bid, ask, mid per symbol.
 * 3 s server-side cache so rapid clients share one upstream fetch.
 */

import { perpsMarkPrices, perpsBookTickers } from '../../lib/sodexApi'

let cache = null
let cacheAt = 0
const TTL = 3_000

export async function GET() {
  if (cache && Date.now() - cacheAt < TTL) {
    return Response.json(cache, { headers: { 'Cache-Control': 'no-store' } })
  }

  try {
    const [rawMark, rawBook] = await Promise.allSettled([
      perpsMarkPrices(),
      perpsBookTickers(),
    ])

    const mark = {}, bid = {}, ask = {}, mid = {}

    if (rawMark.status === 'fulfilled') {
      const list = Array.isArray(rawMark.value) ? rawMark.value : (rawMark.value?.data ?? rawMark.value?.list ?? [])
      for (const m of list) {
        const sym = m.symbol ?? m.s
        const p = parseFloat(m.markPrice ?? m.price ?? m.p ?? 0)
        if (sym && p) mark[sym] = p
      }
    }

    if (rawBook.status === 'fulfilled') {
      const list = Array.isArray(rawBook.value) ? rawBook.value : (rawBook.value?.data ?? rawBook.value?.list ?? [])
      for (const m of list) {
        const sym = m.symbol ?? m.s
        const b = parseFloat(m.bidPrice ?? m.bid ?? 0)
        const a = parseFloat(m.askPrice ?? m.ask ?? 0)
        if (sym && b) bid[sym] = b
        if (sym && a) ask[sym] = a
        if (sym && b && a) mid[sym] = (b + a) / 2
      }
    }

    cache = { mark, bid, ask, mid }
    cacheAt = Date.now()
    return Response.json(cache, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    return Response.json(cache ?? { mark: {}, bid: {}, ask: {}, mid: {} }, { status: 200 })
  }
}
