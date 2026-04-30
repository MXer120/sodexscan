'use client'

import { useMemo } from 'react'
import { useWalletSlowData as useWalletData } from '../../../hooks/useWalletData'
import CoinLogo from '../../ui/CoinLogo'
import { SkeletonWidget } from '../../Skeleton'

function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return '-'
  const abs = Math.abs(n)
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (abs >= 1e3) return (n / 1e3).toFixed(2) + 'K'
  return Number(n).toFixed(2)
}

function fmtDate(ts) {
  if (!ts) return '-'
  const d = new Date(typeof ts === 'number' ? ts : ts)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function TradesWidget({ config, onUpdateConfig }) {
  const { data, isLoading } = useWalletData(config.walletAddress || null)

  // closed positions from positions.data[]
  const closedTrades = useMemo(() => {
    return data?.data?.positions?.data || []
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

  const showCoinLogos = config.showCoinLogos !== false
  const showSide = config.showSide !== false
  const showSize = config.showSize !== false
  const showEntry = config.showEntry !== false
  const showClose = config.showClose !== false
  const showPnl = config.showPnl !== false
  const showFees = config.showFees !== false
  const showDates = config.showDates !== false

  if (!closedTrades.length) {
    return <div style={{ padding: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>No closed trades</div>
  }

  return (
    <div className="agg-widget-body">
      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            {showSide && <th>Side</th>}
            {showSize && <th className="text-right">Size</th>}
            {showEntry && <th className="text-right">Entry</th>}
            {showClose && <th className="text-right">Close</th>}
            {showPnl && <th className="text-right">PnL</th>}
            {showFees && <th className="text-right">Fees</th>}
            {showDates && <th className="text-right">Date</th>}
          </tr>
        </thead>
        <tbody>
          {closedTrades.map((t, i) => {
            // position_side: 1=SHORT, 2=LONG
            const isLong = t.position_side === 2 || t.position_side === '2'
            const side = isLong ? 'Long' : 'Short'
            const pnl = parseFloat(t.realized_pnl || 0)
            const fees = parseFloat(t.cum_trading_fee || 0)
            const symbol = t.symbol || t.coin || t.pair || t.instrument_name || ''
            return (
              <tr key={`${symbol}-${i}`}>
                <td style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {showCoinLogos && <CoinLogo symbol={symbol} size={16} />}
                  {symbol}
                </td>
                {showSide && <td style={{ color: isLong ? 'var(--color-success)' : 'var(--color-error)' }}>
                  {side}
                </td>}
                {showSize && <td className="text-right">{fmt(parseFloat(t.max_size || 0))}</td>}
                {showEntry && <td className="text-right">{fmt(parseFloat(t.avg_entry_price || 0))}</td>}
                {showClose && <td className="text-right">{fmt(parseFloat(t.avg_close_price || 0))}</td>}
                {showPnl && <td className={`text-right ${pnl > 0 ? 'positive' : pnl < 0 ? 'negative' : ''}`}>
                  ${pnl > 0 ? '+' : ''}{fmt(pnl)}
                </td>}
                {showFees && <td className="text-right">${fmt(fees)}</td>}
                {showDates && <td className="text-right" style={{ fontSize: 11 }}>{fmtDate(t.created_at || t.updated_at)}</td>}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
