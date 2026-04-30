import { get_trades } from './get_trades'

// Per-symbol performance.
// Volume + trade_count come from trade fills (perps + spot as applicable).
// Realized PnL + wins/losses come from CLOSED POSITIONS (more accurate than
// trade fills, which often expose only fee/notional, not realized PnL).
// Win rate and avg PnL are computed off the closed-position counters.

const WINDOW_MS = {
  '24h': 24 * 60 * 60 * 1000,
  '48h': 48 * 60 * 60 * 1000,
  '7d':  7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
}

function resolveWindowMs(windowKey, from, to) {
  const now = Date.now()
  if (windowKey === 'custom') {
    return { fromMs: from ? new Date(from).getTime() : null, toMs: to ? new Date(to).getTime() : now }
  }
  if (windowKey === 'all') return { fromMs: null, toMs: now }
  return { fromMs: now - (WINDOW_MS[windowKey] ?? WINDOW_MS['30d']), toMs: now }
}

async function fetchPerpsClosedPositions(address, fromMs, toMs) {
  const params = new URLSearchParams({ limit: '1000' })
  if (fromMs != null) params.set('startTime', String(fromMs))
  if (toMs != null) params.set('endTime', String(toMs))
  const url = `https://mainnet-gw.sodex.dev/api/v1/perps/accounts/${address}/positions/history?${params.toString()}`
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return []
    const json = await res.json()
    if (json.code !== undefined && json.code !== 0) return []
    const root = json.data ?? json
    if (Array.isArray(root)) return root
    if (Array.isArray(root?.list)) return root.list
    if (Array.isArray(root?.positions)) return root.positions
    return []
  } catch { return [] }
}

const getPosPnl = p =>
  parseFloat(p.realizedPnl ?? p.realized_pnl ?? p.closedPnl ?? p.closed_pnl ?? p.profit ?? p.pnl ?? 0) || 0

export async function get_performance_by_asset({ address, market, window, from, to, limit, sort }) {
  const m = market || 'perps'
  const w = window || 'all'
  const cap = Math.max(1, Math.min(parseInt(limit ?? 20, 10) || 20, 100))

  const { fromMs, toMs } = resolveWindowMs(w, from, to)

  const [tradesRes, positions] = await Promise.all([
    get_trades({ address, market: m, symbol: undefined, window: w, from, to, max_items: 5000 }),
    (m === 'perps' || m === 'all') ? fetchPerpsClosedPositions(address, fromMs, toMs) : Promise.resolve([]),
  ])
  if (tradesRes?.error) return tradesRes

  const trades = tradesRes.trades || []
  const by = new Map()

  for (const t of trades) {
    const sym = t.symbol || 'UNKNOWN'
    const cur = by.get(sym) || { symbol: sym, total_pnl: 0, volume: 0, trade_count: 0, closed_count: 0, wins: 0, losses: 0 }
    cur.volume += t.quote_qty || (t.price * t.qty) || 0
    cur.trade_count += 1
    // Trade-level realized_pnl is unreliable on Sodex perps fills; we still
    // sum it as a fallback, then overwrite per-asset totals from closed
    // positions below if we have them.
    cur.total_pnl += t.realized_pnl || 0
    by.set(sym, cur)
  }

  // Overlay closed-position totals (authoritative for realized PnL on perps).
  if (positions.length > 0) {
    const posPnlBySym = new Map()
    for (const p of positions) {
      const sym = p.symbol || 'UNKNOWN'
      const pnl = getPosPnl(p)
      const cur = posPnlBySym.get(sym) || { total: 0, wins: 0, losses: 0, count: 0 }
      cur.total += pnl
      cur.count += 1
      if (pnl > 0) cur.wins += 1
      else if (pnl < 0) cur.losses += 1
      posPnlBySym.set(sym, cur)
    }
    for (const [sym, p] of posPnlBySym.entries()) {
      const cur = by.get(sym) || { symbol: sym, total_pnl: 0, volume: 0, trade_count: 0, closed_count: 0, wins: 0, losses: 0 }
      cur.total_pnl = p.total
      cur.closed_count = p.count
      cur.wins = p.wins
      cur.losses = p.losses
      by.set(sym, cur)
    }
  }

  const rows = Array.from(by.values()).map(r => {
    const denom = (r.wins + r.losses) || r.closed_count
    return {
      symbol: r.symbol,
      total_pnl: Math.round(r.total_pnl * 100) / 100,
      volume: Math.round(r.volume * 100) / 100,
      trade_count: r.trade_count,
      closed_count: r.closed_count,
      wins: r.wins,
      losses: r.losses,
      avg_pnl: r.closed_count > 0
        ? Math.round((r.total_pnl / r.closed_count) * 100) / 100
        : (r.trade_count ? Math.round((r.total_pnl / r.trade_count) * 100) / 100 : 0),
      win_rate: denom > 0 ? Math.round((r.wins / denom) * 10000) / 100 : 0,
    }
  })

  const sortKey = sort || 'total_pnl'
  rows.sort((a, b) => {
    if (sortKey === 'volume') return b.volume - a.volume
    if (sortKey === 'trades') return b.trade_count - a.trade_count
    return b.total_pnl - a.total_pnl
  })

  return rows.slice(0, cap)
}
