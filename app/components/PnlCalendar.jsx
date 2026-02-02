'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'

const BULLISH_COLOR = '#33AF80'
const BEARISH_COLOR = '#DB324D'
const PRIMARY_COLOR = '#FF7648'
const NEUTRAL_COLOR = 'rgba(255,255,255,0.35)'

// Helper to get background color based on relative PNL
const getPnlBgColor = (pnl, minPnl, maxPnl, isBestDay) => {
  if (isBestDay && pnl > 0.01) {
    return `rgba(255, 118, 72, 0.25)` // Primary orange bg
  }
  if (Math.abs(pnl) < 0.01) return 'rgba(255,255,255,0.04)'

  if (pnl >= 0.01) {
    // Subtle green - max alpha 0.25
    const intensity = maxPnl > 0 ? Math.min(pnl / maxPnl, 1) : 0
    const alpha = 0.08 + intensity * 0.17
    return `rgba(51, 175, 128, ${alpha})`
  } else {
    // Subtle red - max alpha 0.25
    const intensity = minPnl < 0 ? Math.min(Math.abs(pnl) / Math.abs(minPnl), 1) : 0
    const alpha = 0.08 + intensity * 0.17
    return `rgba(219, 50, 77, ${alpha})`
  }
}

// Get text color for PNL value
const getPnlTextColor = (pnl, isBestDay) => {
  if (isBestDay && pnl > 0.01) return PRIMARY_COLOR
  if (pnl >= 0.01) return BULLISH_COLOR
  if (pnl <= -0.01) return BEARISH_COLOR
  return NEUTRAL_COLOR
}

// Get start of week (Monday)
const getWeekStart = (date) => {
  const d = new Date(date)
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
  const res = new Date(d)
  res.setUTCDate(diff)
  return res
}

// Format number with K/M suffixes
const formatCompact = (num) => {
  if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toFixed(0)
}

// Format PNL display - no + for 0
const formatPnl = (pnl) => {
  if (Math.abs(pnl) < 0.01) return '$0'
  const prefix = pnl >= 0.01 ? '+$' : '-$'
  return prefix + formatCompact(Math.abs(pnl))
}

// Calculate longest positive streak
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

export default function PnlCalendar({ pnlHistory = [], view = 'monthly', onViewChange, trades = [], symbolMap = {} }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [hoveredDay, setHoveredDay] = useState(null)

  // Map trades to dates based on created_at
  const tradesByDate = useMemo(() => {
    const map = {}
    trades.forEach(trade => {
      if (!trade.created_at) return
      const date = new Date(trade.created_at)
      const dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
      if (!map[dateStr]) map[dateStr] = []
      map[dateStr].push(trade)
    })
    return map
  }, [trades])

  // Build daily PNL map from history
  const dailyPnlMap = useMemo(() => {
    const map = {}
    pnlHistory.forEach(item => {
      map[item.date] = item.daily
    })
    return map
  }, [pnlHistory])

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
    } else {
      startDate = new Date(now.getFullYear(), 0, 1)
      endDate = new Date(now.getFullYear(), 11, 31)
    }

    let totalPnl = 0
    let winDays = 0
    let lossDays = 0
    let winTotal = 0
    let lossTotal = 0
    let minPnl = 0
    let maxPnl = 0
    let bestDay = null
    let bestDayPnl = -Infinity
    const periodDailyData = {}

    const current = new Date(startDate)
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0]
      const pnl = dailyPnlMap[dateStr] || 0

      if (pnl !== 0 || dailyPnlMap[dateStr] !== undefined) {
        periodDailyData[dateStr] = pnl
        totalPnl += pnl

        if (pnl > 0) {
          winDays++
          winTotal += pnl
          if (pnl > bestDayPnl) {
            bestDayPnl = pnl
            bestDay = dateStr
          }
        } else if (pnl < 0) {
          lossDays++
          lossTotal += pnl
        }

        minPnl = Math.min(minPnl, pnl)
        maxPnl = Math.max(maxPnl, pnl)
      }

      current.setDate(current.getDate() + 1)
    }

    const streak = getLongestStreak(periodDailyData)

    return { totalPnl, winDays, lossDays, winTotal, lossTotal, minPnl, maxPnl, bestDay, streak }
  }, [dailyPnlMap, currentDate, view])

  // Navigate periods
  const navigate = (direction) => {
    const newDate = new Date(currentDate)
    if (view === 'weekly') {
      newDate.setDate(newDate.getDate() + direction * 7)
    } else if (view === 'monthly') {
      newDate.setMonth(newDate.getMonth() + direction)
    } else {
      newDate.setFullYear(newDate.getFullYear() + direction)
    }
    setCurrentDate(newDate)
  }

  // Get period label
  const getPeriodLabel = () => {
    if (view === 'weekly') {
      const start = getWeekStart(currentDate)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    } else if (view === 'monthly') {
      return currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    } else {
      return currentDate.getFullYear().toString()
    }
  }

  // Win/Loss ratio for bar
  const totalDays = stats.winDays + stats.lossDays
  const winRatio = totalDays > 0 ? (stats.winDays / totalDays) * 100 : 50

  // Render weekly calendar
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
      const bgColor = getPnlBgColor(pnl, stats.minPnl, stats.maxPnl, isBestDay)
      const textColor = getPnlTextColor(pnl, isBestDay)

      days.push(
        <div key={i}
          className="calendar-day-cell"
          onClick={() => setSelectedDate(dateStr)}
          style={{
            flex: 1,
            aspectRatio: '1',
            display: 'flex',
            flexDirection: 'column',
            background: bgColor,
            borderRadius: 'clamp(3px, 0.5vw, 6px)',
            padding: 'clamp(4px, 0.8vw, 8px)',
            border: isBestDay ? `1px solid ${PRIMARY_COLOR}` : '1px solid rgba(255,255,255,0.05)',
            boxSizing: 'border-box',
            minWidth: '40px',
            maxWidth: 'min(80px, 12vw)',
            cursor: 'pointer',
            transition: 'transform 0.1s ease',
            position: 'relative'
          }}>
          <div style={{ fontSize: 'clamp(7px, 1.2vw, 9px)', color: isBestDay ? PRIMARY_COLOR : 'rgba(255,255,255,0.4)', lineHeight: 1 }}>
            {dayNames[i]}
          </div>
          <div style={{ fontSize: 'clamp(8px, 1.4vw, 11px)', color: isBestDay ? PRIMARY_COLOR : 'rgba(255,255,255,0.6)', lineHeight: 1.2, marginTop: '2px' }}>
            {date.getDate()}
          </div>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              fontSize: 'clamp(9px, 1.6vw, 13px)',
              fontWeight: '600',
              color: textColor
            }}>
              {formatPnl(pnl)}
            </div>
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

  // Render monthly calendar
  const renderMonthlyCalendar = () => {
    const year = currentDate.getUTCFullYear()
    const month = currentDate.getUTCMonth()
    const firstDay = new Date(Date.UTC(year, month, 1))
    const lastDay = new Date(Date.UTC(year, month + 1, 0))
    const startOffset = (firstDay.getUTCDay() + 6) % 7

    const cells = []

    // Empty cells before first day
    for (let i = 0; i < startOffset; i++) {
      cells.push(<div key={`empty-${i}`} />)
    }

    // Days of month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const pnl = dailyPnlMap[dateStr] || 0
      const isBestDay = dateStr === stats.bestDay
      const bgColor = getPnlBgColor(pnl, stats.minPnl, stats.maxPnl, isBestDay)
      const textColor = getPnlTextColor(pnl, isBestDay)

      cells.push(
        <div key={d}
          className="calendar-day-cell"
          onClick={() => setSelectedDate(dateStr)}
          style={{
            aspectRatio: '1',
            display: 'flex',
            flexDirection: 'column',
            background: bgColor,
            borderRadius: 'clamp(2px, 0.4vw, 4px)',
            padding: 'clamp(2px, 0.4vw, 4px)',
            border: isBestDay ? `1px solid ${PRIMARY_COLOR}` : '1px solid transparent',
            boxSizing: 'border-box',
            minWidth: '30px',
            maxWidth: 'min(100px, 14vw)',
            cursor: 'pointer',
            transition: 'transform 0.1s ease'
          }}>
          <div style={{ fontSize: 'clamp(7px, 1.2vw, 9px)', color: isBestDay ? PRIMARY_COLOR : 'rgba(255,255,255,0.5)', lineHeight: 1 }}>{d}</div>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              fontSize: 'clamp(8px, 1.4vw, 12px)',
              fontWeight: '600',
              color: textColor,
              textAlign: 'center'
            }}>
              {formatPnl(pnl)}
            </div>
          </div>
        </div>
      )
    }

    // Fill remaining cells to complete the grid
    const totalCells = cells.length
    const remainder = totalCells % 7
    if (remainder > 0) {
      for (let i = 0; i < 7 - remainder; i++) {
        cells.push(<div key={`empty-end-${i}`} />)
      }
    }

    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '725px',
        margin: '0 auto',
        minWidth: 0
      }}>
        {/* Day headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 'clamp(2px, 0.4vw, 4px)',
          marginBottom: 'clamp(4px, 0.6vw, 8px)'
        }}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 'clamp(7px, 1.2vw, 10px)', color: 'rgba(255,255,255,0.4)' }}>{d}</div>
          ))}
        </div>
        {/* Calendar grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 'clamp(2px, 0.4vw, 4px)',
          alignContent: 'start',
          flex: 1,
          minHeight: typeof window !== 'undefined' && window.innerWidth < 600 ? 'auto' : '350px'
        }}>
          {cells}
        </div>
      </div>
    )
  }

  // Render yearly calendar (GitHub-style)
  const renderYearlyCalendar = () => {
    const year = currentDate.getFullYear()

    // Responsive cell sizing
    const cellWidth = typeof window !== 'undefined' ? (window.innerWidth < 600 ? 11 : window.innerWidth < 900 ? 10 : window.innerWidth < 1920 ? 12 : 14) : 12
    const cellGap = 2

    const weeks = []
    const monthPositions = Array(12).fill(0)

    // Start from first day of year
    const startYear = new Date(Date.UTC(year, 0, 1))
    const endYear = new Date(Date.UTC(year, 11, 31))

    // Find day of week for Jan 1 (Monday=0, Sunday=6)
    const jan1DayOfWeek = (startYear.getUTCDay() + 6) % 7

    // Setup date range
    const current = new Date(startYear)

    // Fill the weeks
    while (current <= endYear) {
      const week = []
      const weekIndex = weeks.length

      // We process day by day (0 to 6 for a week)
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

          // Track month start position (first week that contains the 1st of the month)
          if (current.getUTCDate() === 1) {
            monthPositions[current.getUTCMonth()] = weekIndex
          }

          const pnl = dailyPnlMap[dateStr] || 0
          const isBestDay = dateStr === stats.bestDay
          let bgColor = 'rgba(255,255,255,0.06)' // Slightly more visible placeholders
          // Use 0.01 threshold as established in other views
          if (Math.abs(pnl) >= 0.01 || dailyPnlMap[dateStr] !== undefined) {
            bgColor = getPnlBgColor(pnl, stats.minPnl, stats.maxPnl, isBestDay)
          }

          week.push(
            <div key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                setHoveredDay({
                  date: dateStr,
                  pnl: pnl,
                  x: rect.left + rect.width / 2,
                  y: rect.top
                })
              }}
              onMouseLeave={() => setHoveredDay(null)}
              style={{
                width: `${cellWidth}px`,
                height: `${cellWidth}px`,
                background: bgColor,
                borderRadius: '1px',
                border: isBestDay ? `1px solid ${PRIMARY_COLOR}` : 'none',
                boxSizing: 'border-box',
                cursor: 'pointer'
              }} />
          )

          // Increment day
          current.setUTCDate(current.getUTCDate() + 1)
        }
      }

      weeks.push(
        <div key={weekIndex} style={{ display: 'flex', flexDirection: 'column', gap: `${cellGap}px`, flexShrink: 0 }}>
          {week}
        </div>
      )
    }

    // Calculate label step to match week width + gap
    const weekStep = cellWidth + cellGap

    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, width: '100%', minWidth: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', overflowY: 'hidden', paddingBottom: '4px' }}>
          {/* Month labels positioned by week */}
          <div style={{
            display: 'flex',
            marginBottom: 'clamp(2px, 0.4vw, 4px)',
            marginLeft: window.innerWidth < 600 ? '12px' : '18px', // Keep padding consistent with day labels
            fontSize: 'clamp(7px, 1.2vw, 10px)',
            color: 'rgba(255,255,255,0.4)',
            position: 'relative',
            height: 'clamp(10px, 1.8vw, 14px)',
            minWidth: 'max-content' // Ensure it spans full scrolled width
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
              paddingTop: '0px'
            }}>
              <div style={{ height: `${cellWidth}px`, display: 'flex', alignItems: 'center' }}>M</div>
              <div style={{ height: `${cellWidth}px` }}></div>
              <div style={{ height: `${cellWidth}px`, display: 'flex', alignItems: 'center' }}>W</div>
              <div style={{ height: `${cellWidth}px` }}></div>
              <div style={{ height: `${cellWidth}px`, display: 'flex', alignItems: 'center' }}>F</div>
              <div style={{ height: `${cellWidth}px` }}></div>
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
      background: 'rgba(20,20,20,0.4)',
      borderRadius: '12px',
      height: '100%',
      width: '100%',
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid rgba(255,255,255,0.08)',
      overflow: 'hidden'
    }}>
      {/* Top bar - Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: '12px',
        gap: '8px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.2)'
      }}>
        {/* Period navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 6px',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontSize: '10px',
              outline: 'none',
              WebkitTapHighlightColor: 'rgba(255, 118, 72, 0.3)'
            }}
          >
            ←
          </button>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', minWidth: '80px', textAlign: 'center' }}>
            {getPeriodLabel()}
          </span>
          <button
            onClick={() => navigate(1)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 6px',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontSize: '10px',
              outline: 'none',
              WebkitTapHighlightColor: 'rgba(255, 118, 72, 0.3)'
            }}
          >
            →
          </button>
        </div>

        {/* W/M/Y switch */}
        <div style={{
          display: 'flex',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '4px',
          padding: '2px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          {[{ key: 'weekly', label: 'W' }, { key: 'monthly', label: 'M' }, { key: 'yearly', label: 'Y' }].map(v => (
            <button
              key={v.key}
              onClick={() => onViewChange?.(v.key)}
              style={{
                padding: '3px 8px',
                fontSize: '10px',
                fontWeight: '600',
                background: view === v.key ? 'rgba(255, 118, 72, 0.2)' : 'transparent',
                color: view === v.key ? PRIMARY_COLOR : 'rgba(255,255,255,0.4)',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                outline: 'none',
                WebkitTapHighlightColor: 'rgba(255, 118, 72, 0.3)'
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Profit/Loss ratio bar */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div style={{ fontSize: '10px' }}>
            <span style={{ color: BULLISH_COLOR, fontWeight: '600' }}>{stats.winDays}</span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}> / </span>
            <span style={{ color: BULLISH_COLOR }}>${formatCompact(stats.winTotal)}</span>
          </div>
          <div style={{
            fontSize: '11px',
            fontWeight: '700',
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
        {/* Ratio bar */}
        <div style={{
          height: '4px',
          borderRadius: '2px',
          background: BEARISH_COLOR,
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${winRatio}%`,
            background: BULLISH_COLOR,
            borderRadius: '2px 0 0 2px',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* Calendar */}
      <div style={{
        flex: 1,
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {view === 'weekly' && renderWeeklyCalendar()}
        {view === 'monthly' && renderMonthlyCalendar()}
        {view === 'yearly' && renderYearlyCalendar()}
      </div>

      {/* Bottom - Best streak */}
      <div style={{
        padding: '8px 16px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        fontSize: 'clamp(9px, 1.4vw, 11px)',
        color: 'rgba(255,255,255,0.4)'
      }}>
        Best streak: <span style={{ color: BULLISH_COLOR, fontWeight: '600' }}>{stats.streak} days</span>
      </div>

      {selectedDate && (
        <DayDetailModal
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          tradesByDate={tradesByDate}
          dailyPnlMap={dailyPnlMap}
          symbolMap={symbolMap}
          BULLISH_COLOR={BULLISH_COLOR}
          BEARISH_COLOR={BEARISH_COLOR}
          getPnlTextColor={getPnlTextColor}
          formatPnl={formatPnl}
        />
      )}

      {/* Mini Hover Tooltip UI */}
      {hoveredDay && typeof document !== 'undefined' && createPortal(
        <div style={{
          position: 'fixed',
          top: hoveredDay.y - 10,
          left: hoveredDay.x,
          transform: 'translate(-50%, -100%)',
          background: 'rgba(20, 20, 20, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '6px',
          padding: '6px 10px',
          zIndex: 99999,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          animation: 'tooltipFadeIn 0.15s ease-out'
        }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '500', marginBottom: '2px' }}>
            {new Date(hoveredDay.date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
          </div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: getPnlTextColor(hoveredDay.pnl) }}>
            {formatPnl(hoveredDay.pnl)}
          </div>
          <div style={{
            position: 'absolute',
            bottom: '-4px',
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            width: '8px',
            height: '8px',
            background: 'rgba(20, 20, 20, 0.95)',
            borderRight: '1px solid rgba(255,255,255,0.1)',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }} />
        </div>,
        document.body
      )}

      <style jsx>{`
        @keyframes tooltipFadeIn {
          from { opacity: 0; transform: translate(-50%, -90%); }
          to { opacity: 1; transform: translate(-50%, -100%); }
        }
      `}</style>
    </div>
  )
}

function DayDetailModal({ selectedDate, setSelectedDate, tradesByDate, dailyPnlMap, symbolMap, BULLISH_COLOR, BEARISH_COLOR, getPnlTextColor, formatPnl }) {
  // Prevent scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'unset' }
  }, [])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      onClick={() => setSelectedDate(null)}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#141414',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
          overflow: 'hidden',
          animation: 'modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
        {/* Modal Header */}
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
            <div style={{ fontSize: '18px', fontWeight: '700', color: getPnlTextColor(dailyPnlMap[selectedDate] || 0) }}>
              {formatPnl(dailyPnlMap[selectedDate] || 0)}
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '20px' }}>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase' }}>
            Trades Opened ({tradesByDate[selectedDate]?.length || 0})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tradesByDate[selectedDate]?.length > 0 ? (
              <>
                {tradesByDate[selectedDate].slice(0, 3).map((trade, idx) => {
                  const sym = symbolMap[trade.symbol_id] || trade.symbol_id
                  const isLong = parseInt(trade.position_side) === 2
                  const pnl = parseFloat(trade.realized_pnl) || 0
                  return (
                    <div key={idx} style={{
                      background: 'rgba(255,118,72,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '10px',
                      padding: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '700', color: '#fff', fontSize: '14px' }}>{sym}</span>
                          <span style={{
                            fontSize: '10px',
                            background: isLong ? 'rgba(51, 175, 128, 0.15)' : 'rgba(219, 50, 77, 0.15)',
                            color: isLong ? BULLISH_COLOR : BEARISH_COLOR,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontWeight: '700'
                          }}>
                            {isLong ? 'LONG' : 'SHORT'} {trade.leverage}x
                          </span>
                        </div>
                        <div style={{ fontWeight: '700', color: pnl >= 0 ? BULLISH_COLOR : BEARISH_COLOR, fontSize: '14px' }}>
                          {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                        <div>
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '2px' }}>Entry</div>
                          <div style={{ fontSize: '12px', color: '#fff', fontWeight: '500' }}>${parseFloat(trade.avg_entry_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '2px' }}>Exit</div>
                          <div style={{ fontSize: '12px', color: '#fff', fontWeight: '500' }}>${parseFloat(trade.avg_close_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '2px' }}>Size</div>
                          <div style={{ fontSize: '12px', color: '#fff', fontWeight: '500' }}>{trade.max_size}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {tradesByDate[selectedDate].length > 3 && (
                  <div style={{ textAlign: 'center', padding: '10px', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                    + {tradesByDate[selectedDate].length - 3} more trades. View trade history for more info.
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '10px' }}>
                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>No trades opened on this day</div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <button
          onClick={() => setSelectedDate(null)}
          style={{
            width: '100%',
            padding: '16px',
            background: 'rgba(255,255,255,0.05)',
            border: 'none',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            color: '#fff',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
        >
          Close
        </button>
      </div>
      <style jsx>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  )
}
