import { fetchWallet } from './walletBundle'

export async function get_open_positions({ address, symbol, sort_by, limit }) {
  const bundle = await fetchWallet(address)
  if (!bundle.accountId) return { error: 'Wallet not found', code: 404 }

  const raw = bundle.details?.data?.positions ?? []
  let rows = raw.map(p => {
    const size = parseFloat(p.positionAmt ?? p.size ?? 0) || 0
    const entry = parseFloat(p.entryPrice ?? p.avgEntryPrice ?? 0) || 0
    const mark = parseFloat(p.markPrice ?? 0) || 0
    const leverage = parseFloat(p.leverage ?? 0) || 0
    const notional = Math.abs(size) * mark
    const upnl = parseFloat(p.unrealizedProfit ?? p.unrealizedPnl ?? 0) || 0
    return {
      symbol: p.symbol ?? '',
      side: (p.positionSide ?? p.side ?? '').toString(),
      size,
      entry_price: entry,
      mark_price: mark,
      leverage,
      liquidation_price: parseFloat(p.liquidationPrice ?? 0) || null,
      unrealized_pnl: upnl,
      notional,
    }
  })

  if (symbol) rows = rows.filter(r => r.symbol.toUpperCase() === symbol.toUpperCase())
  const key = sort_by === 'unrealized_pnl' ? 'unrealized_pnl' : sort_by === 'leverage' ? 'leverage' : 'notional'
  rows.sort((a, b) => (b[key] || 0) - (a[key] || 0))
  rows = rows.slice(0, limit ?? 50)
  return rows
}
