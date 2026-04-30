import { fetchSodexPaginated } from './walletBundle'

// Per-event funding rows. Upstream is the public gateway, address-based:
//   /api/v1/perps/accounts/{address}/fundings?startTime&endTime&limit
// Pagination: walk backward via endTime cursor (last item's timestamp).

const WINDOW_MS = {
  '24h': 24 * 60 * 60 * 1000,
  '48h': 48 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
}

function resolveWindow(key, from, to) {
  const now = Date.now()
  if (key === 'custom') {
    if (!from || !to) return { error: 'from/to required for custom window' }
    return { fromMs: new Date(from).getTime(), toMs: new Date(to).getTime() }
  }
  if (key === 'all') return { fromMs: null, toMs: now }
  return { fromMs: now - (WINDOW_MS[key] ?? WINDOW_MS['30d']), toMs: now }
}

const getTime = r => parseInt(r.time ?? r.fundingTime ?? r.timestamp ?? r.created_at ?? r.ts ?? 0, 10) || 0

function normalize(r) {
  const amount = parseFloat(r.fundingFee ?? r.amount ?? r.funding ?? r.income ?? 0) || 0
  return {
    symbol: r.symbol ?? '',
    amount,
    direction: amount >= 0 ? 'received' : 'paid',
    rate: r.fundingRate != null ? parseFloat(r.fundingRate) || 0
      : (r.rate != null ? parseFloat(r.rate) || 0 : null),
    mark_price: r.markPrice != null ? parseFloat(r.markPrice) || 0 : null,
    time: getTime(r),
  }
}

export async function get_funding_history({ address, symbol, window, from, to, max_items }) {
  const cap = Math.max(1, Math.min(parseInt(max_items ?? 5000, 10) || 5000, 5000))
  const w = resolveWindow(window || '30d', from, to)
  if (w.error) return { error: w.error, code: 400 }

  const base = `https://mainnet-gw.sodex.dev/api/v1/perps/accounts/${address}/fundings`

  const { items, hasMore } = await fetchSodexPaginated({
    buildUrl: ({ cursor, pageSize }) => {
      const p = new URLSearchParams({ limit: String(pageSize) })
      if (cursor) p.set('endTime', String(cursor))
      else if (w.toMs) p.set('endTime', String(w.toMs))
      if (w.fromMs != null) p.set('startTime', String(w.fromMs))
      if (symbol) p.set('symbol', symbol)
      return `${base}?${p.toString()}`
    },
    getItemTime: getTime,
    fromMs: w.fromMs,
    toMs: w.toMs,
    pageSize: 1000,
    maxItems: cap,
    maxPages: 10,
    cursorParam: 'endTime',
  })

  let events = items.map(normalize)
  if (symbol) events = events.filter(e => e.symbol.toUpperCase() === symbol.toUpperCase())
  events.sort((a, b) => b.time - a.time)

  let net = 0, paid = 0, received = 0
  for (const e of events) {
    net += e.amount
    if (e.amount >= 0) received += e.amount
    else paid += e.amount
  }

  return {
    address,
    window: window || '30d',
    count: events.length,
    has_more: hasMore,
    net,
    net_paid: paid,
    net_received: received,
    first_time: events.length ? events[events.length - 1].time : null,
    last_time: events.length ? events[0].time : null,
    events,
  }
}
