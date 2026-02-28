'use client'

import { useMemo } from 'react'
import { useWalletData } from '../../../hooks/useWalletData'
import {
  ComposedChart, Area, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell
} from 'recharts'

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
          if (e.key === 'Enter' && e.target.value.trim()) {
            onUpdateConfig({ ...config, walletAddress: e.target.value.trim() })
          }
        }} />
      </div>
    )
  }

  if (isLoading) return <div style={{ padding: 12, color: 'var(--color-text-muted)' }}>Loading...</div>

  if (chartData.length === 0) {
    return <div style={{ padding: 12, color: 'var(--color-text-muted)' }}>No PnL data available</div>
  }

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
              background: tf === timeframe ? 'var(--color-primary, #48cbff)' : 'rgba(255,255,255,0.06)',
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
                <stop offset="0%" stopColor="var(--color-primary, #48cbff)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--color-primary, #48cbff)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="1 8" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="ts_ms"
              tickFormatter={formatDate}
              stroke="rgba(255,255,255,0.3)"
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              yAxisId="left"
              tickFormatter={formatUsd}
              stroke="rgba(255,255,255,0.3)"
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
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                fontSize: 11,
              }}
            />
            {showDaily && (
              <Bar dataKey="daily" yAxisId="left" barSize={chartData.length > 90 ? 2 : chartData.length > 30 ? 4 : 8} opacity={0.8}>
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
                stroke="var(--color-primary, #48cbff)"
                strokeWidth={2}
                fill="url(#pnlCumulativeGrad)"
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
