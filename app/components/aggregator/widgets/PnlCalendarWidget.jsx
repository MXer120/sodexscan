'use client'

import { useMemo, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useWalletData } from '../../../hooks/useWalletData'
import { useTheme } from '../../../lib/ThemeContext'
import { hexToRgb } from '../../../lib/themes'

const NEUTRAL_COLOR = 'rgba(255,255,255,0.35)'

// ── Helpers (mirrored from PnlCalendar.jsx) ─────────────────────

const getPnlBgColor = (pnl, minPnl, maxPnl, isBestDay, theme) => {
  const primaryRgb = hexToRgb(theme.accentColor)
  const bullishRgb = hexToRgb(theme.bullishColor)
  const bearishRgb = hexToRgb(theme.bearishColor)

  if (isBestDay && pnl > 0.01) return `rgba(${primaryRgb}, 0.25)`
  if (Math.abs(pnl) < 0.01) return 'rgba(255,255,255,0.04)'

  if (pnl >= 0.01) {
    const intensity = maxPnl > 0 ? Math.min(pnl / maxPnl, 1) : 0
    const alpha = 0.08 + intensity * 0.17
    return `rgba(${bullishRgb}, ${alpha})`
  } else {
    const intensity = minPnl < 0 ? Math.min(Math.abs(pnl) / Math.abs(minPnl), 1) : 0
    const alpha = 0.08 + intensity * 0.17
    return `rgba(${bearishRgb}, ${alpha})`
  }
}

const getPnlTextColor = (pnl, isBestDay, theme) => {
  if (isBestDay && pnl > 0.01) return theme.accentColor
  if (pnl >= 0.01) return theme.bullishColor
  if (pnl <= -0.01) return theme.bearishColor
  return NEUTRAL_COLOR
}

const getWeekStart = (date) => {
  const d = new Date(date)
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
  const res = new Date(d)
  res.setUTCDate(diff)
  return res
}

const formatCompact = (num) => {
  if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toFixed(0)
}

const formatPnl = (pnl) => {
  if (Math.abs(pnl) < 0.01) return '$0'
  const prefix = pnl >= 0.01 ? '+$' : '-$'
  return prefix + formatCompact(Math.abs(pnl))
}

const getLongestStreak = (dailyData) => {
  let maxStreak = 0
  let currentStreak = 0
  Object.keys(dailyData).sort().forEach(date => {
    if (dailyData[date] > 0) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 0
    }
  })
  return maxStreak
}

function toDateStr(ts) {
  const d = new Date(ts)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

// ── Main Widget ─────────────────────────────────────────────────

export default function PnlCalendarWidget({ config, onUpdateConfig }) {
  const { data, isLoading } = useWalletData(config.walletAddress || null)
  const { theme } = useTheme()
  const BULLISH_COLOR = theme.bullishColor
  const BEARISH_COLOR = theme.bearishColor
  const PRIMARY_COLOR = theme.accentColor

  const view = config.view || 'rolling'

  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [hoveredDay, setHoveredDay] = useState(null)

  // Build daily PnL map from wallet data
  const dailyPnlMap = useMemo(() => {
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

  // Calculate stats based on view period
  const stats = useMemo(() => {
    let startDate, endDate
    const now = new Date(currentDate)

    if (view === 'weekly') {
      startDate = getWeekStart(now)
      endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 6)
    } else if (view === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    } else if (view === 'yearly') {
      startDate = new Date(now.getFullYear(), 0, 1)
      endDate = new Date(now.getFullYear(), 11, 31)
    } else {
      // rolling — 365-day window ending at currentDate
      endDate = new Date(now)
      startDate = new Date(endDate)
      startDate.setDate(startDate.getDate() - 364)
    }

    let totalPnl = 0, winDays = 0, lossDays = 0, winTotal = 0, lossTotal = 0
    let minPnl = 0, maxPnl = 0, bestDay = null, bestDayPnl = -Infinity
    const periodDailyData = {}

    const current = new Date(startDate)
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0]
      const pnl = dailyPnlMap[dateStr] || 0

      if (pnl !== 0 || dailyPnlMap[dateStr] !== undefined) {
        periodDailyData[dateStr] = pnl
        totalPnl += pnl
        if (pnl > 0) { winDays++; winTotal += pnl; if (pnl > bestDayPnl) { bestDayPnl = pnl; bestDay = dateStr } }
        else if (pnl < 0) { lossDays++; lossTotal += pnl }
        minPnl = Math.min(minPnl, pnl)
        maxPnl = Math.max(maxPnl, pnl)
      }
      current.setDate(current.getDate() + 1)
    }

    return { totalPnl, winDays, lossDays, winTotal, lossTotal, minPnl, maxPnl, bestDay, streak: getLongestStreak(periodDailyData) }
  }, [dailyPnlMap, currentDate, view])

  // Navigate periods
  const navigate = (direction) => {
    const newDate = new Date(currentDate)
    if (view === 'weekly') newDate.setDate(newDate.getDate() + direction * 7)
    else if (view === 'monthly') newDate.setMonth(newDate.getMonth() + direction)
    else newDate.setFullYear(newDate.getFullYear() + direction)
    setCurrentDate(newDate)
  }

  const getPeriodLabel = () => {
    if (view === 'weekly') {
      const start = getWeekStart(currentDate)
      const end = new Date(start); end.setDate(end.getDate() + 6)
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    } else if (view === 'monthly') {
      return currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    } else if (view === 'yearly') {
      return currentDate.getFullYear().toString()
    }
    // rolling
    const end = new Date(currentDate)
    const start = new Date(end)
    start.setDate(start.getDate() - 364)
    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    return `${fmt(start)} → ${fmt(end)}`
  }

  const totalDays = stats.winDays + stats.lossDays
  const winRatio = totalDays > 0 ? (stats.winDays / totalDays) * 100 : 50

  const handleViewChange = (v) => {
    onUpdateConfig({ ...config, view: v })
  }

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

  // ── Weekly view ───────────────────────────────────────────────
  const renderWeeklyCalendar = () => {
    const weekStart = getWeekStart(currentDate)
    const days = []
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setUTCDate(date.getUTCDate() + i)
      const dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
      const pnl = dailyPnlMap[dateStr] || 0
      const isBestDay = dateStr === stats.bestDay
      const bgColor = getPnlBgColor(pnl, stats.minPnl, stats.maxPnl, isBestDay, theme)
      const textColor = getPnlTextColor(pnl, isBestDay, theme)

      days.push(
        <div key={i}
          onClick={() => setSelectedDate(dateStr)}
          style={{
            flex: 1, aspectRatio: '1', display: 'flex', flexDirection: 'column',
            background: bgColor, borderRadius: 'clamp(3px, 0.5vw, 6px)',
            padding: 'clamp(4px, 0.8vw, 8px)',
            border: isBestDay ? `1px solid ${PRIMARY_COLOR}` : '1px solid rgba(255,255,255,0.05)',
            boxSizing: 'border-box', minWidth: '40px', maxWidth: 'min(80px, 12vw)',
            cursor: 'pointer', transition: 'transform 0.1s ease', position: 'relative'
          }}>
          <div style={{ fontSize: 'clamp(7px, 1.2vw, 9px)', color: isBestDay ? PRIMARY_COLOR : 'rgba(255,255,255,0.4)', lineHeight: 1 }}>{dayNames[i]}</div>
          <div style={{ fontSize: 'clamp(8px, 1.4vw, 11px)', color: isBestDay ? PRIMARY_COLOR : 'rgba(255,255,255,0.6)', lineHeight: 1.2, marginTop: '2px' }}>{date.getDate()}</div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 'clamp(9px, 1.6vw, 13px)', fontWeight: '600', color: textColor }}>{formatPnl(pnl)}</div>
          </div>
        </div>
      )
    }

    return (
      <div style={{ display: 'flex', gap: 'clamp(3px, 0.8vw, 8px)', flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%', minWidth: 0 }}>
        {days}
      </div>
    )
  }

  // ── Monthly view ──────────────────────────────────────────────
  const renderMonthlyCalendar = () => {
    const year = currentDate.getUTCFullYear()
    const month = currentDate.getUTCMonth()
    const firstDay = new Date(Date.UTC(year, month, 1))
    const lastDay = new Date(Date.UTC(year, month + 1, 0))
    const startOffset = (firstDay.getUTCDay() + 6) % 7
    const cells = []

    for (let i = 0; i < startOffset; i++) cells.push(<div key={`empty-${i}`} />)

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const pnl = dailyPnlMap[dateStr] || 0
      const isBestDay = dateStr === stats.bestDay
      const bgColor = getPnlBgColor(pnl, stats.minPnl, stats.maxPnl, isBestDay, theme)
      const textColor = getPnlTextColor(pnl, isBestDay, theme)

      cells.push(
        <div key={d}
          onClick={() => setSelectedDate(dateStr)}
          style={{
            aspectRatio: '1', display: 'flex', flexDirection: 'column',
            background: bgColor, borderRadius: 'clamp(2px, 0.4vw, 4px)',
            padding: 'clamp(2px, 0.4vw, 4px)',
            border: isBestDay ? `1px solid ${PRIMARY_COLOR}` : '1px solid transparent',
            boxSizing: 'border-box', minWidth: '30px', maxWidth: 'min(100px, 14vw)',
            cursor: 'pointer', transition: 'transform 0.1s ease'
          }}>
          <div style={{ fontSize: 'clamp(7px, 1.2vw, 9px)', color: isBestDay ? PRIMARY_COLOR : 'rgba(255,255,255,0.5)', lineHeight: 1 }}>{d}</div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 'clamp(8px, 1.4vw, 12px)', fontWeight: '600', color: textColor, textAlign: 'center' }}>{formatPnl(pnl)}</div>
          </div>
        </div>
      )
    }

    const totalCells = cells.length
    const remainder = totalCells % 7
    if (remainder > 0) for (let i = 0; i < 7 - remainder; i++) cells.push(<div key={`empty-end-${i}`} />)

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '725px', margin: '0 auto', minWidth: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'clamp(2px, 0.4vw, 4px)', marginBottom: 'clamp(4px, 0.6vw, 8px)' }}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 'clamp(7px, 1.2vw, 10px)', color: 'rgba(255,255,255,0.4)' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'clamp(2px, 0.4vw, 4px)', alignContent: 'start', flex: 1, minHeight: '200px' }}>
          {cells}
        </div>
      </div>
    )
  }

  // ── Yearly view (GitHub-style, rolling 365-day window) ───────
  const renderYearlyCalendar = () => {
    const cellWidth = typeof window !== 'undefined' ? (window.innerWidth < 600 ? 11 : window.innerWidth < 900 ? 10 : window.innerWidth < 1920 ? 12 : 14) : 12
    const cellGap = 2

    // Rolling 365-day window ending at currentDate
    const endDate = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()))
    const startDate = new Date(endDate)
    startDate.setUTCDate(startDate.getUTCDate() - 364)

    // Align grid start to Monday of start week
    const startDow = (startDate.getUTCDay() + 6) % 7 // Mon=0
    const gridStart = new Date(startDate)
    gridStart.setUTCDate(gridStart.getUTCDate() - startDow)

    const weeks = []
    const monthLabels = []
    const seenMonths = new Set()
    const current = new Date(gridStart)
    let weekIndex = 0

    while (current <= endDate) {
      const week = []
      for (let d = 0; d < 7; d++) {
        const inRange = current >= startDate && current <= endDate
        if (!inRange) {
          week.push(<div key={`${weekIndex}-${d}`} style={{ width: `${cellWidth}px`, height: `${cellWidth}px`, background: 'transparent', borderRadius: '1px' }} />)
          current.setUTCDate(current.getUTCDate() + 1)
          continue
        }
        const dateStr = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, '0')}-${String(current.getUTCDate()).padStart(2, '0')}`
        const monthKey = `${current.getUTCFullYear()}-${current.getUTCMonth()}`
        if (current.getUTCDate() === 1 && !seenMonths.has(monthKey)) {
          seenMonths.add(monthKey)
          monthLabels.push({ label: current.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }), wi: weekIndex })
        }
        const pnl = dailyPnlMap[dateStr] || 0
        const isBestDay = dateStr === stats.bestDay
        let bgColor = 'rgba(255,255,255,0.06)'
        if (Math.abs(pnl) >= 0.01 || dailyPnlMap[dateStr] !== undefined) {
          bgColor = getPnlBgColor(pnl, stats.minPnl, stats.maxPnl, isBestDay, theme)
        }
        week.push(
          <div key={dateStr}
            onClick={() => setSelectedDate(dateStr)}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              setHoveredDay({ date: dateStr, pnl, x: rect.left + rect.width / 2, y: rect.top })
            }}
            onMouseLeave={() => setHoveredDay(null)}
            style={{
              width: `${cellWidth}px`, height: `${cellWidth}px`,
              background: bgColor, borderRadius: '1px',
              border: isBestDay ? `1px solid ${PRIMARY_COLOR}` : 'none',
              boxSizing: 'border-box', cursor: 'pointer'
            }} />
        )
        current.setUTCDate(current.getUTCDate() + 1)
      }
      weeks.push(
        <div key={weekIndex} style={{ display: 'flex', flexDirection: 'column', gap: `${cellGap}px`, flexShrink: 0 }}>
          {week}
        </div>
      )
      weekIndex++
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, width: '100%', minWidth: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', overflowY: 'hidden', paddingBottom: '4px' }}>
          <div style={{
            display: 'flex', marginBottom: 'clamp(2px, 0.4vw, 4px)',
            marginLeft: typeof window !== 'undefined' && window.innerWidth < 600 ? '12px' : '18px',
            fontSize: 'clamp(7px, 1.2vw, 10px)', color: 'rgba(255,255,255,0.4)',
            position: 'relative', height: 'clamp(10px, 1.8vw, 14px)', minWidth: 'max-content'
          }}>
            {monthLabels.map(({ label, wi }) => (
              <div key={`${label}-${wi}`} style={{ position: 'absolute', left: `${wi * (cellWidth + cellGap)}px`, whiteSpace: 'nowrap' }}>{label}</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: `${cellGap}px`, minWidth: 'max-content' }}>
            <div style={{
              display: 'flex', flexDirection: 'column', gap: `${cellGap}px`,
              marginRight: 'clamp(4px, 0.6vw, 8px)',
              fontSize: 'clamp(6px, 1vw, 8px)', color: 'rgba(255,255,255,0.3)',
              flexShrink: 0,
            }}>
              <div style={{ height: `${cellWidth}px`, display: 'flex', alignItems: 'center' }}>M</div>
              <div style={{ height: `${cellWidth}px` }} />
              <div style={{ height: `${cellWidth}px`, display: 'flex', alignItems: 'center' }}>W</div>
              <div style={{ height: `${cellWidth}px` }} />
              <div style={{ height: `${cellWidth}px`, display: 'flex', alignItems: 'center' }}>F</div>
              <div style={{ height: `${cellWidth}px` }} />
              <div style={{ height: `${cellWidth}px`, display: 'flex', alignItems: 'center' }}>S</div>
            </div>
            <div style={{ display: 'flex', gap: `${cellGap}px`, flexShrink: 0 }}>{weeks}</div>
          </div>
        </div>
      </div>
    )
  }

  // ── Calendar year view (Jan 1 - Dec 31) ────────────────────
  const renderCalendarYearCalendar = () => {
    const year = currentDate.getFullYear()
    const cellWidth = typeof window !== 'undefined' ? (window.innerWidth < 600 ? 11 : window.innerWidth < 900 ? 10 : window.innerWidth < 1920 ? 12 : 14) : 12
    const cellGap = 2
    const weeks = []
    const monthPositions = Array(12).fill(0)

    const startYear = new Date(Date.UTC(year, 0, 1))
    const endYear = new Date(Date.UTC(year, 11, 31))
    const jan1DayOfWeek = (startYear.getUTCDay() + 6) % 7
    const current = new Date(startYear)

    while (current <= endYear) {
      const week = []
      const weekIndex = weeks.length

      for (let d = 0; d < 7; d++) {
        const isBeforeYearStart = weekIndex === 0 && d < jan1DayOfWeek
        const isAfterYearEnd = current > endYear

        if (isBeforeYearStart || isAfterYearEnd) {
          week.push(
            <div key={`${weekIndex}-${d}`} style={{
              width: `${cellWidth}px`,
              height: `${cellWidth}px`,
              background: 'transparent',
              borderRadius: '1px'
            }} />
          )
        } else {
          const dateStr = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, '0')}-${String(current.getUTCDate()).padStart(2, '0')}`

          if (current.getUTCDate() === 1) {
            monthPositions[current.getUTCMonth()] = weekIndex
          }

          const pnl = dailyPnlMap[dateStr] || 0
          const isBestDay = dateStr === stats.bestDay
          let bgColor = 'rgba(255,255,255,0.06)'
          if (Math.abs(pnl) >= 0.01 || dailyPnlMap[dateStr] !== undefined) {
            bgColor = getPnlBgColor(pnl, stats.minPnl, stats.maxPnl, isBestDay, theme)
          }

          week.push(
            <div key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                setHoveredDay({ date: dateStr, pnl, x: rect.left + rect.width / 2, y: rect.top })
              }}
              onMouseLeave={() => setHoveredDay(null)}
              style={{
                width: `${cellWidth}px`, height: `${cellWidth}px`,
                background: bgColor, borderRadius: '1px',
                border: isBestDay ? `1px solid ${PRIMARY_COLOR}` : 'none',
                boxSizing: 'border-box', cursor: 'pointer'
              }} />
          )

          current.setUTCDate(current.getUTCDate() + 1)
        }
      }

      weeks.push(
        <div key={weekIndex} style={{ display: 'flex', flexDirection: 'column', gap: `${cellGap}px`, flexShrink: 0 }}>
          {week}
        </div>
      )
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, width: '100%', minWidth: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', overflowY: 'hidden', paddingBottom: '4px' }}>
          <div style={{
            display: 'flex',
            marginBottom: 'clamp(2px, 0.4vw, 4px)',
            marginLeft: window.innerWidth < 600 ? '12px' : '18px',
            fontSize: 'clamp(7px, 1.2vw, 10px)',
            color: 'rgba(255,255,255,0.4)',
            position: 'relative',
            height: 'clamp(10px, 1.8vw, 14px)',
            minWidth: 'max-content'
          }}>
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => {
              const weekIdx = monthPositions[i] || 0
              return (
                <div key={i} style={{
                  position: 'absolute',
                  left: `${weekIdx * (cellWidth + cellGap)}px`,
                  whiteSpace: 'nowrap'
                }}>{m}</div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: `${cellGap}px`, minWidth: 'max-content' }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: `${cellGap}px`,
              marginRight: 'clamp(4px, 0.6vw, 8px)',
              fontSize: 'clamp(6px, 1vw, 8px)',
              color: 'rgba(255,255,255,0.3)',
              flexShrink: 0,
            }}>
              <div style={{ height: `${cellWidth}px`, display: 'flex', alignItems: 'center' }}>M</div>
              <div style={{ height: `${cellWidth}px` }} />
              <div style={{ height: `${cellWidth}px`, display: 'flex', alignItems: 'center' }}>W</div>
              <div style={{ height: `${cellWidth}px` }} />
              <div style={{ height: `${cellWidth}px`, display: 'flex', alignItems: 'center' }}>F</div>
              <div style={{ height: `${cellWidth}px` }} />
              <div style={{ height: `${cellWidth}px`, display: 'flex', alignItems: 'center' }}>S</div>
            </div>
            <div style={{ display: 'flex', gap: `${cellGap}px`, flexShrink: 0 }}>
              {weeks}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      width: '100%', height: '100%', minWidth: 0,
      display: 'flex', flexDirection: 'column', overflow: 'hidden'
    }}>
      {/* Top bar — Controls */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
        padding: '8px 10px', gap: '8px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.2)', flexShrink: 0
      }}>
        {/* Period navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button onClick={() => navigate(-1)} style={{
            background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '4px',
            padding: '4px 6px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '10px', outline: 'none'
          }}>←</button>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', minWidth: '80px', textAlign: 'center' }}>{getPeriodLabel()}</span>
          <button onClick={() => navigate(1)} style={{
            background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '4px',
            padding: '4px 6px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '10px', outline: 'none'
          }}>→</button>
        </div>

        {/* W/M/Y switch */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', padding: '2px', border: '1px solid rgba(255,255,255,0.1)' }}>
          {[{ key: 'rolling', label: '1Y' }, { key: 'weekly', label: 'W' }, { key: 'monthly', label: 'M' }, { key: 'yearly', label: 'Y' }].map(v => (
            <button key={v.key} onClick={() => handleViewChange(v.key)} style={{
              padding: '3px 8px', fontSize: '10px', fontWeight: '600',
              background: view === v.key ? `rgba(${hexToRgb(PRIMARY_COLOR)}, 0.2)` : 'transparent',
              color: view === v.key ? PRIMARY_COLOR : 'rgba(255,255,255,0.4)',
              border: 'none', borderRadius: '3px', cursor: 'pointer', transition: 'all 0.2s', outline: 'none'
            }}>{v.label}</button>
          ))}
        </div>
      </div>

      {/* Profit/Loss ratio bar */}
      <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div style={{ fontSize: '10px' }}>
            <span style={{ color: BULLISH_COLOR, fontWeight: '600' }}>{stats.winDays}</span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}> / </span>
            <span style={{ color: BULLISH_COLOR }}>${formatCompact(stats.winTotal)}</span>
          </div>
          <div style={{
            fontSize: '11px', fontWeight: '700',
            color: stats.totalPnl > 0 ? BULLISH_COLOR : stats.totalPnl < 0 ? BEARISH_COLOR : NEUTRAL_COLOR
          }}>
            {stats.totalPnl > 0 ? '+' : ''}{stats.totalPnl === 0 ? '' : ''}${formatCompact(stats.totalPnl)}
          </div>
          <div style={{ fontSize: '10px' }}>
            <span style={{ color: BEARISH_COLOR }}>${formatCompact(Math.abs(stats.lossTotal))}</span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}> / </span>
            <span style={{ color: BEARISH_COLOR, fontWeight: '600' }}>{stats.lossDays}</span>
          </div>
        </div>
        <div style={{ height: '4px', borderRadius: '2px', background: BEARISH_COLOR, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${winRatio}%`, background: BULLISH_COLOR, borderRadius: '2px 0 0 2px', transition: 'width 0.3s ease' }} />
        </div>
      </div>

      {/* Calendar views */}
      <div style={{ flex: 1, padding: '8px 10px', display: view === 'weekly' ? 'flex' : 'none', flexDirection: 'column', overflow: 'hidden' }}>
        {renderWeeklyCalendar()}
      </div>
      <div style={{ flex: 1, padding: '8px 10px', display: view === 'monthly' ? 'flex' : 'none', flexDirection: 'column', overflow: 'hidden' }}>
        {renderMonthlyCalendar()}
      </div>
      <div style={{ flex: 1, padding: '8px 10px', display: view === 'rolling' ? 'flex' : 'none', flexDirection: 'column', overflow: 'hidden' }}>
        {renderYearlyCalendar()}
      </div>
      <div style={{ flex: 1, padding: '8px 10px', display: view === 'yearly' ? 'flex' : 'none', flexDirection: 'column', overflow: 'hidden' }}>
        {renderCalendarYearCalendar()}
      </div>

      {/* Bottom — Best streak */}
      <div style={{
        padding: '6px 10px', borderTop: '1px solid rgba(255,255,255,0.08)',
        fontSize: 'clamp(9px, 1.4vw, 11px)', color: 'rgba(255,255,255,0.4)', flexShrink: 0
      }}>
        Best streak: <span style={{ color: BULLISH_COLOR, fontWeight: '600' }}>{stats.streak} days</span>
      </div>

      {/* Day detail modal */}
      {selectedDate && (
        <DayDetailModal
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          dailyPnlMap={dailyPnlMap}
          BULLISH_COLOR={BULLISH_COLOR}
          BEARISH_COLOR={BEARISH_COLOR}
          getPnlTextColor={getPnlTextColor}
          formatPnl={formatPnl}
          theme={theme}
        />
      )}

      {/* Hover tooltip (portal) */}
      {hoveredDay && typeof document !== 'undefined' && createPortal(
        <div style={{
          position: 'fixed', top: hoveredDay.y - 10, left: hoveredDay.x,
          transform: 'translate(-50%, -100%)',
          background: 'rgba(20, 20, 20, 0.95)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
          padding: '6px 10px', zIndex: 99999, pointerEvents: 'none',
          whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
        }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '500', marginBottom: '2px' }}>
            {new Date(hoveredDay.date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
          </div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: getPnlTextColor(hoveredDay.pnl, false, theme) }}>
            {formatPnl(hoveredDay.pnl)}
          </div>
          <div style={{
            position: 'absolute', bottom: '-4px', left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            width: '8px', height: '8px',
            background: 'rgba(20, 20, 20, 0.95)',
            borderRight: '1px solid rgba(255,255,255,0.1)',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }} />
        </div>,
        document.body
      )}
    </div>
  )
}

// ── Day Detail Modal ────────────────────────────────────────────

function DayDetailModal({ selectedDate, setSelectedDate, dailyPnlMap, BULLISH_COLOR, BEARISH_COLOR, getPnlTextColor, formatPnl, theme }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'unset' }
  }, [])

  if (typeof document === 'undefined') return null

  const pnl = dailyPnlMap[selectedDate] || 0

  return createPortal(
    <div
      onClick={() => setSelectedDate(null)}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
      }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#141414', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px', width: '100%', maxWidth: '400px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.8)', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>
              {new Date(selectedDate + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })}
            </div>
            <div style={{ fontSize: '18px', color: '#fff', fontWeight: '700' }}>
              {new Date(selectedDate + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>Net PnL</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: getPnlTextColor(pnl, false, theme) }}>
              {formatPnl(pnl)}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          <div style={{ textAlign: 'center', padding: '40px 0', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '10px' }}>
            <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>Trade details available on scan page</div>
          </div>
        </div>

        {/* Footer */}
        <button
          onClick={() => setSelectedDate(null)}
          style={{
            width: '100%', padding: '16px', background: 'rgba(255,255,255,0.05)',
            border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)',
            color: '#fff', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
        >
          Close
        </button>
      </div>
    </div>,
    document.body
  )
}
