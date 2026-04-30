/**
 * GET /api/symbols
 * Returns merged list of perps + spot symbols for symbol search UI.
 * Cached in-memory for 60 s to avoid hammering SoDEX on every keystroke.
 */

import { perpsSymbols, perpsMarkPrices, spotSymbols, spotTickers } from '../../lib/sodexApi'

let cache = null
let cacheAt = 0
const TTL = 60_000

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
    return Response.json(cache)
  }

  try {
    const [rawPerpsSymbols, rawPerpsPrices, rawSpotSymbols, rawSpotTickers] = await Promise.allSettled([
      perpsSymbols(),
      perpsMarkPrices(),
      spotSymbols(),
      spotTickers(),
    ])

    const perpsPriceMap = {}
    if (rawPerpsPrices.status === 'fulfilled') {
      for (const m of toList(rawPerpsPrices.value)) {
        const sym = m.symbol ?? m.s
        const price = parseFloat(m.markPrice ?? m.price ?? m.p ?? 0)
        if (sym && price) perpsPriceMap[sym] = price
      }
    }

    const spotPriceMap = {}
    if (rawSpotTickers.status === 'fulfilled') {
      for (const m of toList(rawSpotTickers.value)) {
        const sym = m.symbol ?? m.s
        const price = parseFloat(m.lastPrice ?? m.lastPx ?? m.price ?? m.p ?? 0)
        if (sym && price) spotPriceMap[sym] = price
      }
    }

    const perpsSymbolList = toList(rawPerpsSymbols.status === 'fulfilled' ? rawPerpsSymbols.value : null).map(s => {
      const sym = s.symbol ?? s.name ?? s
      return { symbol: sym, base: sym.split(/[-_/]/)[0], market: 'perps', price: perpsPriceMap[sym] ?? null }
    }).filter(s => s.symbol)

    const spotSymbolList = toList(rawSpotSymbols.status === 'fulfilled' ? rawSpotSymbols.value : null).map(s => {
      const sym = s.symbol ?? s.name ?? s
      return { symbol: sym, base: sym.split(/[-_/]/)[0], market: 'spot', price: spotPriceMap[sym] ?? null }
    }).filter(s => s.symbol)

    const symbols = [...perpsSymbolList, ...spotSymbolList]

    cache = { symbols }
    cacheAt = Date.now()
    return Response.json(cache)
  } catch (err) {
    return Response.json({ error: (err as Error).message, symbols: [] }, { status: 500 })
  }
}
