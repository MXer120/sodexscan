import { fetchWallet } from './walletBundle'

// Deposits + withdrawals + internal (Spot ↔ Fund) transfers.
// Sources:
//   - alpha-biz/biz/mirror/account_flow → deposits + withdrawals (classified via type string)
//   - mainnet/chain/user/{id}/fund-transfers → internal Spot↔Fund transfers
// Pagination:
//   - account_flow paged via {start, limit=200}, stops when total reached or page<limit
//   - fund-transfers uses page&size=200, stops when page<size

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

function msFromStmp(v) {
  const n = parseInt(v ?? 0, 10) || 0
  if (!n) return 0
  return n > 1e12 ? n : n * 1000
}

function classifyFlow(row) {
  const t = (row.type || row.flowType || '').toString().toLowerCase()
  const isInternal = t.includes('transfer') || t.includes('spot to fund')
  if (isInternal) return 'internal'
  if (t.includes('deposit')) return 'deposit'
  if (t.includes('withdraw')) return 'withdrawal'
  return 'other'
}

async function fetchAccountFlow(address, fromMs, toMs, maxItems) {
  const out = []
  let start = 0
  const pageSize = 200
  for (let i = 0; i < 20; i++) {
    let data
    try {
      const res = await fetch('https://alpha-biz.sodex.dev/biz/mirror/account_flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: address, start, limit: pageSize }),
      })
      if (!res.ok) break
      data = await res.json()
    } catch { break }

    const rows = data?.data?.accountFlows
    if (!Array.isArray(rows) || rows.length === 0) break

    let oldestOutside = false
    for (const r of rows) {
      const ms = msFromStmp(r.stmp ?? r.timestamp ?? r.blockTimestamp ?? 0)
      if (toMs != null && ms > toMs) continue
      if (fromMs != null && ms < fromMs) { oldestOutside = true; continue }
      out.push(r)
      if (out.length >= maxItems) return { rows: out, capped: true }
    }

    const total = data?.data?.total ?? 0
    if (fromMs != null && oldestOutside) break
    if (rows.length < pageSize) break
    if (total && out.length >= total) break
    start += pageSize
  }
  return { rows: out, capped: false }
}

async function fetchFundTransfers(accountId, fromMs, toMs, maxItems) {
  const out = []
  const pageSize = 200
  for (let page = 1; page <= 20; page++) {
    let data
    try {
      const res = await fetch(`https://sodex.dev/mainnet/chain/user/${accountId}/fund-transfers?userId=${accountId}&page=${page}&size=${pageSize}`)
      if (!res.ok) break
      data = await res.json()
    } catch { break }

    const rows = data?.data?.fundTransfers
    if (!Array.isArray(rows) || rows.length === 0) break

    let oldestOutside = false
    for (const r of rows) {
      const ms = msFromStmp(r.blockTimestamp ?? r.stmp ?? 0)
      if (toMs != null && ms > toMs) continue
      if (fromMs != null && ms < fromMs) { oldestOutside = true; continue }
      out.push(r)
      if (out.length >= maxItems) return { rows: out, capped: true }
    }

    if (fromMs != null && oldestOutside) break
    if (rows.length < pageSize) break
  }
  return { rows: out, capped: false }
}

function normalizeFlow(r) {
  const type = classifyFlow(r)
  const amount = parseFloat(r.amount ?? 0) || 0
  return {
    time: msFromStmp(r.stmp ?? r.timestamp ?? r.blockTimestamp ?? 0),
    type,
    symbol: r.coin ?? r.token ?? r.asset ?? r.symbol ?? '',
    amount,
    direction: type === 'deposit' ? 'in' : type === 'withdrawal' ? 'out' : 'internal',
    tx_hash: r.txHash ?? r.hash ?? null,
    from: r.from ?? null,
    to: r.to ?? null,
    source: 'flow',
  }
}

function normalizeFundTransfer(r) {
  const isType2 = r.transferType === 2
  return {
    time: msFromStmp(r.blockTimestamp ?? r.stmp ?? 0),
    type: 'internal',
    symbol: r.coin ?? r.token ?? r.asset ?? r.symbol ?? '',
    amount: parseFloat(r.amount ?? 0) || 0,
    direction: 'internal',
    tx_hash: r.txHash ?? null,
    from: isType2 ? 'Spot' : null,
    to: isType2 ? 'Fund' : null,
    source: 'fund_transfer',
  }
}

export async function get_transfers({ address, type, window, from, to, max_items }) {
  const t = type || 'all'
  const cap = Math.max(1, Math.min(parseInt(max_items ?? 500, 10) || 500, 2000))
  const w = resolveWindow(window || '30d', from, to)
  if (w.error) return { error: w.error, code: 400 }

  const bundle = await fetchWallet(address)
  const accountId = bundle.accountId

  const tasks = []
  // account_flow covers deposit/withdrawal (and sometimes internal)
  if (t === 'deposit' || t === 'withdrawal' || t === 'all') {
    tasks.push(fetchAccountFlow(address, w.fromMs, w.toMs, cap))
  } else {
    tasks.push(Promise.resolve({ rows: [], capped: false }))
  }
  // fund-transfers covers Spot↔Fund internal
  if ((t === 'internal' || t === 'all') && accountId) {
    tasks.push(fetchFundTransfers(accountId, w.fromMs, w.toMs, cap))
  } else {
    tasks.push(Promise.resolve({ rows: [], capped: false }))
  }

  const [flowRes, fundRes] = await Promise.all(tasks)

  let merged = [
    ...flowRes.rows.map(normalizeFlow),
    ...fundRes.rows.map(normalizeFundTransfer),
  ]

  if (t !== 'all') merged = merged.filter(x => x.type === t)

  merged.sort((a, b) => b.time - a.time)
  const capped = flowRes.capped || fundRes.capped || merged.length > cap
  const transfers = merged.slice(0, cap)

  return {
    address,
    type: t,
    window: window || '30d',
    count: transfers.length,
    has_more: capped,
    first_time: transfers.length ? transfers[transfers.length - 1].time : null,
    last_time: transfers.length ? transfers[0].time : null,
    transfers,
  }
}
