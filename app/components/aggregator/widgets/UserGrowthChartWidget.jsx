'use client'
import { useMemo } from 'react'
import { useUserGrowthData } from '../../../hooks/useUserGrowthData'
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea
} from 'recharts'

const formatDate = (ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const formatNum = (num) => {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}K`
  return num?.toLocaleString() || '0'
}

export default function UserGrowthChartWidget({ config }) {
  const timeframeDays = config?.timeframeDays ?? 30
  const projectionDays = config?.projectionDays ?? 7
  const { data: growthData, isLoading } = useUserGrowthData()

  const chartResult = useMemo(() => {
    if (!growthData?.data || growthData.data.length < 7) return null
    const data = growthData.data
    const lastActual = data[data.length - 1]
    const lastDate = lastActual.date
    const dayMs = 86400000

    const last3 = data.slice(-3)
    const recentAvg = last3.reduce((s, d) => s + d.newUsers, 0) / 3
    const basePrediction = Math.max(1, recentAvg)

    let cumulative = lastActual.totalUsers
    const predicted = []
    for (let i = 1; i <= projectionDays; i++) {
      const variance = 0.97 + (((i * 7) % 10) / 100)
      const daily = Math.round(Math.max(1, basePrediction * variance))
      cumulative += daily
      predicted.push({
        date: lastDate + i * dayMs, newUsers: daily, totalUsers: cumulative,
        predictedTotal: cumulative, isPredicted: true
      })
    }

    const chartData = data.map((d, i) => ({
      ...d, actualTotal: d.totalUsers, predictedTotal: null,
      isCurrentDay: i === data.length - 1
    }))
    if (chartData.length > 0) chartData[chartData.length - 1].predictedTotal = chartData[chartData.length - 1].totalUsers

    let allData = [...chartData, ...predicted]
    if (timeframeDays !== null) {
      const cutoff = lastDate - timeframeDays * dayMs
      allData = allData.filter(d => d.date >= cutoff)
    }

    return { filteredData: allData, currentDayDate: lastDate }
  }, [growthData, timeframeDays, projectionDays])

  if (isLoading || !chartResult) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>Loading...</div>
  }

  const { filteredData, currentDayDate } = chartResult
  const lastDate = filteredData[filteredData.length - 1]?.date

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>
        {formatNum(growthData.totalUsers)} users
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <ComposedChart data={filteredData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
          <defs>
            <linearGradient id="aggGrowthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="1 8" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="date" tickFormatter={formatDate} stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={40} />
          <YAxis tickFormatter={formatNum} stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip labelFormatter={(l) => formatDate(l)} formatter={(v) => [formatNum(v), 'Users']} contentStyle={{ background: 'rgba(12,12,12,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
          {currentDayDate && lastDate && <ReferenceArea x1={currentDayDate} x2={lastDate} fill="var(--color-success)" fillOpacity={0.06} />}
          <Area type="monotone" dataKey="actualTotal" stroke="var(--color-primary)" strokeWidth={2} fill="url(#aggGrowthGrad)" connectNulls={false} dot={false} />
          <Line type="monotone" dataKey="predictedTotal" stroke="var(--color-success)" strokeWidth={2} strokeDasharray="4 4" connectNulls dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
