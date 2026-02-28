'use client'

import { useMemo, useState } from 'react'
import { useWalletData } from '../../../hooks/useWalletData'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

function toDateStr(ts) {
  const d = new Date(ts)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function formatUsd(n) {
  if (n === null || n === undefined) return '-'
  const sign = n >= 0 ? '+' : ''
  const abs = Math.abs(n)
  if (abs >= 1e6) return sign + '$' + (n / 1e6).toFixed(2) + 'M'
  if (abs >= 1e3) return sign + '$' + (n / 1e3).toFixed(2) + 'K'
  return sign + '$' + n.toFixed(2)
}

function getCellColor(pnl, maxAbs) {
  if (pnl === null || pnl === undefined) return 'transparent'
  if (maxAbs === 0) return 'rgba(255,255,255,0.04)'
  const intensity = Math.min(Math.abs(pnl) / maxAbs, 1)
  const alpha = 0.15 + intensity * 0.65
  if (pnl >= 0) return `rgba(16, 185, 129, ${alpha})`
  return `rgba(239, 68, 68, ${alpha})`
}

export default function PnlCalendarWidget({ config, onUpdateConfig }) {
  const { data, isLoading } = useWalletData(config.walletAddress || null)
  const [hoveredDay, setHoveredDay] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  // Month navigation offset from current month
  const [monthOffset, setMonthOffset] = useState(0)

  const pnlMap = useMemo(() => {
    const items = data?.data?.daily_pnl?.data?.items
    if (!items || items.length === 0) return {}

    const sorted = [...items].sort((a, b) => a.ts_ms - b.ts_ms)
    const map = {}
    for (let i = 0; i < sorted.length; i++) {
      const cumPnl = parseFloat(sorted[i].pnl || 0)
      const prevPnl = i === 0 ? 0 : parseFloat(sorted[i - 1].pnl || 0)
      map[toDateStr(sorted[i].ts_ms)] = cumPnl - prevPnl
    }
    return map
  }, [data])

  const calendarData = useMemo(() => {
    const now = new Date()
    const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const days = []
    let maxAbs = 0

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0')
      const pnl = pnlMap[dateStr] ?? null
      if (pnl !== null) maxAbs = Math.max(maxAbs, Math.abs(pnl))
      days.push({ day: d, dateStr, pnl })
    }

    return { year, month, firstDay, days, maxAbs, monthLabel: MONTH_NAMES[month] + ' ' + year }
  }, [pnlMap, monthOffset])

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

  const { firstDay, days, maxAbs, monthLabel } = calendarData

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {/* Month header + nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 6px', flexShrink: 0 }}>
        <button
          onClick={() => setMonthOffset(p => p - 1)}
          style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 14, padding: '0 6px' }}
        >
          ‹
        </button>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{monthLabel}</span>
        <button
          onClick={() => setMonthOffset(p => Math.min(p + 1, 0))}
          style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 14, padding: '0 6px' }}
        >
          ›
        </button>
      </div>

      {/* Day names */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, padding: '0 2px', flexShrink: 0 }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 9, color: 'var(--color-text-muted)', padding: '0 0 3px' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, padding: '0 2px', flex: 1, minHeight: 0, alignContent: 'start' }}>
        {/* Empty cells for offset */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={'empty-' + i} />
        ))}
        {/* Day cells */}
        {days.map(({ day, dateStr, pnl }) => (
          <div
            key={dateStr}
            onMouseEnter={(e) => {
              setHoveredDay({ dateStr, pnl, day })
              const rect = e.currentTarget.getBoundingClientRect()
              const parent = e.currentTarget.closest('[style]')?.getBoundingClientRect() || { left: 0, top: 0 }
              setTooltipPos({ x: rect.left - parent.left + rect.width / 2, y: rect.top - parent.top - 4 })
            }}
            onMouseLeave={() => setHoveredDay(null)}
            style={{
              aspectRatio: '1',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
              fontWeight: 500,
              color: pnl !== null ? (pnl >= 0 ? 'var(--color-success, #10b981)' : 'var(--color-error, #ef4444)') : 'var(--color-text-muted)',
              background: getCellColor(pnl, maxAbs),
              cursor: pnl !== null ? 'pointer' : 'default',
              transition: 'transform 0.1s',
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {hoveredDay && hoveredDay.pnl !== null && (
        <div style={{
          position: 'absolute',
          left: tooltipPos.x,
          top: tooltipPos.y,
          transform: 'translate(-50%, -100%)',
          background: 'rgba(12,12,12,0.98)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 6,
          padding: '4px 8px',
          fontSize: 10,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 10,
          color: 'var(--color-text)',
        }}>
          <div style={{ color: 'var(--color-text-muted)', marginBottom: 1 }}>{hoveredDay.dateStr}</div>
          <div style={{ fontWeight: 600, color: hoveredDay.pnl >= 0 ? 'var(--color-success, #10b981)' : 'var(--color-error, #ef4444)' }}>
            {formatUsd(hoveredDay.pnl)}
          </div>
        </div>
      )}
    </div>
  )
}
