'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  ComposedChart, Bar, Line, Area,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart
} from 'recharts'
import { TimeSelector } from './ui/TimeSelector'
import { supabase } from '../lib/supabaseClient'
import { globalCache } from '../lib/globalCache'
import '../styles/MainnetPage.css'
import '../styles/SocialPage.css'

const TIMEFRAMES = ['24H', '7D', '30D', '3M', '1Y', 'All']
const TIMEFRAME_DAYS = {
  '24H': 1,
  '7D': 7,
  '30D': 30,
  '3M': 90,
  '1Y': 365,
  'All': null
}

const METRICS = ['Messages', 'Characters', 'Active Users']
const METRIC_KEYS = { 'Messages': 'messages', 'Characters': 'characters', 'Active Users': 'active_users' }
const METRIC_COLORS = { 'Messages': '#0081A6', 'Characters': '#4ade80', 'Active Users': '#f59e0b' }

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function SocialStatsCharts() {
  const [rawData, setRawData] = useState([])
  const [loading, setLoading] = useState(true)

  // Chart 1 state
  const [metric, setMetric] = useState('Messages')
  const [timeframe, setTimeframe] = useState('All')

  // Chart 2 state
  const [heatMode, setHeatMode] = useState('Hour')
  const [heatMetric, setHeatMetric] = useState('Messages')

  // Table state
  const [tableSortKey, setTableSortKey] = useState('messages')
  const [tableSortAsc, setTableSortAsc] = useState(false)
  const [tableClickCount, setTableClickCount] = useState({ messages: 0, characters: 0, active_users: 0 })
  const [showAllRows, setShowAllRows] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    // Check cache
    const cached = globalCache.getSocialStats()
    if (cached) {
      setRawData(cached)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // Fetch all rows (supabase default limit is 1000, so paginate)
      let allRows = []
      let from = 0
      const batchSize = 1000
      while (true) {
        const { data: rows, error: fetchErr } = await supabase
          .from('group_stats_daily')
          .select('group_id, messages, characters, active_users, timestamp_hourly')
          .order('timestamp_hourly', { ascending: true })
          .range(from, from + batchSize - 1)

        if (fetchErr) throw fetchErr
        if (!rows || rows.length === 0) break
        allRows = allRows.concat(rows)
        if (rows.length < batchSize) break
        from += batchSize
      }

      const processed = allRows.map(r => ({
        ...r,
        date: r.timestamp_hourly,
        hour: new Date(r.timestamp_hourly).getHours(),
        dayOfWeek: new Date(r.timestamp_hourly).getDay(),
        dayName: DAY_NAMES[new Date(r.timestamp_hourly).getDay()],
        dateOnly: r.timestamp_hourly?.slice(0, 10)
      }))

      setRawData(processed)
      globalCache.setSocialStats(processed)
    } catch (err) {
      console.error('Failed to fetch social stats:', err)
    } finally {
      setLoading(false)
    }
  }

  // --- Chart 1: Metric over time ---
  const filterByTimeframe = (data, tf) => {
    if (!data.length) return data
    const days = TIMEFRAME_DAYS[tf]
    if (!days) return data
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    return data.filter(d => new Date(d.date) >= cutoff)
  }

  // Aggregate by day for chart 1
  const aggregateByDay = (data) => {
    const map = new Map()
    data.forEach(r => {
      const day = r.dateOnly
      if (!map.has(day)) map.set(day, { date: day, messages: 0, characters: 0, active_users: 0 })
      const entry = map.get(day)
      entry.messages += r.messages || 0
      entry.characters += r.characters || 0
      entry.active_users = Math.max(entry.active_users, r.active_users || 0)
    })
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  }

  const chart1Data = aggregateByDay(filterByTimeframe(rawData, timeframe))
  const metricKey = METRIC_KEYS[metric]
  const metricColor = METRIC_COLORS[metric]

  // --- Chart 2: Most active hours / days ---
  const computeHeatData = () => {
    const key = METRIC_KEYS[heatMetric]
    if (heatMode === 'Hour') {
      const buckets = Array.from({ length: 24 }, (_, i) => ({ label: `${String(i).padStart(2, '0')}:00`, value: 0, count: 0 }))
      rawData.forEach(r => {
        buckets[r.hour].value += r[key] || 0
        buckets[r.hour].count++
      })
      return buckets.map(b => ({ ...b, value: b.count ? Math.round(b.value / b.count) : 0 }))
    } else {
      const buckets = DAY_NAMES.map(name => ({ label: name, value: 0, count: 0 }))
      rawData.forEach(r => {
        buckets[r.dayOfWeek].value += r[key] || 0
        buckets[r.dayOfWeek].count++
      })
      return buckets.map(b => ({ ...b, value: b.count ? Math.round(b.value / b.count) : 0 }))
    }
  }
  const heatData = computeHeatData()

  // --- Table: Top 10 most active days ---
  const computeTableData = () => {
    const daily = aggregateByDay(rawData)
    const sorted = [...daily].sort((a, b) => {
      const diff = a[tableSortKey] - b[tableSortKey]
      return tableSortAsc ? diff : -diff
    })
    return sorted.slice(0, 10)
  }
  const tableData = computeTableData()
  const displayedTableData = showAllRows ? tableData : tableData.slice(0, 5)

  const handleTableHeaderClick = (key) => {
    if (tableSortKey === key) {
      // Toggle: first click desc, second asc, third back to desc
      const newCount = (tableClickCount[key] || 0) + 1
      setTableClickCount(prev => ({ ...prev, [key]: newCount }))
      setTableSortAsc(newCount % 2 === 1)
    } else {
      setTableSortKey(key)
      setTableSortAsc(false)
      setTableClickCount(prev => ({ ...prev, [key]: 0 }))
    }
  }

  const getSortIndicator = (key) => {
    if (tableSortKey !== key) return ''
    return tableSortAsc ? ' ▲' : ' ▼'
  }

  const formatNumber = (num) => {
    if (num == null) return '-'
    return num.toLocaleString('de-DE')
  }

  const formatDate = (date) => {
    const d = new Date(date)
    if (isNaN(d.getTime())) return date
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatFullDate = (date) => {
    const d = new Date(date)
    if (isNaN(d.getTime())) return date
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatValue = (value) => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return String(Math.round(value))
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null
    return (
      <div className="social-chart-tooltip">
        <p className="social-chart-tooltip-label">{formatFullDate(label)}</p>
        {payload.map((entry, i) => (
          <div key={i} className="social-chart-tooltip-row">
            <span className="social-chart-tooltip-dot" style={{ background: entry.color }} />
            <span className="social-chart-tooltip-name">{entry.name}:</span>
            <span className="social-chart-tooltip-value" style={{ color: entry.color }}>
              {formatNumber(entry.value)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  const HeatTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null
    return (
      <div className="social-chart-tooltip">
        <p className="social-chart-tooltip-label">{label}</p>
        <div className="social-chart-tooltip-row">
          <span className="social-chart-tooltip-name">Avg {heatMetric}:</span>
          <span className="social-chart-tooltip-value">{formatNumber(payload[0].value)}</span>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="social-loading">Loading stats...</div>
  }

  if (!rawData.length) {
    return <div className="social-error"><span>No stats data available</span></div>
  }

  return (
    <div className="social-stats-charts">
      {/* Chart 1: Metric over time */}
      <div className="chart-card">
        <div className="chart-header">
          <h3 className="chart-title">Chat Activity</h3>
          <div className="chart-controls">
            <TimeSelector
              value={metric}
              onValueChange={setMetric}
              options={METRICS}
            />
            <TimeSelector
              value={timeframe}
              onValueChange={setTimeframe}
              options={TIMEFRAMES}
            />
          </div>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart1Data} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="date" tickFormatter={formatDate} stroke="#666" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatValue} stroke="#666" tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey={metricKey} name={metric} fill={metricColor} barSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Most active hours/days */}
      <div className="chart-card">
        <div className="chart-header">
          <h3 className="chart-title">Most Active {heatMode}s</h3>
          <div className="chart-controls">
            <TimeSelector
              value={heatMetric}
              onValueChange={setHeatMetric}
              options={METRICS}
            />
            <TimeSelector
              value={heatMode}
              onValueChange={setHeatMode}
              options={['Hour', 'Day']}
            />
          </div>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={heatData} barCategoryGap="15%">
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis
                dataKey="label"
                stroke="#666"
                tick={{ fontSize: 11 }}
                interval={heatMode === 'Hour' ? 1 : 0}
                angle={heatMode === 'Hour' ? 0 : -30}
                textAnchor={heatMode === 'Hour' ? 'middle' : 'end'}
              />
              <YAxis tickFormatter={formatValue} stroke="#666" tick={{ fontSize: 11 }} />
              <Tooltip content={<HeatTooltip />} />
              <Bar dataKey="value" name={`Avg ${heatMetric}`} fill={METRIC_COLORS[heatMetric]} barSize={heatMode === 'Hour' ? 20 : 50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table: Top 10 most active days */}
      <div className="social-leaderboard social-stats-table">
        <div className="leaderboard-header">
          <h2>Most Active Days</h2>
        </div>
        <div className="table-wrapper">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Day</th>
                <th
                  className={`text-right sortable-th ${tableSortKey === 'messages' ? 'active-sort' : ''}`}
                  onClick={() => handleTableHeaderClick('messages')}
                >
                  Messages{getSortIndicator('messages')}
                </th>
                <th
                  className={`text-right sortable-th ${tableSortKey === 'characters' ? 'active-sort' : ''}`}
                  onClick={() => handleTableHeaderClick('characters')}
                >
                  Characters{getSortIndicator('characters')}
                </th>
                <th
                  className={`text-right sortable-th ${tableSortKey === 'active_users' ? 'active-sort' : ''}`}
                  onClick={() => handleTableHeaderClick('active_users')}
                >
                  Users{getSortIndicator('active_users')}
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedTableData.map((row, idx) => (
                <tr key={row.date}>
                  <td className="rank-cell">#{idx + 1}</td>
                  <td className="user-cell">{formatFullDate(row.date)}</td>
                  <td className="value-cell text-right">{formatNumber(row.messages)}</td>
                  <td className="value-cell text-right">{formatNumber(row.characters)}</td>
                  <td className="value-cell text-right">{formatNumber(row.active_users)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {tableData.length > 5 && (
          <div className="social-table-expand">
            <button onClick={() => setShowAllRows(!showAllRows)} className="page-btn">
              {showAllRows ? 'Show less' : `Show all ${tableData.length}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
