'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useLeaderboardMeta } from '../../../hooks/useLeaderboardMeta'
import { SkeletonWeekTable } from '../../Skeleton'

const TOTAL_POOL = 1_000_000

const formatNumber = (num) => num.toLocaleString('en-US')

export default function WeekTableWidget() {
  const { data: meta } = useLeaderboardMeta()
  const [weeklyStats, setWeeklyStats] = useState({})
  const [currentStats, setCurrentStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const currentWeek = meta?.current_week_number || 1
  const totalUserCounts = meta?.total_user_counts || {}

  // All stats: 2 RPCs replace 11 individual COUNT queries
  useEffect(() => {
    if (!meta) return
    ;(async () => {
      try {
        const [currentRes, histRes] = await Promise.all([
          supabase.rpc('get_current_week_stats'),
          currentWeek > 1
            ? supabase.rpc('get_weekly_leaderboard_stats', {
                p_from_week: Math.max(1, currentWeek - 4),
                p_to_week: currentWeek - 1
              })
            : Promise.resolve({ data: [] })
        ])

        if (currentRes.data?.[0]) {
          const r = currentRes.data[0]
          setCurrentStats({
            totalUsers: Number(r.total_users) || 0,
            traders: Number(r.traders) || 0,
            activeTraders: Number(r.active_traders) || 0
          })
        }

        const stats = {}
        for (const row of histRes.data || []) {
          stats[row.week_number] = {
            traders: Number(row.traders) || 0,
            activeTraders: Number(row.active_traders) || 0,
            totalUsers: Number(row.total_users) || totalUserCounts[String(row.week_number)] || 0
          }
        }
        setWeeklyStats(stats)
      } catch (err) { console.error(err) }
      setLoading(false)
    })()
  }, [meta, currentWeek])

  if (loading || !currentStats) return <SkeletonWeekTable rows={5} />

  const weeks = Object.keys(weeklyStats).map(Number).sort((a, b) => b - a)
  const poolSize = meta?.pool_size ? parseFloat(meta.pool_size) : TOTAL_POOL

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>Week</th>
            <th className="text-right">Users</th>
            <th className="text-right">Traders</th>
            <th className="text-right">Active</th>
            <th className="text-right">Avg Reward</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ fontWeight: 600 }}>W{currentWeek} <span style={{ fontSize: 10, color: 'var(--color-primary)' }}>LIVE</span></td>
            <td className="text-right">{formatNumber(currentStats.totalUsers)}</td>
            <td className="text-right">{formatNumber(currentStats.traders)}</td>
            <td className="text-right">{formatNumber(currentStats.activeTraders)}</td>
            <td className="text-right">~{formatNumber(currentStats.activeTraders > 0 ? Math.round(poolSize / currentStats.activeTraders) : 0)}</td>
          </tr>
          {weeks.map(w => {
            const s = weeklyStats[w]
            const avg = s.activeTraders > 0 ? Math.round(poolSize / s.activeTraders) : 0
            return (
              <tr key={w}>
                <td style={{ fontWeight: 600 }}>W{w}</td>
                <td className="text-right">{formatNumber(s.totalUsers)}</td>
                <td className="text-right">{formatNumber(s.traders)}</td>
                <td className="text-right">{formatNumber(s.activeTraders)}</td>
                <td className="text-right">~{formatNumber(avg)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {weeks.length === 0 && currentWeek <= 1 && (
        <div style={{ padding: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>No historical weeks yet</div>
      )}
    </div>
  )
}
