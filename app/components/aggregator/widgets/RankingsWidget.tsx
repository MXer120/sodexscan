'use client'

import { useWalletData } from '../../../hooks/useWalletData'
import { SkeletonWidget } from '../../Skeleton'

export default function RankingsWidget({ config, onUpdateConfig }) {
  const { data, isLoading } = useWalletData(config.walletAddress || null)

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

  const lb = data?.data?.leaderboard_entry
  const pnlRank = lb?.pnl_rank ?? null
  const volumeRank = lb?.volume_rank ?? null

  return (
    <div className="agg-widget-stats">
      <div className="agg-widget-stat-row">
        <span className="agg-widget-stat-label">PnL Rank</span>
        <span className="agg-widget-stat-value large">
          {pnlRank != null ? `#${pnlRank}` : '-'}
        </span>
      </div>
      <div className="agg-widget-stat-row">
        <span className="agg-widget-stat-label">Volume Rank</span>
        <span className="agg-widget-stat-value large">
          {volumeRank != null ? `#${volumeRank}` : '-'}
        </span>
      </div>
    </div>
  )
}
