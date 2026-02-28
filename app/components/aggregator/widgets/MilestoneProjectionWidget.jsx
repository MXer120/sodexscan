'use client'
import { useMemo } from 'react'
import { useUserGrowthData } from '../../../hooks/useUserGrowthData'

const COOL_MILESTONES = [
  10000, 20000, 50000, 100000, 200000, 250000, 300000, 400000, 500000,
  600000, 700000, 750000, 800000, 900000, 1000000, 1250000, 1500000,
  1750000, 2000000, 2500000, 3000000, 5000000, 10000000
]

const formatNum = (num) => {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}K`
  return num?.toLocaleString() || '0'
}

const formatMilestoneDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export default function MilestoneProjectionWidget() {
  const { data: growthData, isLoading } = useUserGrowthData()

  const milestones = useMemo(() => {
    if (!growthData?.data || growthData.data.length < 7) return []
    const data = growthData.data
    const last = data[data.length - 1]
    const currentCount = last.totalUsers
    const lastDate = last.date
    const dayMs = 86400000

    const last7 = data.slice(-7)
    const avgDaily = last7.reduce((s, d) => s + d.newUsers, 0) / 7
    if (avgDaily <= 0) return []

    const projEnd = currentCount + avgDaily * 30
    const available = COOL_MILESTONES.filter(m => m > currentCount)
    const within = available.filter(m => m <= projEnd).slice(0, 3)
    const beyond = available.filter(m => m > projEnd)
    const result = [...within]
    if (beyond.length > 0) result.push(beyond[0])
    while (result.length < 4 && beyond.length > result.length - within.length) {
      const idx = result.length - within.length
      if (idx < beyond.length && !result.includes(beyond[idx])) result.push(beyond[idx])
      else break
    }

    return result.slice(0, 4).map(m => {
      const days = Math.ceil((m - currentCount) / avgDaily)
      const eta = new Date(lastDate + days * dayMs)
      return { milestone: m, daysToReach: days, eta }
    })
  }, [growthData])

  if (isLoading) return <div style={{ padding: 12, color: 'var(--color-text-muted)' }}>Loading...</div>

  const avgDaily = growthData?.data?.length >= 7
    ? Math.round(growthData.data.slice(-7).reduce((s, d) => s + d.newUsers, 0) / 7)
    : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>Milestones</span>
        <span style={{ fontSize: 9, color: 'var(--color-success)', fontWeight: 500 }}>~{avgDaily}/day</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {milestones.map(m => (
          <div key={m.milestone} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 5
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{formatNum(m.milestone)}</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-success)' }}>{m.daysToReach}d</span>
              <span style={{ fontSize: 9, color: '#555' }}>{formatMilestoneDate(m.eta)}</span>
            </div>
          </div>
        ))}
        {milestones.length === 0 && (
          <div style={{ color: '#666', fontSize: 11, textAlign: 'center', padding: '16px 0' }}>Loading...</div>
        )}
      </div>
    </div>
  )
}
