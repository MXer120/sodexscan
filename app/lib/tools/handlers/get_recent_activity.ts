import { get_trades } from './get_trades'
import { get_transfers } from './get_transfers'
import { get_funding_history } from './get_funding_history'

// Merged activity feed: trades + transfers + funding, sorted desc by time.
// `types` filters which sources are fetched (cost saver).

const ALL_TYPES = ['trade', 'deposit', 'withdrawal', 'internal', 'funding']

export async function get_recent_activity({ address, types, window, limit }) {
  const w = window || '30d'
  const cap = Math.max(1, Math.min(parseInt(limit ?? 100, 10) || 100, 500))
  // Pull the FULL window from each source, then merge & slice — using `cap`
  // as an upstream pagination cap would silently drop items from a busy window.
  const upstreamCap = 5000
  const wantedTypes = Array.isArray(types) && types.length ? types : ALL_TYPES
  const wantSet = new Set(wantedTypes)

  const wantTrade = wantSet.has('trade')
  const wantDep = wantSet.has('deposit')
  const wantWd = wantSet.has('withdrawal')
  const wantInt = wantSet.has('internal')
  const wantFund = wantSet.has('funding')

  const tasks = []
  if (wantTrade) {
    tasks.push(get_trades({ address, market: 'all', symbol: undefined, window: w, from: undefined, to: undefined, max_items: upstreamCap }).then(r => {
      if (r?.error) return []
      return (r.trades || []).map(t => ({
        time: t.time,
        type: 'trade',
        symbol: t.symbol,
        amount: t.quote_qty || (t.price * t.qty) || 0,
        side: t.side,
        market: t.market,
        details: { price: t.price, qty: t.qty, realized_pnl: t.realized_pnl, trade_id: t.trade_id },
      }))
    }))
  }

  if (wantDep || wantWd || wantInt) {
    const transferType = wantDep && wantWd && wantInt ? 'all'
      : wantDep && !wantWd && !wantInt ? 'deposit'
      : wantWd && !wantDep && !wantInt ? 'withdrawal'
      : wantInt && !wantDep && !wantWd ? 'internal'
      : 'all'
    tasks.push(get_transfers({ address, type: transferType, window: w, from: undefined, to: undefined, max_items: upstreamCap }).then(r => {
      if (r?.error) return []
      return (r.transfers || [])
        .filter(t => (t.type === 'deposit' && wantDep) || (t.type === 'withdrawal' && wantWd) || (t.type === 'internal' && wantInt))
        .map(t => ({
          time: t.time,
          type: t.type,
          symbol: t.symbol,
          amount: t.amount,
          side: null,
          market: null,
          details: { tx_hash: t.tx_hash, direction: t.direction, from: t.from, to: t.to },
        }))
    }))
  }

  if (wantFund) {
    tasks.push(get_funding_history({ address, symbol: undefined, window: w, from: undefined, to: undefined, max_items: upstreamCap }).then(r => {
      if (r?.error) return []
      return (r.events || []).map(f => ({
        time: f.time,
        type: 'funding',
        symbol: f.symbol,
        amount: f.amount,
        side: f.direction,
        market: 'perps',
        details: { rate: f.rate, mark_price: f.mark_price },
      }))
    }))
  }

  const parts = await Promise.all(tasks)
  const merged = parts.flat().sort((a, b) => (b.time || 0) - (a.time || 0)).slice(0, cap)

  return {
    address,
    window: w,
    count: merged.length,
    items: merged,
  }
}
