import { fetchWallet } from './walletBundle'

export async function get_pnl_daily({ address, days }) {
  const bundle = await fetchWallet(address)
  if (!bundle.accountId) return { error: 'Wallet not found', code: 404 }

  const raw = bundle.dailyPnl?.data ?? bundle.dailyPnl ?? []
  const series = (Array.isArray(raw) ? raw : [])
    .map(d => ({
      date: d.date ?? d.day ?? d.trade_date ?? null,
      pnl: parseFloat(d.pnl ?? d.dailyPnl ?? d.realizedPnl ?? 0) || 0,
    }))
    .filter(r => r.date)
    .sort((a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime())

  return series.slice(-days)
}
