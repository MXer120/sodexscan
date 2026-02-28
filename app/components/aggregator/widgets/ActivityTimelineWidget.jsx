'use client'

import { useMemo } from 'react'
import { useWalletData } from '../../../hooks/useWalletData'

const MAX_ITEMS = 50

function timeAgo(ts) {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return mins + 'm ago'
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return hrs + 'h ago'
  const days = Math.floor(hrs / 24)
  if (days < 30) return days + 'd ago'
  return Math.floor(days / 30) + 'mo ago'
}

function formatUsd(n) {
  if (n === null || n === undefined) return ''
  const abs = Math.abs(n)
  const sign = n >= 0 ? '+' : '-'
  if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(2) + 'M'
  if (abs >= 1e3) return sign + '$' + (abs / 1e3).toFixed(2) + 'K'
  return sign + '$' + abs.toFixed(2)
}

function getEventType(item) {
  if (item._source === 'position') {
    // position_side: 1=SHORT, 2=LONG
    const isLong = item.position_side === 2 || item.position_side === '2'
    return {
      type: isLong ? 'Long' : 'Short',
      icon: isLong ? '↗' : '↘',
      color: isLong ? 'var(--color-success, #10b981)' : 'var(--color-error, #ef4444)',
    }
  }
  if (item._source === 'transfer') {
    const type = String(item.transferType || '').toLowerCase()
    const isDeposit = type.includes('deposit')
    return {
      type: isDeposit ? 'Deposit' : 'Withdrawal',
      icon: isDeposit ? '↓' : '↑',
      color: isDeposit ? 'var(--color-success, #10b981)' : 'var(--color-warning, #f59e0b)',
    }
  }
  if (item._source === 'flow') {
    const type = (item.type || '').toLowerCase()
    const isDeposit = type.includes('deposit')
    return {
      type: isDeposit ? 'Deposit' : type.includes('withdraw') ? 'Withdrawal' : 'Flow',
      icon: isDeposit ? '↓' : '↑',
      color: 'var(--color-primary, #48cbff)',
    }
  }
  return { type: 'Event', icon: '•', color: 'var(--color-text-muted)' }
}

function getTimestamp(item) {
  if (item._source === 'position') return new Date(item.created_at || item.updated_at || 0).getTime()
  if (item._source === 'transfer') return new Date(item.blockTimestamp || 0).getTime()
  if (item._source === 'flow') return new Date(item.stmp || 0).getTime()
  return 0
}

function getAmount(item) {
  if (item._source === 'position') return parseFloat(item.realized_pnl || 0)
  if (item._source === 'transfer') return parseFloat(item.amount || 0)
  if (item._source === 'flow') return parseFloat(item.amount || 0)
  return null
}

function getCoin(item) {
  return item.coin || item.symbol_id || item.symbol || null
}

export default function ActivityTimelineWidget({ config, onUpdateConfig }) {
  const { data, isLoading } = useWalletData(config.walletAddress || null)
  const showCoinLogos = config.showCoinLogos !== false

  const events = useMemo(() => {
    if (!data?.data) return []

    const all = []

    // Closed positions: positions.data[]
    const positions = data.data.positions?.data || []
    for (const p of positions) {
      all.push({ ...p, _source: 'position' })
    }

    // Fund transfers: fund_transfers.data.fundTransfers[]
    const transfers = data.data.fund_transfers?.data?.fundTransfers || []
    for (const t of transfers) {
      all.push({ ...t, _source: 'transfer' })
    }

    // Account flow: account_flow.data.accountFlows[]
    const flows = data.data.account_flow?.data?.accountFlows || []
    for (const f of flows) {
      all.push({ ...f, _source: 'flow' })
    }

    // Sort by timestamp desc
    all.sort((a, b) => getTimestamp(b) - getTimestamp(a))

    return all.slice(0, MAX_ITEMS)
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

  if (events.length === 0) {
    return <div style={{ padding: 12, color: 'var(--color-text-muted)' }}>No activity found</div>
  }

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto', padding: '4px 8px' }}>
      <div style={{ position: 'relative', paddingLeft: 20 }}>
        {/* Vertical timeline line */}
        <div style={{
          position: 'absolute',
          left: 7,
          top: 4,
          bottom: 4,
          width: 2,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 1,
        }} />

        {events.map((item, i) => {
          const { type, icon, color } = getEventType(item)
          const ts = getTimestamp(item)
          const amount = getAmount(item)
          const coin = getCoin(item)
          const isProfit = amount !== null && amount >= 0

          return (
            <div
              key={i}
              style={{
                position: 'relative',
                padding: '6px 0',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              {/* Timeline dot */}
              <div style={{
                position: 'absolute',
                left: -16,
                top: 10,
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: color,
                border: '2px solid var(--color-bg, #0c0c0c)',
                flexShrink: 0,
                zIndex: 1,
              }} />

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 12, color }}>{icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text)' }}>{type}</span>
                  {showCoinLogos && coin && (
                    <span style={{
                      fontSize: 9,
                      padding: '1px 5px',
                      borderRadius: 3,
                      background: 'rgba(255,255,255,0.06)',
                      color: 'var(--color-text-muted)',
                      fontWeight: 500,
                    }}>
                      {coin}
                    </span>
                  )}
                  <span style={{ fontSize: 9, color: 'var(--color-text-muted)', marginLeft: 'auto', flexShrink: 0 }}>
                    {ts ? timeAgo(ts) : ''}
                  </span>
                </div>
                {amount !== null && (
                  <div style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: isProfit ? 'var(--color-success, #10b981)' : 'var(--color-error, #ef4444)',
                  }}>
                    {formatUsd(amount)}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
