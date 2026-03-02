'use client'

import { useWalletLiveData as useWalletData } from '../../../hooks/useWalletData'

function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return '-'
  const abs = Math.abs(n)
  if (abs >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
  if (abs >= 1e3) return '$' + (n / 1e3).toFixed(2) + 'K'
  return '$' + n.toFixed(2)
}

export default function AccountValueWidget({ config, onUpdateConfig }) {
  const { data, isLoading, error } = useWalletData(config.walletAddress || null)

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
  if (error) return <div style={{ padding: 12, color: 'var(--color-error)' }}>Error loading data</div>

  // account_details.data.balances[0].walletBalance = futures USDC balance
  const detailsBals = data?.data?.account_details?.data?.balances || []
  const futuresValue = detailsBals.reduce((s, b) => s + parseFloat(b.walletBalance || 0), 0)

  // spot balances
  const spotBals = data?.data?.balances?.data?.spotBalance || []
  const spotValue = spotBals.reduce((s, b) => s + parseFloat(b.balance || 0), 0)

  const total = futuresValue + spotValue

  return (
    <div className="agg-widget-stats">
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account Value</div>
      <div className="agg-widget-stat-value large">{fmt(total)}</div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
        {config.walletAddress.slice(0, 6)}...{config.walletAddress.slice(-4)}
      </div>
    </div>
  )
}
