'use client'

import { useMemo } from 'react'
import { useWalletData } from '../../../hooks/useWalletData'
import CoinLogo from '../../ui/CoinLogo'

function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return '-'
  const abs = Math.abs(n)
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (abs >= 1e3) return (n / 1e3).toFixed(2) + 'K'
  return Number(n).toFixed(2)
}

function pct(n) {
  if (n === null || n === undefined || isNaN(n)) return '-'
  return (n * 100).toFixed(1) + '%'
}

export default function PerformanceWidget({ config, onUpdateConfig }) {
  const { data, isLoading } = useWalletData(config.walletAddress || null)

  // closed positions from positions.data[]
  const closedTrades = useMemo(() => {
    return data?.data?.positions?.data || []
  }, [data])

  const tradeStats = useMemo(() => {
    if (!closedTrades.length) return null
    const pnls = closedTrades.map(t => parseFloat(t.realized_pnl || 0))
    const wins = pnls.filter(p => p > 0)
    const losses = pnls.filter(p => p < 0)
    return {
      total: pnls.length,
      winRate: pnls.length > 0 ? wins.length / pnls.length : 0,
      avgWin: wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0,
      avgLoss: losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0,
      best: pnls.length > 0 ? Math.max(...pnls) : 0,
      worst: pnls.length > 0 ? Math.min(...pnls) : 0,
      totalPnl: pnls.reduce((a, b) => a + b, 0)
    }
  }, [closedTrades])

  const assetStats = useMemo(() => {
    if (!closedTrades.length) return []
    const bySymbol = {}
    closedTrades.forEach(t => {
      const sym = t.symbol_id || t.symbol || 'Unknown'
      if (!bySymbol[sym]) bySymbol[sym] = { symbol: sym, pnl: 0, trades: 0, wins: 0 }
      const pnl = parseFloat(t.realized_pnl || 0)
      bySymbol[sym].pnl += pnl
      bySymbol[sym].trades++
      if (pnl > 0) bySymbol[sym].wins++
    })
    return Object.values(bySymbol).sort((a, b) => b.pnl - a.pnl)
  }, [closedTrades])

  if (!config.walletAddress) {
    return (
      <div className="agg-widget-address">
        <input placeholder="Enter wallet address..." onKeyDown={e => {
          if (e.key === 'Enter' && e.target.value.trim()) {
            onUpdateConfig({ ...config, walletAddress: e.target.value.trim() })
          }
        }} />
      </div>
    )
  }

  if (isLoading) return <div style={{ padding: 12, color: 'var(--color-text-muted)' }}>Loading...</div>

  const view = config.view || 'trade'
  const showCoinLogos = config.showCoinLogos !== false

  if (!closedTrades.length) {
    return <div style={{ padding: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>No trade history for performance</div>
  }

  if (view === 'asset') {
    return (
      <div className="agg-widget-body">
        <table>
          <thead>
            <tr>
              <th>Asset</th>
              <th className="text-right">Trades</th>
              <th className="text-right">Win Rate</th>
              <th className="text-right">PnL</th>
            </tr>
          </thead>
          <tbody>
            {assetStats.map(a => (
              <tr key={a.symbol}>
                <td style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {showCoinLogos && <CoinLogo symbol={a.symbol} size={16} />}
                  {a.symbol}
                </td>
                <td className="text-right">{a.trades}</td>
                <td className="text-right">{pct(a.trades > 0 ? a.wins / a.trades : 0)}</td>
                <td className={`text-right ${a.pnl > 0 ? 'positive' : a.pnl < 0 ? 'negative' : ''}`}>
                  ${a.pnl > 0 ? '+' : ''}{fmt(a.pnl)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Trade view (default)
  return (
    <div className="agg-widget-body">
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th className="text-right">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Total Trades</td>
            <td className="text-right">{tradeStats?.total ?? '-'}</td>
          </tr>
          <tr>
            <td>Win Rate</td>
            <td className="text-right">{pct(tradeStats?.winRate)}</td>
          </tr>
          <tr>
            <td>Avg Win</td>
            <td className="text-right positive">${tradeStats ? '+' + fmt(tradeStats.avgWin) : '-'}</td>
          </tr>
          <tr>
            <td>Avg Loss</td>
            <td className="text-right negative">${tradeStats ? fmt(tradeStats.avgLoss) : '-'}</td>
          </tr>
          <tr>
            <td>Best Trade</td>
            <td className="text-right positive">${tradeStats ? '+' + fmt(tradeStats.best) : '-'}</td>
          </tr>
          <tr>
            <td>Worst Trade</td>
            <td className="text-right negative">${tradeStats ? fmt(tradeStats.worst) : '-'}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 600 }}>Total PnL</td>
            <td className={`text-right ${(tradeStats?.totalPnl || 0) > 0 ? 'positive' : 'negative'}`} style={{ fontWeight: 600 }}>
              ${tradeStats ? (tradeStats.totalPnl > 0 ? '+' : '') + fmt(tradeStats.totalPnl) : '-'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
