'use client'

import { useWalletLiveData as useWalletData } from '../../../hooks/useWalletData'
import { SkeletonWidget } from '../../Skeleton'

function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return '-'
  const abs = Math.abs(n)
  if (abs >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
  if (abs >= 1e3) return '$' + (n / 1e3).toFixed(2) + 'K'
  return '$' + n.toFixed(2)
}

export default function AccountEquityWidget({ config, onUpdateConfig }) {
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

  const showFutures = config.showFutures !== false
  const showSpot = config.showSpot !== false

  // futures equity = sum of walletBalance from account_details.data.balances
  const detailsBals = data?.data?.account_details?.data?.balances || []
  const futuresValue = detailsBals.reduce((s, b) => s + parseFloat(b.walletBalance || 0), 0)

  // spot equity = sum of balance from balances.data.spotBalance
  const spotBals = data?.data?.balances?.data?.spotBalance || []
  const spotValue = spotBals.reduce((s, b) => s + parseFloat(b.balance || 0), 0)

  return (
    <div className="agg-widget-stats">
      {showFutures && (
        <div className="agg-widget-stat-row">
          <span className="agg-widget-stat-label">Futures</span>
          <span className="agg-widget-stat-value">{fmt(futuresValue)}</span>
        </div>
      )}
      {showSpot && (
        <div className="agg-widget-stat-row">
          <span className="agg-widget-stat-label">Spot</span>
          <span className="agg-widget-stat-value">{fmt(spotValue)}</span>
        </div>
      )}
    </div>
  )
}
