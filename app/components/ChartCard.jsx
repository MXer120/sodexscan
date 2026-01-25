import React, { useState, useRef, useEffect } from 'react'
import {
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { TimeSelector } from './ui/TimeSelector'

const COLORS = [
  '#0081A6', '#4ade80', '#3b82f6', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
]

const TIMEFRAMES = ['7D', '30D', '90D', '1Y', 'All-time']
const TIMEFRAME_DAYS = {
  '7D': 7,
  '30D': 30,
  '90D': 90,
  '1Y': 365,
  'All-time': null
}

export default function ChartCard({
  title,
  data,
  series,
  type = 'bar',
  showCumulative = false,
  dateKey = 'date',
  defaultSelected = null,
  stacked = false,
  disableTimeframes = false,
  customColors = null,
  yAxisDomain = null,
  onTimeframeChange = null
}) {
  const [selectedSeries, setSelectedSeries] = useState([])
  const [timeframe, setTimeframe] = useState('All-time')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [hoveredSeries, setHoveredSeries] = useState(null)
  const [legendExpanded, setLegendExpanded] = useState(false)
  const dropdownRef = useRef(null)
  const legendRef = useRef(null)

  // Sort series: cumulative first, then by volume
  const sortedSeries = [...series].sort((a, b) => {
    if (a.cumulative) return -1
    if (b.cumulative) return 1
    if (a.volume !== undefined && b.volume !== undefined) {
      return b.volume - a.volume
    }
    return 0
  })

  // Initialize default selection (only once on mount)
  const [initialized, setInitialized] = useState(false)
  useEffect(() => {
    if (initialized) return
    if (defaultSelected) {
      setSelectedSeries(defaultSelected)
    } else {
      const cumulative = sortedSeries.filter(s => s.cumulative).map(s => s.key)
      const nonCumulative = sortedSeries.filter(s => !s.cumulative).slice(0, 3).map(s => s.key)
      setSelectedSeries([...cumulative, ...nonCumulative])
    }
    setInitialized(true)
  }, [series.length, initialized])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filterByTimeframe = (data) => {
    if (!data || data.length === 0) return data
    const days = TIMEFRAME_DAYS[timeframe]
    if (!days) return data

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    return data.filter(d => new Date(d[dateKey]) >= cutoff)
  }

  const displayData = filterByTimeframe(data)

  const toggleSeries = (key) => {
    setSelectedSeries(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key]
    )
  }

  const selectAll = () => setSelectedSeries(sortedSeries.map(s => s.key))
  const deselectAll = () => setSelectedSeries([])

  const formatValue = (value) => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(2)}B`
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(2)}K`
    return value?.toFixed(2)
  }

  const formatDate = (date) => {
    // If date is not a valid date string (e.g., season names), return as-is
    const d = new Date(date)
    if (isNaN(d.getTime())) return date
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatFullDate = (date) => {
    // If date is not a valid date string (e.g., season names), return as-is
    const d = new Date(date)
    if (isNaN(d.getTime())) return date
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getSeriesColor = (s, i) => {
    if (s.cumulative) return '#ffffff'
    if (customColors && customColors[s.label]) return customColors[s.label]
    return COLORS[i % COLORS.length]
  }

  const getOpacity = (seriesKey) => {
    if (!hoveredSeries) return 1
    return hoveredSeries === seriesKey ? 1 : 0.2
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null

    const total = payload
      .filter(p => !p.dataKey.includes('cumulative'))
      .reduce((sum, p) => sum + (p.value || 0), 0)

    return (
      <div style={{
        background: 'rgba(26, 26, 26, 0.95)',
        border: '1px solid #333',
        borderRadius: '8px',
        padding: '16px',
        minWidth: '180px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
      }}>
        <p style={{
          color: '#fff',
          marginBottom: '12px',
          fontSize: '14px',
          fontWeight: '600',
          borderBottom: '1px solid #333',
          paddingBottom: '8px'
        }}>
          {formatFullDate(label)}
        </p>
        {payload.map((entry, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            margin: '6px 0',
            fontSize: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '2px',
                background: entry.color
              }} />
              <span style={{ color: '#999' }}>{entry.name}:</span>
            </div>
            <span style={{ color: entry.color, fontWeight: '500' }}>
              ${formatValue(entry.value)}
            </span>
          </div>
        ))}
        {payload.length > 1 && !payload.every(p => p.dataKey.includes('cumulative')) && (
          <div style={{
            borderTop: '1px solid #333',
            marginTop: '8px',
            paddingTop: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px'
          }}>
            <span style={{ color: '#999' }}>Total:</span>
            <span style={{ color: '#fff', fontWeight: '600' }}>${formatValue(total)}</span>
          </div>
        )}
      </div>
    )
  }

  // Get visible legend items (selected series only, max ~6 before truncation)
  const visibleSeries = sortedSeries.filter(s => selectedSeries.includes(s.key))
  const maxLegendItems = 6
  const showLegendExpander = visibleSeries.length > maxLegendItems
  const displayedLegendItems = legendExpanded ? visibleSeries : visibleSeries.slice(0, maxLegendItems)

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3 className="chart-title">{title}</h3>
        <div className="chart-controls">
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: '32px',
                borderRadius: '6px',
                background: 'rgba(30, 30, 30, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '0 12px',
                color: '#fff',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                gap: '6px'
              }}
            >
              {selectedSeries.length} Selected ▼
            </button>
            {dropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '36px',
                right: '0',
                background: 'rgba(20, 20, 20, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '8px',
                minWidth: '190px',
                maxWidth: '280px',
                width: 'max-content',
                maxHeight: '400px',
                overflowY: 'auto',
                zIndex: 1000,
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
              }}>
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '8px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <button
                    onClick={selectAll}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      background: 'rgba(60, 60, 60, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '4px',
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAll}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      background: 'rgba(60, 60, 60, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '4px',
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Deselect All
                  </button>
                </div>
                {sortedSeries.map((s, i) => (
                  <div
                    key={s.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(60, 60, 60, 0.4)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    onClick={() => toggleSeries(s.key)}
                  >
                    <input
                      type="checkbox"
                      id={`${title}-${s.key}`}
                      checked={selectedSeries.includes(s.key)}
                      onChange={() => {}}
                      style={{
                        width: '14px',
                        height: '14px',
                        marginRight: '10px',
                        cursor: 'pointer'
                      }}
                    />
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '2px',
                        background: getSeriesColor(s, i),
                        marginRight: '8px',
                        flexShrink: 0
                      }}
                    />
                    <label
                      htmlFor={`${title}-${s.key}`}
                      style={{
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontSize: '12px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        flex: 1
                      }}
                    >
                      {s.label}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!disableTimeframes && (
            <TimeSelector
              value={timeframe}
              onValueChange={(newTimeframe) => {
                setTimeframe(newTimeframe)
                if (onTimeframeChange) onTimeframeChange(newTimeframe)
              }}
              options={TIMEFRAMES}
            />
          )}
        </div>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={displayData}
            onMouseLeave={() => setHoveredSeries(null)}
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis
              dataKey={dateKey}
              tickFormatter={formatDate}
              stroke="#666"
              tick={{ fontSize: 11 }}
            />
            <YAxis
              yAxisId="left"
              tickFormatter={formatValue}
              stroke="#666"
              tick={{ fontSize: 11 }}
              domain={yAxisDomain || ['auto', 'auto']}
            />
            {showCumulative && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={formatValue}
                stroke="#666"
                tick={{ fontSize: 11 }}
              />
            )}
            <Tooltip content={<CustomTooltip />} />

            {/* Render non-cumulative series first */}
            {sortedSeries.filter(s => !s.cumulative).map((s, i) => {
              const originalIndex = sortedSeries.findIndex(ss => ss.key === s.key)
              if (!selectedSeries.includes(s.key)) return null
              const color = getSeriesColor(s, originalIndex)
              const opacity = getOpacity(s.key)

              if (s.type === 'line') {
                return (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    yAxisId="left"
                    strokeOpacity={opacity}
                    onMouseEnter={() => setHoveredSeries(s.key)}
                    onMouseLeave={() => setHoveredSeries(null)}
                  />
                )
              }

              if (s.type === 'area') {
                return (
                  <Area
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    fill={color}
                    fillOpacity={0.3 * opacity}
                    stroke={color}
                    strokeOpacity={opacity}
                    yAxisId="left"
                    onMouseEnter={() => setHoveredSeries(s.key)}
                    onMouseLeave={() => setHoveredSeries(null)}
                  />
                )
              }

              return (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  fill={color}
                  fillOpacity={opacity}
                  yAxisId="left"
                  stackId={stacked ? 'stack' : undefined}
                  onMouseEnter={() => setHoveredSeries(s.key)}
                  onMouseLeave={() => setHoveredSeries(null)}
                  barSize={60}
                >
                  {s.key === 'daily' && Array.isArray(displayData) && displayData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={(entry[s.key] ?? 0) >= 0 ? '#4ade80' : '#f44336'}
                      fillOpacity={opacity}
                    />
                  ))}
                </Bar>
              )
            })}

            {/* Render cumulative lines last (on top) */}
            {sortedSeries.filter(s => s.cumulative).map((s, i) => {
              const originalIndex = sortedSeries.findIndex(ss => ss.key === s.key)
              if (!selectedSeries.includes(s.key)) return null
              const color = getSeriesColor(s, originalIndex)
              const opacity = getOpacity(s.key)

              return (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  yAxisId="right"
                  strokeOpacity={opacity}
                  onMouseEnter={() => setHoveredSeries(s.key)}
                  onMouseLeave={() => setHoveredSeries(null)}
                />
              )
            })}

          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="legend" ref={legendRef}>
        {displayedLegendItems.map((s, i) => {
          const originalIndex = sortedSeries.findIndex(ss => ss.key === s.key)
          return (
            <div
              key={s.key}
              className={`legend-item ${hoveredSeries === s.key ? 'hovered' : ''}`}
              onMouseEnter={() => setHoveredSeries(s.key)}
              onMouseLeave={() => setHoveredSeries(null)}
              style={{ opacity: hoveredSeries && hoveredSeries !== s.key ? 0.4 : 1 }}
            >
              <span
                className="legend-color"
                style={{ background: getSeriesColor(s, originalIndex) }}
              />
              {s.label}
            </div>
          )
        })}
        {showLegendExpander && (
          <button
            className="legend-expand-btn"
            onClick={() => setLegendExpanded(!legendExpanded)}
          >
            {legendExpanded ? '▲' : `+${visibleSeries.length - maxLegendItems} more`}
          </button>
        )}
      </div>
    </div>
  )
}
