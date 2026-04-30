'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Star, X, Copy as CopyIcon } from 'lucide-react'
import { cn } from '@/app/lib/utils'
import { Button } from '@/app/components/ui/button'
import TraderCalendar from './TraderCalendar'
import FollowWizard from './FollowWizard'
import TagEditor from './TagEditor'
import { supabase } from '../../lib/supabaseClient'
import {
  perpsPositions,
  perpsOrders,
  perpsPositionHistory,
} from '../../lib/sodexApi'

const fmt = (n, prefix = '$') => {
  if (n == null || isNaN(n)) return '—'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : '+'
  if (abs >= 1e6) return prefix + sign + (abs / 1e6).toFixed(2) + 'M'
  if (abs >= 1e3) return prefix + sign + (abs / 1e3).toFixed(1) + 'K'
  return prefix + sign + abs.toFixed(2)
}

const relTime = (ts) => {
  if (!ts) return '—'
  const diff = (Date.now() - new Date(ts).getTime()) / 1000
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const normSide = (side) => {
  if (!side) return '—'
  const s = side.toString().toLowerCase()
  if (s.includes('long') || s === '1' || s === 'buy') return 'LONG'
  if (s.includes('short') || s === '2' || s === 'sell') return 'SHORT'
  return side.toUpperCase()
}
const invertSide = (side) => {
  const s = normSide(side)
  if (s === 'LONG') return 'SHORT'
  if (s === 'SHORT') return 'LONG'
  return s
}

const TABS = ['Overview', 'Positions', 'Orders', 'Trades', 'Calendar', 'Follow']

// ─── Shared small components ─────────────────────────────────────────────────

function TabMsg({ children, color = '' }) {
  return (
    <div className={cn('p-8 text-center text-sm', color || 'text-muted-foreground')}>
      {children}
    </div>
  )
}

function InverseBanner() {
  return (
    <div className="inline-block mb-3 px-2 py-1 text-xs font-semibold rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
      Showing INVERSE view
    </div>
  )
}

function StatChip({ label, value, color = '' }) {
  return (
    <div className="flex-1 min-w-[80px] px-3 py-2 rounded-lg border bg-muted/50 flex flex-col gap-0.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-bold', color || 'text-foreground')}>{value}</span>
    </div>
  )
}

// ─── Tab components ──────────────────────────────────────────────────────────

function OverviewTab({ wallet, inverse }) {
  const [chart, setChart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/public/wallet/${wallet}`)
      .then(r => r.json())
      .then(json => {
        const items = json?.data?.daily_pnl?.data?.items ?? json?.data?.daily_pnl?.items
        if (items && items.length > 0) {
          const sorted = [...items].sort((a, b) => a.ts_ms - b.ts_ms)
          const points = sorted.map(item => ({
            date: new Date(item.ts_ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            pnl: parseFloat(item.pnl || 0) * (inverse ? -1 : 1),
          }))
          setChart(points)
          return
        }
        return perpsPositionHistory(wallet, { limit: 100 })
          .then(rows => {
            const arr = Array.isArray(rows) ? rows : []
            arr.sort((a, b) => +new Date(a.closedAt ?? a.updatedAt ?? 0) - +new Date(b.closedAt ?? b.updatedAt ?? 0))
            let cum = 0
            const points = arr.map(p => {
              const pnl = parseFloat(p.realizedPnl ?? p.realized_pnl ?? 0)
              cum += inverse ? -pnl : pnl
              return {
                date: new Date(p.closedAt ?? p.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                pnl: parseFloat(cum.toFixed(2)),
              }
            })
            setChart(points)
          })
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [wallet, inverse])

  if (loading) return <TabMsg>Loading chart…</TabMsg>
  if (error) return <TabMsg color="text-red-500">Failed to load: {error}</TabMsg>
  if (!chart?.length) return <TabMsg>No PnL history found.</TabMsg>

  const last = chart[chart.length - 1]?.pnl ?? 0
  const lineColor = last >= 0 ? '#22c55e' : '#ef4444'

  return (
    <div>
      {inverse && <InverseBanner />}
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} tickFormatter={v => `$${v}`} width={58} />
          <Tooltip
            formatter={(v) => [`$${v}`, inverse ? 'Inverse Cum. PnL' : 'Cum. PnL']}
            contentStyle={{
              background: 'var(--popover)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 11,
              color: 'var(--popover-foreground)',
            }}
          />
          <Line type="monotone" dataKey="pnl" stroke={lineColor} dot={false} strokeWidth={2} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function DataTable({ headers, children, inverse }) {
  return (
    <div className="overflow-x-auto">
      {inverse && <InverseBanner />}
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-border">
            {headers.map((h, i) => (
              <th
                key={h}
                className={cn(
                  'px-3 py-2 font-medium text-[11px] text-muted-foreground',
                  i === 0 ? 'text-left' : 'text-right',
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

function PositionsTab({ wallet, inverse }) {
  const [rows, setRows] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    perpsPositions(wallet)
      .then(data => {
        const arr = data?.positions ?? (Array.isArray(data) ? data : data ? [data] : [])
        setRows(arr)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [wallet])

  if (loading) return <TabMsg>Loading…</TabMsg>
  if (error) return <TabMsg color="text-red-500">Error: {error}</TabMsg>
  if (!rows?.length) return <TabMsg>No open positions.</TabMsg>

  return (
    <DataTable headers={['Symbol', 'Side', 'Size', 'Entry', 'Mark', 'Unreal. PnL']} inverse={inverse}>
      {rows.map((p, i) => {
        const side = inverse ? invertSide(p.side) : normSide(p.side)
        const rawPnl = parseFloat(p.unrealizedProfit ?? p.unRealizedProfit ?? p.unrealizedPnl ?? 0)
        const pnl = inverse ? -rawPnl : rawPnl
        return (
          <tr key={i} className="border-b border-border">
            <td className="px-3 py-2 text-foreground">{p.symbol ?? '—'}</td>
            <td className={cn('px-3 py-2 text-right font-semibold', side === 'LONG' ? 'text-emerald-500' : 'text-red-500')}>{side}</td>
            <td className="px-3 py-2 text-right text-foreground">{parseFloat(p.size ?? p.positionAmt ?? 0).toFixed(4)}</td>
            <td className="px-3 py-2 text-right text-foreground">${parseFloat(p.avgEntryPrice ?? p.entryPrice ?? 0).toFixed(4)}</td>
            <td className="px-3 py-2 text-right text-foreground">${parseFloat(p.markPrice ?? p.price ?? 0).toFixed(4)}</td>
            <td className={cn('px-3 py-2 text-right font-semibold', pnl >= 0 ? 'text-emerald-500' : 'text-red-500')}>{fmt(pnl)}</td>
          </tr>
        )
      })}
    </DataTable>
  )
}

function OrdersTab({ wallet, inverse }) {
  const [rows, setRows] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    perpsOrders(wallet)
      .then(data => {
        const arr = data?.orders ?? (Array.isArray(data) ? data : data ? [data] : [])
        setRows(arr)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [wallet])

  if (loading) return <TabMsg>Loading…</TabMsg>
  if (error) return <TabMsg color="text-red-500">Error: {error}</TabMsg>
  if (!rows?.length) return <TabMsg>No open orders.</TabMsg>

  return (
    <DataTable headers={['Symbol', 'Side', 'Type', 'Size', 'Price', 'Status']} inverse={inverse}>
      {rows.map((o, i) => {
        const side = inverse ? invertSide(o.side) : normSide(o.side)
        return (
          <tr key={i} className="border-b border-border">
            <td className="px-3 py-2 text-foreground">{o.symbol ?? '—'}</td>
            <td className={cn('px-3 py-2 text-right font-semibold', side === 'LONG' ? 'text-emerald-500' : 'text-red-500')}>{side}</td>
            <td className="px-3 py-2 text-right text-muted-foreground">{o.type ?? o.orderType ?? '—'}</td>
            <td className="px-3 py-2 text-right text-foreground">{parseFloat(o.size ?? o.quantity ?? o.origQty ?? 0).toFixed(4)}</td>
            <td className="px-3 py-2 text-right text-foreground">${parseFloat(o.price ?? 0).toFixed(4)}</td>
            <td className="px-3 py-2 text-right text-muted-foreground">{o.status ?? '—'}</td>
          </tr>
        )
      })}
    </DataTable>
  )
}

function TradesTab({ wallet, inverse }) {
  const [rows, setRows] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    perpsPositionHistory(wallet, { limit: 50 })
      .then(data => {
        const arr = Array.isArray(data) ? data : []
        setRows(arr)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [wallet])

  if (loading) return <TabMsg>Loading…</TabMsg>
  if (error) return <TabMsg color="text-red-500">Error: {error}</TabMsg>
  if (!rows?.length) return <TabMsg>No closed trades.</TabMsg>

  return (
    <DataTable headers={['Symbol', 'Side', 'Size', 'Entry', 'Close', 'PnL', 'Time']} inverse={inverse}>
      {rows.map((t, i) => {
        const side = inverse ? invertSide(t.side) : normSide(t.side)
        const rawPnl = parseFloat(t.realizedPnl ?? t.realized_pnl ?? t.realizedProfit ?? 0)
        const pnl = inverse ? -rawPnl : rawPnl
        return (
          <tr key={i} className="border-b border-border">
            <td className="px-3 py-2 text-foreground">{t.symbol ?? '—'}</td>
            <td className={cn('px-3 py-2 text-right font-semibold', side === 'LONG' ? 'text-emerald-500' : 'text-red-500')}>{side}</td>
            <td className="px-3 py-2 text-right text-foreground">{parseFloat(t.size ?? t.quantity ?? 0).toFixed(4)}</td>
            <td className="px-3 py-2 text-right text-foreground">${parseFloat(t.entryPrice ?? t.avgEntryPrice ?? 0).toFixed(4)}</td>
            <td className="px-3 py-2 text-right text-foreground">${parseFloat(t.closePrice ?? t.exitPrice ?? t.closeAvgPrice ?? 0).toFixed(4)}</td>
            <td className={cn('px-3 py-2 text-right font-semibold', pnl >= 0 ? 'text-emerald-500' : 'text-red-500')}>{fmt(pnl)}</td>
            <td className="px-3 py-2 text-right text-muted-foreground">{relTime(t.closedAt ?? t.updatedAt)}</td>
          </tr>
        )
      })}
    </DataTable>
  )
}

function CalendarTab({ wallet, inverse }) {
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/public/wallet/${wallet}`)
      .then(r => r.json())
      .then(json => {
        const items = json?.data?.daily_pnl?.data?.items ?? json?.data?.daily_pnl?.items
        if (items && items.length > 0) {
          const rows = items.map(item => ({
            date: new Date(item.ts_ms),
            pnl: parseFloat(item.pnl || 0),
          }))
          const sorted = [...rows].sort((a, b) => +a.date - +b.date)
          const daily = sorted.map((r, i) => ({
            date: r.date,
            pnl: i === 0 ? r.pnl : r.pnl - sorted[i - 1].pnl,
          }))
          setHistory(daily)
          return
        }
        return perpsPositionHistory(wallet, { limit: 100 })
          .then(data => {
            const arr = Array.isArray(data) ? data : []
            setHistory(arr.map(p => ({
              date: new Date(p.closedAt ?? p.updatedAt ?? 0),
              pnl: parseFloat(p.realizedPnl ?? p.realized_pnl ?? 0),
            })))
          })
      })
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [wallet])

  if (loading) return <TabMsg>Loading…</TabMsg>
  return <TraderCalendar history={history ?? []} inverse={inverse} />
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────

export default function TraderDetailModal({ wallet, leaderboardRow, initialInverse, onClose }) {
  const [activeTab, setActiveTab] = useState('Overview')
  const [inverse, setInverse] = useState(!!initialInverse)
  const [copied, setCopied] = useState(false)
  const [width, setWidth] = useState(480)
  const [mounted, setMounted] = useState(false)
  const [watching, setWatching] = useState(false)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startW = useRef(0)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data?.user || !wallet) return
      const { data: row } = await supabase
        .from('watchlist_wallets')
        .select('wallet_address')
        .eq('user_id', data.user.id)
        .eq('wallet_address', wallet)
        .maybeSingle()
      setWatching(!!row)
    })
  }, [wallet])

  const toggleWatch = useCallback(async () => {
    const { data } = await supabase.auth.getUser()
    if (!data?.user) return
    if (watching) {
      await supabase.from('watchlist_wallets').delete()
        .eq('user_id', data.user.id).eq('wallet_address', wallet)
    } else {
      await supabase.from('watchlist_wallets')
        .upsert({ user_id: data.user.id, wallet_address: wallet })
    }
    setWatching(v => !v)
  }, [wallet, watching])

  const pnl = leaderboardRow?.total_follower_pnl ?? null
  const volume = leaderboardRow?.volume ?? null
  const winRate = leaderboardRow?.win_rate_pct ?? null
  const rank = leaderboardRow?.pnl_rank ?? null
  const short = wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : ''

  const copyAddress = useCallback(() => {
    navigator.clipboard.writeText(wallet ?? '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [wallet])

  const onDragStart = useCallback((e) => {
    dragging.current = true
    startX.current = e.clientX
    startW.current = width
    e.preventDefault()
  }, [width])

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return
      const delta = startX.current - e.clientX
      setWidth(Math.min(820, Math.max(300, startW.current + delta)))
    }
    const onUp = () => { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  if (!mounted) return null

  const sidebar = (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
      />

      {/* Sidebar panel */}
      <div
        className="fixed top-0 right-0 z-[9999] h-screen flex flex-col overflow-hidden border-l border-border bg-popover text-popover-foreground shadow-2xl"
        style={{ width, minWidth: 300, maxWidth: 820 }}
      >
        {/* Drag handle on left edge */}
        <div
          onMouseDown={onDragStart}
          className="absolute top-0 left-0 w-1.5 h-full cursor-ew-resize z-10 hover:bg-primary/40 transition-colors"
        />

        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-semibold text-foreground">{short}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={copyAddress}
              className={cn('h-6 px-2 text-[10px]', copied && 'text-emerald-500')}
            >
              {copied ? 'Copied!' : <><CopyIcon className="size-3 mr-1" />Copy</>}
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={toggleWatch}
              title={watching ? 'Remove from watchlist' : 'Add to watchlist'}
              className={cn(watching ? 'text-amber-500' : 'text-muted-foreground')}
            >
              <Star className="size-4" fill={watching ? 'currentColor' : 'none'} />
            </Button>
            {rank != null && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary/15 text-primary">
                #{rank}
              </span>
            )}
            <div className="flex-1" />

            {/* Follow button */}
            <Button size="sm" onClick={() => setActiveTab('Follow')}>Follow</Button>

            {/* Inverse / Original toggle */}
            <Button
              variant={inverse ? 'outline' : 'secondary'}
              size="sm"
              onClick={() => setInverse(v => !v)}
              className={cn(
                'rounded-full',
                inverse && 'border-amber-500 bg-amber-500/10 text-amber-500',
              )}
            >
              {inverse ? '↕ Inverse' : 'Original'}
            </Button>

            {/* Close */}
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
              <X className="size-4" />
            </Button>
          </div>

          {/* Stats row */}
          <div className="flex gap-1.5 mt-3 flex-wrap">
            <StatChip
              label="Total PnL"
              value={fmt(pnl != null && inverse ? -pnl : pnl)}
              color={pnl == null ? '' : (inverse ? pnl <= 0 : pnl >= 0) ? 'text-emerald-500' : 'text-red-500'}
            />
            <StatChip label="Volume" value={fmt(volume)} />
            {winRate != null && (
              <StatChip
                label="Win Rate"
                value={inverse ? (100 - winRate).toFixed(1) + '%' : winRate + '%'}
                color={(!inverse ? winRate : 100 - winRate) >= 50 ? 'text-emerald-500' : 'text-red-500'}
              />
            )}
            {rank != null && <StatChip label="Rank" value={'#' + rank} color="text-primary" />}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-0 px-3 border-b border-border flex-shrink-0 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={cn(
                'px-3 py-2 text-xs whitespace-nowrap transition-colors border-b-2',
                activeTab === t
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'Overview' && (
            <div className="flex flex-col gap-4">
              <OverviewTab wallet={wallet} inverse={inverse} />
              <div className="border-t border-border pt-4">
                <TagEditor wallet={wallet} />
              </div>
            </div>
          )}
          {activeTab === 'Positions' && <PositionsTab wallet={wallet} inverse={inverse} />}
          {activeTab === 'Orders'    && <OrdersTab    wallet={wallet} inverse={inverse} />}
          {activeTab === 'Trades'    && <TradesTab    wallet={wallet} inverse={inverse} />}
          {activeTab === 'Calendar'  && <CalendarTab  wallet={wallet} inverse={inverse} />}
          {activeTab === 'Follow'    && <FollowWizard wallet={wallet} initialInverse={inverse} onClose={onClose} />}
        </div>
      </div>
    </>
  )

  return createPortal(sidebar, document.body)
}
