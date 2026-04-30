'use client'

import { useWalletData } from '../../../hooks/useWalletData'
import { SkeletonWidget } from '../../Skeleton'

export default function SocialInfoWidget({ config, onUpdateConfig }) {
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

  // social info from overview.data or leaderboard_entry
  const ov = data?.data?.overview?.data || {}
  const lb = data?.data?.leaderboard_entry || {}
  const profile = { ...lb, ...ov }

  const referralCode = profile.referral_code ?? profile.ref_code ?? null
  const discord = profile.dc_username ?? profile.discord ?? null
  const telegram = profile.tg_username ?? profile.telegram ?? null
  const twitter = profile.x_handle ?? profile.twitter ?? null

  return (
    <div className="agg-widget-stats">
      <div className="agg-widget-stat-row">
        <span className="agg-widget-stat-label">Referral</span>
        <span className="agg-widget-stat-value">{referralCode || '-'}</span>
      </div>
      <div className="agg-widget-stat-row">
        <span className="agg-widget-stat-label">Discord</span>
        <span className="agg-widget-stat-value">{discord || '-'}</span>
      </div>
      <div className="agg-widget-stat-row">
        <span className="agg-widget-stat-label">Telegram</span>
        <span className="agg-widget-stat-value">{telegram || '-'}</span>
      </div>
      <div className="agg-widget-stat-row">
        <span className="agg-widget-stat-label">X</span>
        <span className="agg-widget-stat-value">{twitter || '-'}</span>
      </div>
    </div>
  )
}
