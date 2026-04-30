import { get_funding_history } from './get_funding_history'

// Aggregator over get_funding_history. The window-based total is just the sum
// of all events in the window — delegating keeps the upstream call surface in
// one place (the address-based /perps/accounts/{addr}/fundings endpoint).

const WINDOW_MS = {
  '1h':  1 * 60 * 60 * 1000,
  '4h':  4 * 60 * 60 * 1000,
  '12h': 12 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '48h': 48 * 60 * 60 * 1000,
  '7d':  7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
}

// Coerce shorter windows that get_funding_history doesn't accept directly.
function delegateWindow(window) {
  if (window === 'all' || window === 'custom') return { window }
  if (['24h', '48h', '7d', '30d'].includes(window)) return { window }
  // For 1h/4h/12h, we use 24h upstream and post-filter in this handler.
  return { window: '24h', tightenMs: WINDOW_MS[window] }
}

interface FundingTotalResult {
  net: number
  paid: number
  received: number
  window: string
  count: number
  from: string | null
  to: string | null
  breakdown?: Array<{ symbol: string; net: number; paid: number; received: number; count: number }>
}

export async function get_funding_total({ address, window, from, to, symbol, breakdown }: {
  address: string
  window?: string
  from?: string
  to?: string
  symbol?: string
  breakdown?: boolean
}) {
  const w = window || '24h'
  const delegated = delegateWindow(w)
  const sub = await get_funding_history({
    address,
    symbol,
    window: delegated.window,
    from,
    to,
    max_items: 5000,
  })
  if (sub?.error) return sub

  let events = sub.events || []
  if (delegated.tightenMs) {
    const cutoff = Date.now() - delegated.tightenMs
    events = events.filter(e => e.time >= cutoff)
  }
  if (symbol) events = events.filter(e => (e.symbol || '').toUpperCase() === symbol.toUpperCase())

  const result: FundingTotalResult = {
    net: 0,
    paid: 0,
    received: 0,
    window: w,
    count: events.length,
    from: events.length ? new Date(events[events.length - 1].time).toISOString() : null,
    to: events.length ? new Date(events[0].time).toISOString() : null,
  }
  const perSym = new Map<string, { symbol: string; net: number; paid: number; received: number; count: number }>()
  for (const e of events) {
    result.net += e.amount
    if (e.amount >= 0) result.received += e.amount
    else result.paid += e.amount
    if (breakdown) {
      const s = e.symbol || 'UNKNOWN'
      const cur = perSym.get(s) ?? { symbol: s, net: 0, paid: 0, received: 0, count: 0 }
      cur.net += e.amount
      if (e.amount >= 0) cur.received += e.amount
      else cur.paid += e.amount
      cur.count += 1
      perSym.set(s, cur)
    }
  }
  if (breakdown) result.breakdown = Array.from(perSym.values()).sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
  return result
}
