'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import { useWalletSlowData as useWalletData } from '../../../hooks/useWalletData'
import CoinLogo, { getBaseCoin } from '../../ui/CoinLogo'
import { SkeletonChart } from '../../Skeleton'

const PAGE_SIZE = 25

// ── Copied 1:1 from MainnetTracker ──

const ASSET_REGISTRY = {
  '0xcb7F80Dff2727c791fA491722c428e6657f7e2c6': { symbol: 'USDC', decimals: 6 },
  '0x40320022Ed613E638284f6F2220831E09FAB0E3B': { symbol: 'USDC', decimals: 6 },
  '0xD76544025769c13496Bf4a6c2b4E67eAD3F857D8': { symbol: 'ETH', decimals: 18 },
  '0x0000000000000000000000000000000000000000': { symbol: 'ETH', decimals: 18 },
  '0x3887A01Af83E53c960469d60908DEB83748f22FB': { symbol: 'MAG7.ssi', decimals: 8 }
}

const formatPreciseAmount = (amount, decimals) => {
  if (amount === undefined || amount === null || amount === '') return '0'
  try {
    let s = amount.toString().split('.')[0]
    if (!s || s === '0') return '0'
    const raw = BigInt(s)
    const div = BigInt(10) ** BigInt(decimals)
    const integral = raw / div
    const fractional = raw % div
    if (fractional === BigInt(0)) return integral.toString()
    let fracStr = fractional.toString().padStart(decimals, '0')
    fracStr = fracStr.replace(/0+$/, '')
    return integral.toString() + '.' + fracStr
  } catch {
    const val = parseFloat(amount) / Math.pow(10, decimals)
    return val.toLocaleString('en-US', { maximumFractionDigits: decimals, useGrouping: false })
  }
}

const formatCoin = (amount, decimals) => formatPreciseAmount(amount, decimals)

const trimToMaxDecimals = (value, decimals = 2) => {
  if (isNaN(value)) return '0'
  const factor = Math.pow(10, decimals)
  const rounded = Math.round(value * factor) / factor
  let str = rounded.toFixed(decimals)
  str = str.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '')
  return str
}

const formatNumber = (num, decimals = 2) => {
  if (num === undefined || num === null) return '0'
  const n = parseFloat(num)
  if (Math.abs(n) >= 1e9) return `${trimToMaxDecimals(n / 1e9, decimals)}B`
  if (Math.abs(n) >= 1e6) return `${trimToMaxDecimals(n / 1e6, decimals)}M`
  if (Math.abs(n) >= 1e3) return `${trimToMaxDecimals(n / 1e3, decimals)}K`
  return trimToMaxDecimals(n, decimals)
}

const formatTimeShort = (stmp) => {
  if (!stmp) return ''
  const date = new Date(stmp * (stmp > 1e12 ? 1 : 1000))
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[date.getMonth()]} ${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

const getWithdrawalTypeMeta = (w) => {
  const t = (w.type || '').toLowerCase()
  const isInternal = t.includes('transfer')
  const isDeposit = t.includes('deposit') && !isInternal
  const isWithdraw = t.includes('withdraw') && !isInternal
  const typeLabel = t.includes('spot to fund') ? 'Transfer' :
    isInternal ? 'Transfer' :
    isDeposit ? 'Deposit' :
    isWithdraw ? 'Withdraw' : (w.type || '')
  return { isDeposit, isWithdraw, isInternal: isInternal || t.includes('spot to fund'), typeLabel }
}

// ── Build timeline from API data (same logic as MainnetTracker) ──

function buildTimeline(data) {
  if (!data?.data) return []

  // 1. Open positions (from account_details.data.positions)
  const openPositions = data.data.account_details?.data?.positions || []

  // 2. Closed trades (from positions.data — API enriches with symbol)
  const positionHistory = data.data.positions?.data || []

  // 3. Account flows / withdrawals (from account_flow.data.accountFlows)
  const withdrawals = data.data.account_flow?.data?.accountFlows || []

  // 4. Fund transfers (raw from API — need processing like MainnetTracker)
  const rawFundTransfers = data.data.fund_transfers?.data?.fundTransfers || []
  const fundTransfers = rawFundTransfers.map(f => {
    const fallback = f.amount && f.amount.length > 12
      ? { symbol: '?', decimals: 18 }
      : { symbol: '??', decimals: 6 }
    const assetInfo = ASSET_REGISTRY[f.assetAddress] || {
      symbol: f.coin || f.token || f.asset || f.symbol || fallback.symbol,
      decimals: f.decimals || fallback.decimals
    }
    const isType2 = f.transferType === 2
    return {
      stmp: f.blockTimestamp,
      amount: f.amount,
      decimals: assetInfo.decimals,
      coin: assetInfo.symbol,
      type: isType2 ? 'Spot to Fund Transfer' : 'Chain Transfer',
    }
  })

  const items = [
    // 1. Current Positions (as Opened events)
    ...openPositions.map((p, i) => {
      const isLongSide = p.positionSide === 'LONG' || p.positionSide === '2' || p.positionSide === 2
      const timestamp = p.updateTime || 0
      return {
        id: `pos-${p.symbol}-${i}`,
        type: 'Trade Opened',
        subType: `${isLongSide ? 'Long' : 'Short'} Opened`,
        rawSymbol: p.symbol || '',
        size: p.positionSize,
        status: isLongSide ? 'pos' : 'neg',
        timestamp: timestamp > 1e12 ? timestamp : timestamp * 1000
      }
    }),
    // 2. Closed Trades
    ...positionHistory.map((p, i) => {
      const isLong = parseInt(p.position_side) === 2
      const ts = new Date(p.updated_at).getTime()
      return {
        id: `trade-${p.symbol_id}-${p.updated_at}-${i}`,
        type: 'Trade Closed',
        subType: `${isLong ? 'Long' : 'Short'} Closed`,
        rawSymbol: p.symbol || '',
        size: p.max_size,
        pnl: parseFloat(p.realized_pnl) || 0,
        status: parseFloat(p.realized_pnl) >= 0 ? 'pos' : 'neg',
        timestamp: isNaN(ts) ? 0 : ts
      }
    }),
    // 3. Transfers/Withdrawals (account flows)
    ...withdrawals.map((w, i) => {
      const meta = getWithdrawalTypeMeta(w)
      const ts = w.stmp || 0
      return {
        id: `withdraw-${w.stmp}-${i}`,
        type: meta.typeLabel,
        rawSymbol: w.coin || '',
        amount: formatCoin(w.amount, w.decimals),
        status: meta.isInternal ? 'internal' : (meta.isDeposit ? 'pos' : 'neg'),
        timestamp: ts > 1e12 ? ts : ts * 1000
      }
    }),
    // 4. Fund Transfers (processed)
    ...fundTransfers.map((f, i) => {
      const ts = f.stmp || 0
      return {
        id: `fund-${f.stmp}-${i}`,
        type: f.type,
        rawSymbol: f.coin || '',
        amount: formatCoin(f.amount, f.decimals),
        status: 'internal',
        timestamp: ts > 1e12 ? ts : ts * 1000
      }
    })
  ]

  return items.sort((a, b) => b.timestamp - a.timestamp || a.id.localeCompare(b.id))
}

// ── Component (renders exactly like MainnetTracker section-activity) ──

export default function ActivityTimelineWidget({ config, onUpdateConfig, editMode }) {
  const { data, isLoading } = useWalletData(config.walletAddress || null)
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE)

  const activityTimeline = useMemo(() => buildTimeline(data), [data])
  const displayedActivity = useMemo(() => activityTimeline.slice(0, displayLimit), [activityTimeline, displayLimit])

  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (displayLimit < activityTimeline.length) {
        setDisplayLimit(prev => prev + PAGE_SIZE)
      }
    }
  }, [displayLimit, activityTimeline.length])

  useEffect(() => { setDisplayLimit(PAGE_SIZE) }, [config.walletAddress])

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

  if (isLoading) return <SkeletonChart />
  if (displayedActivity.length === 0) return <div style={{ padding: 12, color: 'var(--color-text-muted)' }}>No recent activity</div>

  const showCoinLogos = config.showCoinLogos !== false
  const showTransferIcons = config.showTransferIcons !== false
  const showDepositIcons = config.showDepositIcons !== false
  const showWithdrawIcons = config.showWithdrawIcons !== false

  // ── Render ──
  return (
    <div
      onScroll={handleScroll}
      style={{ width: '100%', height: '100%', overflowY: 'auto', padding: '4px 0' }}
    >
      <div className="timeline" style={{ paddingLeft: '12px', paddingRight: '12px', marginTop: '4px' }}>
        {displayedActivity.map((item, idx) => {
          const isTrade = item.type.includes('Trade')
          const coin = getBaseCoin(item.rawSymbol)
          const color = item.status === 'pos' ? 'var(--color-success, #10b981)' :
            item.status === 'neg' ? 'var(--color-error, #ef4444)' :
            item.status === 'internal' ? 'rgba(255,255,255,0.7)' : '#fff'

          return (
            <div key={item.id} className={`timeline-item ${item.status}`} style={{
              borderBottom: idx === displayedActivity.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.06)',
              paddingTop: '6px',
              paddingBottom: '8px',
              marginBottom: '6px',
              marginLeft: '-12px',
              marginRight: '-12px',
              paddingLeft: '24px',
              paddingRight: '12px'
            }}>
              <div className="timeline-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '2px' }}>
                {isTrade ? (
                  showCoinLogos ? (
                  <div className="timeline-icon-box" style={{
                    position: 'absolute', left: '0px', top: '8px',
                    width: '18px', height: '18px', borderRadius: '4px',
                    overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <CoinLogo symbol={coin} size={18} />
                  </div>
                  ) : null
                ) : item.status === 'internal' ? (
                  showTransferIcons ? (
                  <div className="timeline-icon-box" style={{
                    position: 'absolute', left: '0px', top: '8px',
                    width: '18px', height: '18px', borderRadius: '4px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px',
                    background: 'rgba(var(--color-primary-rgb, 72,203,255), 0.12)'
                  }}>
                    <svg width="10" height="5" viewBox="0 0 10 5" fill="none" stroke={color} strokeWidth="0.8"><polyline points="4,0.5 0.5,2.5 4,4.5" /><line x1="1" y1="2.5" x2="9.5" y2="2.5" /></svg>
                    <svg width="10" height="5" viewBox="0 0 10 5" fill="none" stroke={color} strokeWidth="0.8"><polyline points="6,0.5 9.5,2.5 6,4.5" /><line x1="0.5" y1="2.5" x2="9" y2="2.5" /></svg>
                  </div>
                  ) : null
                ) : (item.type === 'Deposit' || item.type === 'Withdraw') ? (
                  ((item.type === 'Deposit' && showDepositIcons) || (item.type === 'Withdraw' && showWithdrawIcons)) ? (
                  <div className="timeline-icon-box" style={{
                    position: 'absolute', left: '0px', top: '8px',
                    width: '18px', height: '18px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: item.type === 'Deposit' ? 'rgba(var(--color-success-rgb), 0.15)' : 'rgba(var(--color-error-rgb), 0.15)'
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none"
                      stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      {item.type === 'Deposit' ? (
                        <><path d="M7 13l5 5 5-5" /><path d="M12 18V6" /></>
                      ) : (
                        <><path d="M7 11l5-5 5 5" /><path d="M12 18V6" /></>
                      )}
                    </svg>
                  </div>
                  ) : null
                ) : (item.status === 'pos' || item.status === 'neg') ? (
                  <div className="timeline-indicator" style={{
                    position: 'absolute', left: '4px', top: '12px',
                    width: '10px', height: '10px', borderRadius: '50%',
                    background: 'transparent', border: `2px solid ${color}`, zIndex: 1
                  }} />
                ) : null}

                <div className="timeline-content" style={{ color: isTrade ? '#fff' : color, fontSize: '11px', fontWeight: '600', paddingLeft: '4px' }}>
                  {isTrade ? (
                    <span>{coin} {item.subType}</span>
                  ) : (
                    <span>{item.type} {coin}</span>
                  )}
                </div>

                <div className="timeline-date" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textAlign: 'right' }}>
                  {formatTimeShort(item.timestamp / 1000)}
                </div>
              </div>

              <div className="timeline-details" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '4px' }}>
                {isTrade ? (
                  <>
                    <div className="timeline-desc" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                      {item.size} {coin}
                    </div>
                    {item.type === 'Trade Closed' && (
                      <div style={{ fontSize: '10px', fontWeight: '600', color }}>
                        {item.pnl >= 0 ? '+' : ''}${formatNumber(item.pnl)}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="timeline-desc" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                      {item.amount || '-'}
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: '500', color: 'rgba(255,255,255,0.2)' }}>
                      Confirmed
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
