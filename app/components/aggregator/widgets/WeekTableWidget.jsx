'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useLeaderboardMeta } from '../../../hooks/useLeaderboardMeta'

const TOTAL_POOL = 1_000_000

const formatNumber = (num) => num.toLocaleString('en-US')

export default function WeekTableWidget() {
  const { data: meta } = useLeaderboardMeta()
  const [weeklyStats, setWeeklyStats] = useState({})
  const [loading, setLoading] = useState(true)

  const currentWeek = meta?.current_week_number || 1
  const totalUserCounts = meta?.total_user_counts || {}

  useEffect(() => {
    if (!meta || currentWeek <= 1) { setLoading(false); return }
    ;(async () => {
      try {
        const stats = {}
        for (let w = currentWeek - 1; w >= 1 && w >= currentWeek - 4; w--) {
          const { count: traders } = await supabase
            .from('leaderboard_weekly')
            .select('id', { count: 'exact', head: true })
            .eq('week_number', w)
            .gt('cumulative_volume', 0)
            .not('is_sodex_owned', 'is', true)

          const { count: activeTraders } = await supabase
            .from('leaderboard_weekly')
            .select('id', { count: 'exact', head: true })
            .eq('week_number', w)
            .gte('cumulative_volume', 5000)
            .not('is_sodex_owned', 'is', true)

          stats[w] = {
            traders: traders || 0,
            activeTraders: activeTraders || 0,
            totalUsers: totalUserCounts[String(w)] || 0
          }
        }
        setWeeklyStats(stats)
      } catch (err) { console.error(err) }
      setLoading(false)
    })()
  }, [meta, currentWeek])

  if (loading) return <div style={{ padding: 12, color: 'var(--color-text-muted)' }}>Loading...</div>

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
      {weeks.length === 0 && (
        <div style={{ padding: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>No historical weeks yet</div>
      )}
    </div>
  )
}
