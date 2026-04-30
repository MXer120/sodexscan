'use client'

import { useMemo } from 'react'
import { useWalletSlowData as useWalletData } from '../../../hooks/useWalletData'
import { usePerformanceMode } from '../../../lib/PerformanceModeContext'
import {
  ComposedChart, Area, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell
} from 'recharts'
import { SkeletonChart } from '../../Skeleton'

const TIMEFRAMES = ['1W', '1M', '3M', '1Y', 'ALL']
const TIMEFRAME_DAYS = { '1W': 7, '1M': 30, '3M': 90, '1Y': 365, ALL: null }

const formatDate = (ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const formatUsd = (n) => {
  if (n === null || n === undefined) return '-'
  const abs = Math.abs(n)
  if (abs >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
  if (abs >= 1e3) return '$' + (n / 1e3).toFixed(2) + 'K'
  return '$' + n.toFixed(2)
}

export default function PnlChartWidget({ config, onUpdateConfig }) {
  const { data, isLoading } = useWalletData(config.walletAddress || null)
  const isPerf = usePerformanceMode()

  const timeframe = config.timeframe || '1M'
  const showCumulative = config.showCumulative !== false
  const showDaily = config.showDaily !== false

  const chartData = useMemo(() => {
    const items = data?.data?.daily_pnl?.data?.items
    if (!items || items.length === 0) return []

    const sorted = [...items].sort((a, b) => a.ts_ms - b.ts_ms)

    // Calculate daily PnL from cumulative diffs (pnl is cumulative string)
    const processed = sorted.map((item, i) => {
      const cumPnl = parseFloat(item.pnl || 0)
      const prevPnl = i === 0 ? 0 : parseFloat(sorted[i - 1].pnl || 0)
      const daily = cumPnl - prevPnl
      return {
        ts_ms: item.ts_ms,
        cumulative: cumPnl,
        daily,
      }
    })

    // Filter by timeframe
    const days = TIMEFRAME_DAYS[timeframe]
    if (days !== null) {
      const cutoff = Date.now() - days * 86400000
      return processed.filter(d => d.ts_ms >= cutoff)
    }
    return processed
  }, [data, timeframe])

  if (!config.walletAddress) {
    return (
      <div className="agg-widget-address">
        <input placeholder="Enter wallet address..." onKeyDown={e => {
          if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
            onUpdateConfig({ ...config, walletAddress: (e.target as HTMLInputElement).value.trim() })
          }
        }} />
      </div>
    )
  }

  if (isLoading) return <SkeletonChart />

  if (chartData.length === 0) {
    return <div style={{ padding: 12, color: 'var(--color-text-muted)' }}>No PnL data available</div>
  }

  // Calculate zero-line offset for cumulative gradient (bullish above 0, bearish below)
  const cumValues = chartData.map(d => d.cumulative)
  const maxVal = Math.max(...cumValues)
  const minVal = Math.min(...cumValues)
  const range = maxVal - minVal
  const zeroOffset = range > 0 ? Math.max(0, Math.min(1, maxVal / range)) : 0.5

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: 4, padding: '0 4px 6px', flexShrink: 0 }}>
        {TIMEFRAMES.map(tf => (
          <button
            key={tf}
            onClick={() => onUpdateConfig({ ...config, timeframe: tf })}
            style={{
              padding: '2px 8px',
              fontSize: 10,
              borderRadius: 4,
              border: 'none',
              cursor: 'pointer',
              background: tf === timeframe ? 'var(--color-primary, #48cbff)' : 'var(--color-overlay-subtle)',
              color: tf === timeframe ? '#000' : 'var(--color-text-muted)',
              fontWeight: tf === timeframe ? 600 : 400,
            }}
          >
            {tf}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="pnlCumulativeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-success, #10b981)" stopOpacity={0.3} />
                <stop offset={`${zeroOffset * 100}%`} stopColor="var(--color-success, #10b981)" stopOpacity={0.05} />
                <stop offset={`${zeroOffset * 100}%`} stopColor="var(--color-error, #ef4444)" stopOpacity={0.05} />
                <stop offset="100%" stopColor="var(--color-error, #ef4444)" stopOpacity={0.3} />
              </linearGradient>
              <linearGradient id="pnlCumulativeStroke" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-success, #10b981)" />
                <stop offset={`${zeroOffset * 100}%`} stopColor="var(--color-success, #10b981)" />
                <stop offset={`${zeroOffset * 100}%`} stopColor="var(--color-error, #ef4444)" />
                <stop offset="100%" stopColor="var(--color-error, #ef4444)" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="1 8" stroke="var(--color-overlay-subtle)" />
            <XAxis
              dataKey="ts_ms"
              tickFormatter={formatDate}
              stroke="var(--color-border-strong)"
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              yAxisId="left"
              tickFormatter={formatUsd}
              stroke="var(--color-border-strong)"
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <Tooltip
              labelFormatter={formatDate}
              formatter={(value, name) => [formatUsd(value), name === 'cumulative' ? 'Cumulative' : 'Daily']}
              contentStyle={{
                background: 'rgba(12,12,12,0.98)',
                border: '1px solid var(--color-overlay-medium)',
                borderRadius: 8,
                fontSize: 11,
              }}
              labelStyle={{ color: 'var(--color-text-main)' }}
              itemStyle={{ color: 'var(--color-text-secondary)' }}
            />
            {showDaily && (
              <Bar dataKey="daily" yAxisId="left" barSize={chartData.length > 90 ? 2 : chartData.length > 30 ? 4 : 8} opacity={0.8} isAnimationActive={!isPerf}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.daily >= 0 ? 'var(--color-success, #10b981)' : 'var(--color-error, #ef4444)'}
                  />
                ))}
              </Bar>
            )}
            {showCumulative && (
              <Area
                type="monotone"
                dataKey="cumulative"
                yAxisId="left"
                stroke="url(#pnlCumulativeStroke)"
                strokeWidth={2}
                fill="url(#pnlCumulativeGrad)"
                dot={false}
                isAnimationActive={!isPerf}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
