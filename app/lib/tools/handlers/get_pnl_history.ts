import { fetchWallet } from './walletBundle'

// Derives PnL series from /perps/pnl/daily_stats (already in wallet bundle).
// Buckets: daily | weekly (ISO week) | monthly | yearly | rolling_7d (sliding 7d sum).

function isoDate(ms) { return new Date(ms).toISOString().slice(0, 10) }
function isoWeek(ms: number) {
  const d = new Date(Date.UTC(new Date(ms).getUTCFullYear(), new Date(ms).getUTCMonth(), new Date(ms).getUTCDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}
function isoMonth(ms) { return new Date(ms).toISOString().slice(0, 7) }
function isoYear(ms) { return String(new Date(ms).getUTCFullYear()) }

function bucketKeyFor(view, ms) {
  switch (view) {
    case 'weekly': return isoWeek(ms)
    case 'monthly': return isoMonth(ms)
    case 'yearly': return isoYear(ms)
    case 'rolling_7d':
    case 'daily':
    default: return isoDate(ms)
  }
}

export async function get_pnl_history({ address, view, days, from, to }) {
  const bundle = await fetchWallet(address)
  if (!bundle.accountId) return { error: 'Wallet not found', code: 404 }

  const raw = bundle.dailyPnl?.data ?? bundle.dailyPnl ?? []
  if (!Array.isArray(raw) || raw.length === 0) return []

  const viewKey = view || 'daily'
  const now = Date.now()
  const fromMs = from ? new Date(from).getTime() : (now - (days || 90) * 24 * 60 * 60 * 1000)
  const toMs = to ? new Date(to).getTime() : now

  // Normalize rows — upstream may provide ts_ms or ISO date, and cumulative vs daily pnl.
  const rows = raw.map(d => {
    const date = d.date ?? d.day ?? d.trade_date ?? null
    const ms = d.ts_ms != null ? parseInt(d.ts_ms, 10) : (date ? new Date(date).getTime() : null)
    return {
      ms,
      daily: parseFloat(d.pnl ?? d.dailyPnl ?? d.daily_pnl ?? d.realizedPnl ?? 0) || 0,
      cumulative: parseFloat(d.cumulative_pnl ?? d.cumulativePnl ?? 0) || 0,
    }
  }).filter(r => r.ms != null).sort((a, b) => a.ms - b.ms)

  // If upstream only provided cumulative, derive daily = delta
  const hasDaily = rows.some(r => r.daily !== 0)
  if (!hasDaily && rows.some(r => r.cumulative !== 0)) {
    let prev = 0
    for (const r of rows) { r.daily = r.cumulative - prev; prev = r.cumulative }
  }

  const inWindow = rows.filter(r => r.ms >= fromMs && r.ms <= toMs)

  if (viewKey === 'rolling_7d') {
    // 7-day rolling sum
    const out = []
    for (let i = 0; i < inWindow.length; i++) {
      const cutoff = inWindow[i].ms - 7 * 24 * 60 * 60 * 1000
      let sum = 0
      for (let j = i; j >= 0 && inWindow[j].ms >= cutoff; j--) sum += inWindow[j].daily
      out.push({ bucket: isoDate(inWindow[i].ms), pnl: Math.round(sum * 100) / 100 })
    }
    return out
  }

  // Aggregate by bucket
  const buckets = new Map()
  let cumulative = 0
  for (const r of inWindow) {
    cumulative += r.daily
    const key = bucketKeyFor(viewKey, r.ms)
    const cur = buckets.get(key) || { bucket: key, daily_pnl: 0, cumulative_pnl: 0 }
    cur.daily_pnl += r.daily
    cur.cumulative_pnl = cumulative
    buckets.set(key, cur)
  }
  return Array.from(buckets.values()).map(b => ({
    bucket: b.bucket,
    daily_pnl: Math.round(b.daily_pnl * 100) / 100,
    cumulative_pnl: Math.round(b.cumulative_pnl * 100) / 100,
  }))
}
