'use client'

import { useMemo } from 'react'
import { useWalletData } from '../../../hooks/useWalletData'

function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return '-'
  const abs = Math.abs(n)
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (abs >= 1e3) return (n / 1e3).toFixed(2) + 'K'
  return n.toFixed(2)
}

export default function DepositWithdrawalWidget({ config, onUpdateConfig }) {
  const { data, isLoading } = useWalletData(config.walletAddress || null)

  const flow = useMemo(() => {
    // account_flow.data.accountFlows[] -> type, amount
    const entries = data?.data?.account_flow?.data?.accountFlows
    if (!entries || !entries.length) return { deposited: null, withdrawn: null, delta: null }

    let deposited = 0
    let withdrawn = 0
    for (const e of entries) {
      const amt = parseFloat(e.amount ?? 0)
      const type = (e.type || '').toLowerCase()
      if (type.includes('deposit') || type === 'in') deposited += Math.abs(amt)
      else if (type.includes('withdraw') || type === 'out') withdrawn += Math.abs(amt)
    }
    return { deposited, withdrawn, delta: deposited - withdrawn }
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

  return (
    <div className="agg-widget-stats">
      <div className="agg-widget-stat-row">
        <span className="agg-widget-stat-label">Deposited</span>
        <span className="agg-widget-stat-value positive">${fmt(flow.deposited)}</span>
      </div>
      <div className="agg-widget-stat-row">
        <span className="agg-widget-stat-label">Withdrawn</span>
        <span className="agg-widget-stat-value negative">${fmt(flow.withdrawn)}</span>
      </div>
      <div className="agg-widget-stat-row">
        <span className="agg-widget-stat-label">Delta</span>
        <span className={`agg-widget-stat-value ${flow.delta > 0 ? 'positive' : flow.delta < 0 ? 'negative' : ''}`}>
          ${fmt(flow.delta)}
        </span>
      </div>
    </div>
  )
}
