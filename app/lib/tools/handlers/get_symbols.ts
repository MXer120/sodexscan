// Inlined symbol fetch — calls Sodex gateway directly so it works server-side
// (the previous implementation hit a relative /api/symbols URL which fails in Node).

import { perpsSymbols, perpsMarkPrices, spotSymbols, spotTickers } from '../../sodexApi'

function toList(raw) {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    if (Array.isArray(raw.data)) return raw.data
    if (Array.isArray(raw.list)) return raw.list
  }
  return []
}

export async function get_symbols() {
  const [pSyms, pMarks, sSyms, sTicks] = await Promise.allSettled([
    perpsSymbols(), perpsMarkPrices(), spotSymbols(), spotTickers(),
  ])

  const perpsPrice = {}
  if (pMarks.status === 'fulfilled') {
    for (const m of toList(pMarks.value)) {
      const sym = m.symbol ?? m.s
      const p = parseFloat(m.markPrice ?? m.price ?? m.p ?? 0)
      if (sym && p) perpsPrice[sym] = p
    }
  }
  const spotPrice = {}
  if (sTicks.status === 'fulfilled') {
    for (const m of toList(sTicks.value)) {
      const sym = m.symbol ?? m.s
      const p = parseFloat(m.lastPrice ?? m.lastPx ?? m.price ?? m.c ?? m.p ?? 0)
      if (sym && p) spotPrice[sym] = p
    }
  }

  const perps = pSyms.status === 'fulfilled' ? toList(pSyms.value).map(s => {
    const sym = typeof s === 'string' ? s : (s.symbol ?? s.name ?? '')
    return { symbol: sym, base: String(sym).split(/[-_/]/)[0], market: 'perps', price: perpsPrice[sym] ?? null }
  }).filter(s => s.symbol) : []

  const spot = sSyms.status === 'fulfilled' ? toList(sSyms.value).map(s => {
    const sym = typeof s === 'string' ? s : (s.symbol ?? s.name ?? '')
    return { symbol: sym, base: String(sym).split(/[-_/]/)[0], market: 'spot', price: spotPrice[sym] ?? null }
  }).filter(s => s.symbol) : []

  if (perps.length === 0 && spot.length === 0) {
    return { error: 'Upstream symbols unavailable', code: 502 }
  }
  return [...perps, ...spot]
}
