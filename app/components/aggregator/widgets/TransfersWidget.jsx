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

function fmtTime(ts) {
  if (!ts) return '-'
  const d = new Date(typeof ts === 'number' ? ts : ts)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function TransfersWidget({ config, onUpdateConfig }) {
  const { data, isLoading } = useWalletData(config.walletAddress || null)

  const transfers = useMemo(() => {
    if (!data?.data) return []

    // fund_transfers.data.fundTransfers[] -> blockTimestamp, amount, coin, transferType, txHash
    const fundTransfers = (data.data.fund_transfers?.data?.fundTransfers || []).map(t => ({
      type: t.transferType || 'transfer',
      coin: t.coin || '',
      amount: parseFloat(t.amount || 0),
      decimals: parseInt(t.decimals || 0),
      timestamp: t.blockTimestamp,
      txHash: t.txHash || null,
    }))

    // account_flow.data.accountFlows[] -> stmp, amount, coin, type, status
    const accountFlows = (data.data.account_flow?.data?.accountFlows || []).map(t => ({
      type: t.type || 'flow',
      coin: t.coin || '',
      amount: parseFloat(t.amount || 0),
      decimals: parseInt(t.decimals || 0),
      timestamp: t.stmp,
      txHash: null,
    }))

    return [...fundTransfers, ...accountFlows].sort((a, b) => {
      const ta = new Date(a.timestamp).getTime() || 0
      const tb = new Date(b.timestamp).getTime() || 0
      return tb - ta
    })
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

  if (isLoading) return <div style={{ padding: 12, color: 'var(--color-text-muted)' }}>Loading...</div>

  const showCoinLogos = config.showCoinLogos !== false
  const showType = config.showType !== false
  const showCoin = config.showCoin !== false
  const showAmount = config.showAmount !== false
  const showTime = config.showTime !== false

  if (!transfers.length) {
    return <div style={{ padding: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>No transfers found</div>
  }

  return (
    <div className="agg-widget-body">
      <table>
        <thead>
          <tr>
            {showType && <th>Type</th>}
            {showCoin && <th>Coin</th>}
            {showAmount && <th className="text-right">Amount</th>}
            {showTime && <th className="text-right">Time</th>}
          </tr>
        </thead>
        <tbody>
          {transfers.map((t, i) => {
            const isDeposit = t.type.toLowerCase().includes('deposit') || t.amount > 0
            return (
              <tr key={i}>
                {showType && <td>
                  <span style={{
                    fontSize: 11, fontWeight: 500,
                    color: isDeposit ? 'var(--color-success)' : 'var(--color-error)'
                  }}>
                    {t.type}
                  </span>
                </td>}
                {showCoin && <td style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {showCoinLogos && <CoinLogo symbol={t.coin} size={16} />}
                  {t.coin}
                </td>}
                {showAmount && <td className={`text-right ${t.amount > 0 ? 'positive' : t.amount < 0 ? 'negative' : ''}`}>
                  {t.amount > 0 ? '+' : ''}{fmt(t.amount)}
                </td>}
                {showTime && <td className="text-right" style={{ fontSize: 11 }}>{fmtTime(t.timestamp)}</td>}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
