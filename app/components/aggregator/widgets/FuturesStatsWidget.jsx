'use client'

import { useMemo } from 'react'
import { useWalletLiveData as useWalletData } from '../../../hooks/useWalletData'
import { SkeletonWidget } from '../../Skeleton'

function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return '-'
  const abs = Math.abs(n)
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (abs >= 1e3) return (n / 1e3).toFixed(2) + 'K'
  return n.toFixed(2)
}

export default function FuturesStatsWidget({ config, onUpdateConfig }) {
  const { data, isLoading } = useWalletData(config.walletAddress || null)

  const stats = useMemo(() => {
    if (!data?.data) return { unrealizedPnl: null, avgLeverage: null, allTimePnl: null, allTimeVolume: null }

    // unrealized PnL = sum from open positions
    const openPositions = data.data.account_details?.data?.positions || []
    const unrealizedPnl = openPositions.length > 0
      ? openPositions.reduce((s, p) => s + parseFloat(p.unrealizedProfit || 0), 0)
      : null

    // avg leverage from open positions
    const leverages = openPositions.filter(p => p.leverage).map(p => parseFloat(p.leverage))
    const avgLeverage = leverages.length > 0
      ? leverages.reduce((s, l) => s + l, 0) / leverages.length
      : null

    // all time PnL from leaderboard or overview
    const lb = data.data.leaderboard_entry
    const ov = data.data.overview?.data
    const allTimePnl = lb?.cumulative_pnl != null ? parseFloat(lb.cumulative_pnl)
      : ov?.cumulative_pnl != null ? parseFloat(ov.cumulative_pnl) : null

    const allTimeVolume = lb?.cumulative_volume != null ? parseFloat(lb.cumulative_volume)
      : ov?.cumulative_quote_volume != null ? parseFloat(ov.cumulative_quote_volume) : null

    return { unrealizedPnl, avgLeverage, allTimePnl, allTimeVolume }
  }, [data])

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

  if (isLoading) return <SkeletonWidget />

  const showUnrealizedPnl = config.showUnrealizedPnl !== false
  const showAvgLeverage = config.showAvgLeverage !== false
  const showAllTimePnl = config.showAllTimePnl !== false
  const showAllTimeVolume = config.showAllTimeVolume !== false

  return (
    <div className="agg-widget-stats" style={{ overflow: 'hidden' }}>
      {showUnrealizedPnl && (
        <div className="agg-widget-stat-row">
          <span className="agg-widget-stat-label">Unrealized PnL</span>
          <span className={`agg-widget-stat-value ${stats.unrealizedPnl > 0 ? 'positive' : stats.unrealizedPnl < 0 ? 'negative' : ''}`}>
            ${fmt(stats.unrealizedPnl)}
          </span>
        </div>
      )}
      {showAvgLeverage && (
        <div className="agg-widget-stat-row">
          <span className="agg-widget-stat-label">Avg Leverage</span>
          <span className="agg-widget-stat-value">
            {stats.avgLeverage != null ? stats.avgLeverage.toFixed(1) + 'x' : '-'}
          </span>
        </div>
      )}
      {showAllTimePnl && (
        <div className="agg-widget-stat-row">
          <span className="agg-widget-stat-label">All Time PnL</span>
          <span className={`agg-widget-stat-value ${stats.allTimePnl > 0 ? 'positive' : stats.allTimePnl < 0 ? 'negative' : ''}`}>
            ${fmt(stats.allTimePnl)}
          </span>
        </div>
      )}
      {showAllTimeVolume && (
        <div className="agg-widget-stat-row">
          <span className="agg-widget-stat-label">All Time Volume</span>
          <span className="agg-widget-stat-value">${fmt(stats.allTimeVolume)}</span>
        </div>
      )}
    </div>
  )
}
