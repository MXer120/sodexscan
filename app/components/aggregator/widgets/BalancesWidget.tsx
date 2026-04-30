'use client'

import { useWalletLiveData as useWalletData } from '../../../hooks/useWalletData'
import CoinLogo from '../../ui/CoinLogo'
import { SkeletonWidget } from '../../Skeleton'

function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return '-'
  const abs = Math.abs(n)
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (abs >= 1e3) return (n / 1e3).toFixed(2) + 'K'
  return Number(n).toFixed(2)
}

export default function BalancesWidget({ config, onUpdateConfig }) {
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

  const balanceType = config.balanceType || 'futures'
  const showCoinLogos = config.showCoinLogos !== false
  const showBalance = config.showBalance !== false
  const showAvailable = config.showAvailable !== false
  const showFrozen = config.showFrozen !== false

  // futures: account_details.data.balances[] with coin, walletBalance, availableBalance, openOrderMarginFrozen
  // spot: balances.data.spotBalance[] with coin, balance, availableBalance, frozen
  const balances = balanceType === 'spot'
    ? (data?.data?.balances?.data?.spotBalance || [])
    : (data?.data?.account_details?.data?.balances || [])

  if (!balances.length) {
    return <div style={{ padding: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>No balances found</div>
  }

  return (
    <div className="agg-widget-body">
      <table>
        <thead>
          <tr>
            <th>Coin</th>
            {showBalance && <th className="text-right">Balance</th>}
            {showAvailable && <th className="text-right">Available</th>}
            {showFrozen && <th className="text-right">Frozen</th>}
          </tr>
        </thead>
        <tbody>
          {balances.map((b, i) => {
            const coin = b.coin || ''
            const total = balanceType === 'spot'
              ? parseFloat(b.balance || 0)
              : parseFloat(b.walletBalance || 0)
            const available = parseFloat(b.availableBalance || b.available || 0)
            const frozen = balanceType === 'spot'
              ? parseFloat(b.frozen || 0)
              : parseFloat(b.openOrderMarginFrozen || 0)
            return (
              <tr key={`${coin}-${i}`}>
                <td style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {showCoinLogos && <CoinLogo symbol={coin} size={16} />}
                  {coin}
                </td>
                {showBalance && <td className="text-right">{fmt(total)}</td>}
                {showAvailable && <td className="text-right">{fmt(available)}</td>}
                {showFrozen && <td className="text-right">{fmt(frozen)}</td>}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
