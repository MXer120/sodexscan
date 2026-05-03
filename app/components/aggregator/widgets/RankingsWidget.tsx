'use client'

import { useQuery } from '@tanstack/react-query'
import { SkeletonWidget } from '../../Skeleton'

export default function RankingsWidget({ config, onUpdateConfig }) {
  const address = config.walletAddress || null

  const { data: pnlRankData, isLoading: pnlLoading } = useQuery({
    queryKey: ['rank-pnl', address],
    queryFn: async () => {
      const res = await fetch(
        `/api/sodex-leaderboard/rank?wallet_address=${address}&sort_by=pnl&window_type=ALL_TIME`
      )
      if (!res.ok) throw new Error('Failed to fetch PnL rank')
      const json = await res.json()
      if (json.code !== 0) return null
      return json.data
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000,
  })

  const { data: volRankData, isLoading: volLoading } = useQuery({
    queryKey: ['rank-volume', address],
    queryFn: async () => {
      const res = await fetch(
        `/api/sodex-leaderboard/rank?wallet_address=${address}&sort_by=volume&window_type=ALL_TIME`
      )
      if (!res.ok) throw new Error('Failed to fetch volume rank')
      const json = await res.json()
      if (json.code !== 0) return null
      return json.data
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000,
  })

  if (!address) {
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

  if (pnlLoading || volLoading) return <SkeletonWidget />

  const pnlRank = pnlRankData?.rank ?? null
  const volumeRank = volRankData?.rank ?? null

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
