/**
 * GET /api/symbols
 * Returns merged list of perps + spot symbols for symbol search UI.
 * Cached in-memory for 60 s to avoid hammering SoDEX on every keystroke.
 */

import { perpsSymbols, perpsMarkPrices } from '../../lib/sodexApi'

let cache = null
let cacheAt = 0
const TTL = 60_000

export async function GET() {
  if (cache && Date.now() - cacheAt < TTL) {
    return Response.json(cache)
  }

  try {
    const [rawSymbols, rawPrices] = await Promise.allSettled([
      perpsSymbols(),
      perpsMarkPrices(),
    ])

    const priceMap = {}
    if (rawPrices.status === 'fulfilled') {
      const list = Array.isArray(rawPrices.value)
        ? rawPrices.value
        : (rawPrices.value?.data ?? rawPrices.value?.list ?? [])
      for (const m of list) {
        const sym = m.symbol ?? m.s
        const price = parseFloat(m.markPrice ?? m.price ?? m.p ?? 0)
        if (sym && price) priceMap[sym] = price
      }
    }

    const symbolList = Array.isArray(rawSymbols.value)
      ? rawSymbols.value
      : (rawSymbols.value?.data ?? rawSymbols.value?.list ?? rawSymbols.value ?? [])

    const symbols = (symbolList ?? []).map((s) => {
      const sym = s.symbol ?? s.name ?? s
      const base = sym.split(/[-_/]/)[0]
      return {
        symbol: sym,
        base,
        market: 'perps',
        price: priceMap[sym] ?? null,
      }
    }).filter(s => s.symbol)

    cache = { symbols }
    cacheAt = Date.now()
    return Response.json(cache)
  } catch (err) {
    return Response.json({ error: err.message, symbols: [] }, { status: 500 })
  }
}
