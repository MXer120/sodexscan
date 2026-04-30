import { fetchSodexPaginated } from './walletBundle'

// Historical trade fills — perps and/or spot.
// Upstream:
//   perps: /api/v1/perps/accounts/{addr}/trades?symbol&startTime&endTime&limit
//   spot:  /api/v1/spot/accounts/{addr}/trades?symbol&startTime&endTime&limit
// Pagination: we walk backward using endTime cursor. Stop when page<pageSize (all-time) or oldest item < fromMs (windowed).

const WINDOW_MS = {
  '24h': 24 * 60 * 60 * 1000,
  '48h': 48 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
}

function resolveWindow(windowKey, from, to) {
  const now = Date.now()
  if (windowKey === 'custom') {
    if (!from || !to) return { error: 'from/to required for custom window' }
    return { fromMs: new Date(from).getTime(), toMs: new Date(to).getTime() }
  }
  if (windowKey === 'all') return { fromMs: null, toMs: now }
  return { fromMs: now - (WINDOW_MS[windowKey] ?? WINDOW_MS['30d']), toMs: now }
}

function buildUrl(base, address, { symbol, cursor, pageSize, fromMs, toMs }) {
  const params = new URLSearchParams()
  if (symbol) params.set('symbol', symbol)
  if (fromMs != null) params.set('startTime', String(fromMs))
  params.set('endTime', String(cursor ?? toMs ?? Date.now()))
  params.set('limit', String(pageSize))
  return `${base.replace('{addr}', address)}?${params.toString()}`
}

const getTime = t => parseInt(t.time ?? t.timestamp ?? t.tradeTime ?? t.createdAt ?? 0, 10) || 0

function normalize(raw, market) {
  return {
    market,
    symbol: raw.symbol ?? '',
    side: (raw.side ?? raw.positionSide ?? '').toString(),
    price: parseFloat(raw.price ?? raw.fillPrice ?? 0) || 0,
    qty: parseFloat(raw.qty ?? raw.quantity ?? raw.origQty ?? 0) || 0,
    quote_qty: parseFloat(raw.quoteQty ?? raw.quoteAmount ?? raw.notional ?? 0) || 0,
    fee: parseFloat(raw.fee ?? raw.commission ?? 0) || 0,
    fee_asset: raw.feeAsset ?? raw.commissionAsset ?? null,
    realized_pnl: parseFloat(raw.realizedPnl ?? raw.realized_pnl ?? raw.closedPnl ?? raw.closed_pnl ?? raw.profit ?? raw.pnl ?? 0) || 0,
    time: getTime(raw),
    trade_id: raw.tradeId ?? raw.id ?? null,
    order_id: raw.orderId ?? null,
  }
}

async function fetchMarket({ base, address, market, symbol, fromMs, toMs, maxItems }) {
  const { items, hasMore } = await fetchSodexPaginated({
    buildUrl: ({ cursor, pageSize }) => buildUrl(base, address, { symbol, cursor, pageSize, fromMs, toMs }),
    getItemTime: getTime,
    fromMs,
    toMs,
    pageSize: 1000,
    maxItems,
    maxPages: 10,
    cursorParam: 'endTime',
  })
  return { items: items.map(r => normalize(r, market)), hasMore }
}

export async function get_trades({ address, market, symbol, window, from, to, max_items }) {
  const m = market || 'all'
  const cap = Math.max(1, Math.min(parseInt(max_items ?? 1000, 10) || 1000, 5000))
  const w = resolveWindow(window || '30d', from, to)
  if (w.error) return { error: w.error, code: 400 }

  const tasks = []
  if (m === 'perps' || m === 'all') tasks.push(fetchMarket({
    base: 'https://mainnet-gw.sodex.dev/api/v1/perps/accounts/{addr}/trades',
    address, market: 'perps', symbol, fromMs: w.fromMs, toMs: w.toMs,
    maxItems: m === 'all' ? Math.ceil(cap / 2) : cap,
  }))
  if (m === 'spot' || m === 'all') tasks.push(fetchMarket({
    base: 'https://mainnet-gw.sodex.dev/api/v1/spot/accounts/{addr}/trades',
    address, market: 'spot', symbol, fromMs: w.fromMs, toMs: w.toMs,
    maxItems: m === 'all' ? Math.ceil(cap / 2) : cap,
  }))

  const results = await Promise.all(tasks)
  const trades = results.flatMap(r => r.items).sort((a, b) => b.time - a.time).slice(0, cap)
  const hasMore = results.some(r => r.hasMore) || (results.flatMap(r => r.items).length > cap)

  return {
    address, market: m, window: window || '30d',
    count: trades.length,
    has_more: hasMore,
    first_time: trades.length ? trades[trades.length - 1].time : null,
    last_time: trades.length ? trades[0].time : null,
    trades,
  }
}
