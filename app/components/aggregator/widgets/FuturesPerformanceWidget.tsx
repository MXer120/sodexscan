'use client'

import { useMemo } from 'react'
import { useWalletData } from '../../../hooks/useWalletData'
import { SkeletonWidget } from '../../Skeleton'

export default function FuturesPerformanceWidget({ config, onUpdateConfig }) {
  const { data, isLoading } = useWalletData(config.walletAddress || null)

  const stats = useMemo(() => {
    // closed positions = positions.data[]
    const closed = data?.data?.positions?.data
    if (!closed || !closed.length) return { winRate: null, sharpe: null }

    const pnls = closed.map(p => parseFloat(p.realized_pnl || 0))
    const wins = pnls.filter(p => p > 0).length
    const winRate = (wins / pnls.length) * 100

    // Sharpe: mean(returns) / std(returns)
    const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length
    const variance = pnls.reduce((sum, r) => sum + (r - mean) ** 2, 0) / pnls.length
    const std = Math.sqrt(variance)
    const sharpe = std > 0 ? mean / std : null

    return { winRate, sharpe }
  }, [data])

  if (!config.walletAddress) {
    return (
      <div className="agg-widget-address">
        <input placeholder="Enter wallet address..." onKeyDown={e => {
          if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
            onUpdateConfig({ ...config, walletAddress: (e.target as HTMLInputElement).value.trim() })
          }
        }} />
      </div>
    )
  }

  if (isLoading) return <SkeletonWidget />

  return (
    <div className="agg-widget-stats">
      <div className="agg-widget-stat-row">
        <span className="agg-widget-stat-label">Win Rate</span>
        <span className={`agg-widget-stat-value ${stats.winRate != null && stats.winRate >= 50 ? 'positive' : stats.winRate != null ? 'negative' : ''}`}>
          {stats.winRate != null ? stats.winRate.toFixed(1) + '%' : '-'}
        </span>
      </div>
      <div className="agg-widget-stat-row">
        <span className="agg-widget-stat-label">Sharpe Ratio</span>
        <span className={`agg-widget-stat-value ${stats.sharpe != null && stats.sharpe > 0 ? 'positive' : stats.sharpe != null && stats.sharpe < 0 ? 'negative' : ''}`}>
          {stats.sharpe != null ? stats.sharpe.toFixed(2) : '-'}
        </span>
      </div>
    </div>
  )
}
