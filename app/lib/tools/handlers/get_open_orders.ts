// Open orders — perps and/or spot.
// Upstream wraps the array as { code:0, data: { orders: [...] } } for perps and
// { code:0, data: { list: [...] } } for spot — handle both shapes.

const PERPS_ORDERS = (addr, symbol) => {
  const q = symbol ? `?symbol=${encodeURIComponent(symbol)}` : ''
  return `https://mainnet-gw.sodex.dev/api/v1/perps/accounts/${addr}/orders${q}`
}
const SPOT_ORDERS = (addr, symbol) => {
  const q = symbol ? `?symbol=${encodeURIComponent(symbol)}` : ''
  return `https://mainnet-gw.sodex.dev/api/v1/spot/accounts/${addr}/orders${q}`
}

async function fetchList(url) {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return []
    const json = await res.json()
    if (json.code !== undefined && json.code !== 0) return []
    const root = json.data ?? json
    if (Array.isArray(root)) return root
    if (Array.isArray(root?.orders)) return root.orders
    if (Array.isArray(root?.list)) return root.list
    if (Array.isArray(root?.data)) return root.data
    return []
  } catch { return [] }
}

function normalize(row, market) {
  return {
    market,
    orderId: row.orderId ?? row.order_id ?? row.id ?? null,
    symbol: row.symbol ?? '',
    side: (row.side ?? row.positionSide ?? '').toString(),
    type: row.type ?? row.orderType ?? null,
    price: parseFloat(row.price ?? row.orderPrice ?? 0) || 0,
    orig_qty: parseFloat(row.origQty ?? row.orderQty ?? row.quantity ?? 0) || 0,
    executed_qty: parseFloat(row.executedQty ?? row.filledQty ?? 0) || 0,
    status: row.status ?? null,
    time: parseInt(row.time ?? row.createdAt ?? row.created_at ?? row.updateTime ?? 0, 10) || null,
  }
}

export async function get_open_orders({ address, market, symbol, limit }) {
  const m = market || 'all'
  const cap = Math.max(1, Math.min(parseInt(limit ?? 100, 10) || 100, 500))

  const tasks = []
  if (m === 'perps' || m === 'all') tasks.push(fetchList(PERPS_ORDERS(address, symbol)).then(r => r.map(x => normalize(x, 'perps'))))
  if (m === 'spot' || m === 'all') tasks.push(fetchList(SPOT_ORDERS(address, symbol)).then(r => r.map(x => normalize(x, 'spot'))))

  const results = (await Promise.all(tasks)).flat()
  results.sort((a, b) => (b.time || 0) - (a.time || 0))
  return { address, market: m, orders: results.slice(0, cap), total: results.length }
}
