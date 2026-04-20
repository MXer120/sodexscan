import React, { useState, useMemo } from 'react'
import { useUserGrowthData } from '../hooks/useUserGrowthData'
import { SkeletonChart, SkeletonBar } from './Skeleton'
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea
} from 'recharts'

const PROJECTION_OPTIONS = [
  { label: '24h', days: 1 },
  { label: '48h', days: 2 },
  { label: '7d', days: 7 },
  { label: '30d', days: 30 }
]

const TIMEFRAME_OPTIONS = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: 'ALL', days: null }
]

const COOL_MILESTONES = [
  10000, 20000, 50000,
  100000, 200000, 250000, 300000, 400000, 500000, 600000, 700000, 750000, 800000, 900000,
  1000000, 1250000, 1500000, 1750000,
  2000000, 2500000, 3000000, 4000000, 5000000, 6000000, 7000000, 8000000, 9000000,
  10000000, 11000000, 12500000, 15000000, 17500000, 20000000, 25000000, 30000000, 40000000, 50000000
]

const generateMilestones = (currentCount, projectionEndCount) => {
  const available = COOL_MILESTONES.filter(m => m > currentCount)
  if (available.length === 0) return []
  const withinProjection = available.filter(m => m <= projectionEndCount)
  const beyondProjection = available.filter(m => m > projectionEndCount)
  const result = []
  result.push(...withinProjection.slice(0, 3))
  if (beyondProjection.length > 0) result.push(beyondProjection[0])
  while (result.length < 4 && beyondProjection.length > result.length - withinProjection.length) {
    const nextIdx = result.length - withinProjection.length
    if (nextIdx < beyondProjection.length && !result.includes(beyondProjection[nextIdx])) {
      result.push(beyondProjection[nextIdx])
    } else break
  }
  return result.slice(0, 4)
}

const calculateYAxisDomain = (data) => {
  if (!data || data.length === 0) return { domain: [0, 1000], ticks: [0, 500, 1000] }
  const values = data.map(d => d.totalUsers || d.actualTotal || d.predictedTotal || 0).filter(v => v > 0)
  if (values.length === 0) return { domain: [0, 1000], ticks: [0, 500, 1000] }
  const maxVal = Math.max(...values)
  const niceSteps = [100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000, 100000, 250000, 500000, 1000000]
  let bestStep = niceSteps[0]
  for (const step of niceSteps) {
    const tickCount = Math.ceil(maxVal / step)
    if (tickCount >= 3 && tickCount <= 6) { bestStep = step; break }
    if (tickCount < 3) break
    bestStep = step
  }
  const ticks = []
  let tick = 0
  const maxTick = Math.ceil(maxVal * 1.1 / bestStep) * bestStep
  while (tick <= maxTick && ticks.length < 7) { ticks.push(tick); tick += bestStep }
  return { domain: [0, ticks[ticks.length - 1] || maxTick], ticks }
}

export default function TotalUsersChart({ overrideTotalUsers }) {
  const { data: growthData, isLoading: loading, isError } = useUserGrowthData()
  const [projectionDays, setProjectionDays] = useState(7)
  const [timeframeDays, setTimeframeDays] = useState(30)

  const rawData = growthData?.data || []
  const apiTotal = growthData?.totalUsers || 0
  const totalUsers = overrideTotalUsers || apiTotal

  // Scale chart data so final value matches LB total when overrideTotalUsers is provided
  const data = useMemo(() => {
    if (!overrideTotalUsers || !apiTotal || apiTotal === 0 || rawData.length === 0) return rawData
    const scale = overrideTotalUsers / apiTotal
    return rawData.map(d => ({
      ...d,
      totalUsers: Math.round(d.totalUsers * scale),
      newUsers: Math.round(d.newUsers * scale)
    }))
  }, [rawData, overrideTotalUsers, apiTotal])

  const predictions = useMemo(() => {
    if (data.length < 7) return { chartData: data, milestones: [], filteredData: data, avgDailyGrowth: 0, yAxisConfig: { domain: [0, 1000], ticks: [0, 500, 1000] } }

    const lastActual = data[data.length - 1]
    const lastDate = lastActual.date
    const dayMs = 24 * 60 * 60 * 1000

    const recentDays = Math.min(21, data.length)
    const recentData = data.slice(-recentDays)
    let level = recentData[0].newUsers
    let trend = 0
    const alpha = 0.4
    const beta = 0.3
    for (let i = 1; i < recentData.length; i++) {
      const value = recentData[i].newUsers
      const prevLevel = level
      level = alpha * value + (1 - alpha) * (level + trend)
      trend = beta * (level - prevLevel) + (1 - beta) * trend
    }

    const last3 = data.slice(-3)
    const recentAvg = last3.reduce((s, d) => s + d.newUsers, 0) / 3
    const basePrediction = Math.max(1, recentAvg)

    let cumulative = lastActual.totalUsers
    const predictedData = []
    let totalPredictedUsers = 0

    for (let i = 1; i <= projectionDays; i++) {
      const variance = 0.97 + (((i * 7) % 10) / 100)
      const dailyPredicted = Math.round(Math.max(1, basePrediction * variance))
      cumulative += dailyPredicted
      totalPredictedUsers += dailyPredicted
      predictedData.push({
        date: lastDate + (i * dayMs),
        newUsers: dailyPredicted,
        totalUsers: cumulative,
        predictedTotal: cumulative,
        isActual: false,
        isPredicted: true,
        showDot: projectionDays <= 7 || i === 1 || i === projectionDays
      })
    }

    const projectionEndCount = cumulative
    const avgDailyGrowth = Math.round(totalPredictedUsers / projectionDays)

    const chartData = data.map((d, i) => ({
      ...d,
      actualTotal: d.totalUsers,
      predictedTotal: null,
      isCurrentDay: i === data.length - 1
    }))

    if (chartData.length > 0) {
      chartData[chartData.length - 1].predictedTotal = chartData[chartData.length - 1].totalUsers
    }

    const allData = [...chartData, ...predictedData]
    let filteredData = allData
    if (timeframeDays !== null) {
      const cutoffDate = lastDate - (timeframeDays * dayMs)
      filteredData = allData.filter(d => d.date >= cutoffDate)
    }

    const yAxisConfig = calculateYAxisDomain(filteredData)
    const dynamicMilestones = generateMilestones(lastActual.totalUsers, projectionEndCount)
    const milestoneETAs = dynamicMilestones.map(milestone => {
      const usersNeeded = milestone - lastActual.totalUsers
      const daysToReach = Math.ceil(usersNeeded / avgDailyGrowth)
      const eta = new Date(lastDate + daysToReach * dayMs)
      return { milestone, daysToReach, eta }
    })

    return { chartData: allData, filteredData, milestones: milestoneETAs, avgDailyGrowth, currentDayDate: lastDate, yAxisConfig }
  }, [data, projectionDays, timeframeDays])

  const formatDate = (timestamp) => new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const formatFullDate = (timestamp) => new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(num % 1000000 === 0 ? 0 : 1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}K`
    return num?.toLocaleString() || '0'
  }
  const formatMilestoneDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null
    const entry = payload[0]?.payload
    if (!entry) return null
    return (
      <div className="chart-tooltip">
        <p className="tooltip-date">
          {formatFullDate(label)}
          {entry.isPredicted && <span className="tooltip-tag projected">(Projected)</span>}
          {entry.isCurrentDay && <span className="tooltip-tag current">(Today)</span>}
        </p>
        <div className="tooltip-row">
          <span className="tooltip-label">Total Users:</span>
          <span className="tooltip-value">{formatNumber(entry.totalUsers)}</span>
        </div>
        <div className="tooltip-row">
          <span className="tooltip-label">New Users:</span>
          <span className="tooltip-value green">+{formatNumber(entry.newUsers)}</span>
        </div>
      </div>
    )
  }

  const currentDayDate = predictions.currentDayDate
  const lastFilteredDate = predictions.filteredData[predictions.filteredData.length - 1]?.date

  const xAxisInterval = useMemo(() => {
    const len = predictions.filteredData.length
    if (len <= 10) return 1
    if (len <= 20) return 2
    if (len <= 40) return 4
    if (len <= 60) return 7
    return Math.ceil(len / 8)
  }, [predictions.filteredData.length])

  return (
    <div className="total-users-chart-container">
      <div className="chart-header-row">
        <div className="chart-title-section">
          <h3 className="chart-title">Total Users Growth</h3>
          <span className="chart-subtitle">{formatNumber(totalUsers)} users</span>
        </div>
        <div className="chart-controls-row">
          <div className="timeframe-switch">
            {TIMEFRAME_OPTIONS.map(opt => (
              <button
                key={opt.label}
                className={`timeframe-btn ${timeframeDays === opt.days ? 'active' : ''}`}
                onClick={() => setTimeframeDays(opt.days)}
              >{opt.label}</button>
            ))}
          </div>
          <div className="projection-switch">
            <span className="switch-label">Proj:</span>
            {PROJECTION_OPTIONS.map(opt => (
              <button
                key={opt.days}
                className={`projection-btn ${projectionDays === opt.days ? 'active' : ''}`}
                onClick={() => setProjectionDays(opt.days)}
              >{opt.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="chart-body-row">
        <div className="chart-area">
          {loading ? (
            <div className="chart-loading"><SkeletonChart height={180} /></div>
          ) : isError ? (
            <div className="chart-error">Failed to load data</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={predictions.filteredData} margin={{ top: 20, right: 10, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="totalUsersGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="1 8" stroke="var(--color-overlay-subtle)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="var(--color-border-strong)"
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval={xAxisInterval}
                  minTickGap={40}
                />
                <YAxis
                  tickFormatter={formatNumber}
                  stroke="var(--color-border-strong)"
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  domain={predictions.yAxisConfig.domain}
                  ticks={predictions.yAxisConfig.ticks}
                  width={45}
                />
                <Tooltip content={<CustomTooltip />} />
                {currentDayDate && lastFilteredDate && (
                  <ReferenceArea
                    x1={currentDayDate}
                    x2={lastFilteredDate}
                    fill='#22c55e'
                    fillOpacity={0.06}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="actualTotal"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#totalUsersGradient)"
                  connectNulls={false}
                  dot={(props) => {
                    const { cx, cy, payload } = props
                    if (!cx || !cy) return null
                    if (payload.isCurrentDay) {
                      return (
                        <g key={`dot-${payload.date}`}>
                          <circle cx={cx} cy={cy} r={8} fill="var(--color-primary)" opacity={0.2} />
                          <circle cx={cx} cy={cy} r={5} fill="var(--color-primary)" stroke="#fff" strokeWidth={2} />
                        </g>
                      )
                    }
                    return null
                  }}
                  activeDot={{ r: 4, fill: 'var(--color-primary)', stroke: '#fff', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="predictedTotal"
                  stroke='#22c55e'
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  connectNulls={true}
                  dot={(props) => {
                    const { cx, cy, payload } = props
                    if (!cx || !cy || !payload.isPredicted || !payload.showDot) return null
                    return (
                      <circle
                        key={`pred-${payload.date}`}
                        cx={cx} cy={cy} r={3}
                        fill='#22c55e'
                        opacity={0.8}
                      />
                    )
                  }}
                  activeDot={{ r: 4, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="milestones-box">
          <div className="milestones-header">
            <span className="milestones-title">Milestones</span>
            <span className="milestones-rate">~{predictions.avgDailyGrowth || 0}/day</span>
          </div>
          <div className="milestones-list">
            {predictions.milestones?.length > 0 ? (
              predictions.milestones.map((m) => (
                <div key={m.milestone} className="milestone-item">
                  <div className="milestone-target">
                    <span className="milestone-number">{formatNumber(m.milestone)}</span>
                  </div>
                  <div className="milestone-eta">
                    <span className="milestone-days">{m.daysToReach}d</span>
                    <span className="milestone-date">{formatMilestoneDate(m.eta)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-milestones"><SkeletonBar width="60%" height={14} /></div>
            )}
          </div>
          <div className="milestones-legend">
            <div className="legend-item">
              <span className="legend-dot actual"></span>
              <span>Actual</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot current"></span>
              <span>Today</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot predicted"></span>
              <span>Projected</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .total-users-chart-container {
          background: var(--color-bg-card);
          border: 1px solid var(--color-overlay-medium);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 24px;
        }
        .chart-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          flex-wrap: wrap;
          gap: 10px;
        }
        .chart-title-section {
          display: flex;
          align-items: baseline;
          gap: 10px;
          flex-wrap: wrap;
        }
        .chart-title { font-size: 16px; font-weight: 600; color: var(--color-text-main); margin: 0; }
        .chart-subtitle { font-size: 13px; color: var(--color-primary); font-weight: 500; }
        .chart-controls-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .timeframe-switch,
        .projection-switch {
          display: flex;
          align-items: center;
          background: var(--color-bg-card);
          border-radius: 6px;
          padding: 2px;
          border: 1px solid var(--color-overlay-medium);
        }
        .switch-label { font-size: 10px; color: var(--color-text-muted); padding: 0 6px; text-transform: uppercase; }
        .timeframe-btn,
        .projection-btn {
          padding: 5px 10px;
          background: transparent;
          border: none;
          color: var(--color-text-muted);
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s;
        }
        .timeframe-btn:hover,
        .projection-btn:hover { color: #aaa; }
        .timeframe-btn.active { background: var(--color-overlay-medium); color: var(--color-text-main); }
        .projection-btn.active { background: #22c55e; color: var(--color-text-main); }
        .chart-body-row { display: flex; gap: 16px; }
        .chart-area { flex: 1; min-width: 0; }
        .chart-loading,
        .chart-error {
          height: 280px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-muted);
          font-size: 14px;
        }
        :global(.chart-tooltip) {
          background: rgba(12, 12, 12, 0.98);
          border: 1px solid var(--color-overlay-medium);
          border-radius: 8px;
          padding: 10px 14px;
          min-width: 130px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.7);
        }
        :global(.tooltip-date) {
          color: var(--color-text-muted);
          margin: 0 0 6px 0;
          font-size: 10px;
          font-weight: 500;
          border-bottom: 1px solid var(--color-overlay-subtle);
          padding-bottom: 5px;
        }
        :global(.tooltip-tag) { margin-left: 5px; font-weight: 600; }
        :global(.tooltip-tag.projected) { color: #22c55e; }
        :global(.tooltip-tag.current) { color: var(--color-primary); }
        :global(.tooltip-row) { display: flex; justify-content: space-between; margin-bottom: 2px; }
        :global(.tooltip-label) { color: var(--color-text-muted); font-size: 11px; }
        :global(.tooltip-value) { color: var(--color-text-main); font-weight: 600; font-size: 11px; }
        :global(.tooltip-value.green) { color: #22c55e; }
        .milestones-box {
          width: 160px;
          flex-shrink: 0;
          background: var(--color-bg-card);
          border: 1px solid var(--color-overlay-light);
          border-radius: 10px;
          padding: 12px;
          display: flex;
          flex-direction: column;
        }
        .milestones-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--color-overlay-subtle);
        }
        .milestones-title { font-size: 12px; font-weight: 600; color: var(--color-text-main); }
        .milestones-rate { font-size: 9px; color: #22c55e; font-weight: 500; }
        .milestones-list { flex: 1; display: flex; flex-direction: column; gap: 6px; }
        .milestone-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 8px;
          background: var(--color-overlay-faint);
          border-radius: 5px;
          transition: background 0.2s;
        }
        .milestone-item:hover { background: var(--color-overlay-subtle); }
        .milestone-number { font-size: 13px; font-weight: 700; color: var(--color-text-main); }
        .milestone-eta { display: flex; flex-direction: column; align-items: flex-end; }
        .milestone-days { font-size: 11px; font-weight: 600; color: #22c55e; }
        .milestone-date { font-size: 9px; color: var(--color-text-muted); }
        .no-milestones { color: var(--color-text-muted); font-size: 11px; text-align: center; padding: 16px 0; }
        .milestones-legend {
          margin-top: 10px;
          padding-top: 8px;
          border-top: 1px solid var(--color-overlay-subtle);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .legend-item { display: flex; align-items: center; gap: 6px; font-size: 9px; color: var(--color-text-muted); }
        .legend-dot { width: 7px; height: 7px; border-radius: 50%; }
        .legend-dot.actual { background: var(--color-primary); }
        .legend-dot.current { background: var(--color-primary); border: 2px solid #fff; box-sizing: border-box; }
        .legend-dot.predicted { background: #22c55e; opacity: 0.8; }
        @media (max-width: 900px) {
          .chart-header-row { flex-direction: column; align-items: flex-start; }
          .chart-controls-row { width: 100%; justify-content: flex-start; }
        }
        @media (max-width: 640px) {
          .total-users-chart-container { padding: 12px; }
          .chart-title { font-size: 14px; }
          .chart-subtitle { font-size: 12px; }
          .chart-controls-row { width: 100%; justify-content: space-between; }
          .timeframe-btn, .projection-btn { padding: 6px 9px; font-size: 11px; }
          .switch-label { padding: 0 5px; font-size: 10px; }
          .chart-body-row { flex-direction: column; gap: 12px; }
          .milestones-box { width: 100%; padding: 10px; }
          .milestones-header { margin-bottom: 8px; padding-bottom: 6px; }
          .milestones-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
          .milestone-item { padding: 8px; }
          .milestones-legend { flex-direction: row; justify-content: center; gap: 12px; margin-top: 8px; padding-top: 6px; }
        }
        @media (max-width: 400px) {
          .timeframe-btn, .projection-btn { padding: 5px 7px; font-size: 10px; }
          .switch-label { padding: 0 4px; font-size: 9px; }
          .milestones-list { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
