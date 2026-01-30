import React, { useState, useEffect } from 'react'
import TopPairs from './TopPairs'
import '../styles/MainnetPage.css'
import { supabase } from '../lib/supabaseClient'

export default function PlatformPage() {
  const [platformStats, setPlatformStats] = useState({
    totalUsers: 0,
    totalTraders: 0,
    activityRate: 0
  })
  const [platformLoading, setPlatformLoading] = useState(true)

  useEffect(() => {
    document.title = 'Platform | CommunityScan SoDEX'
    loadPlatformData()
  }, [])

  const loadPlatformData = async () => {
    setPlatformLoading(true)

    try {
      // Fetch total users (all rows in leaderboard)
      const { count: totalUsers, error: usersError } = await supabase
        .from('leaderboard')
        .select('*', { count: 'exact', head: true })

      if (usersError) {
        console.error('Failed to fetch total users:', usersError)
      }

      // Fetch total traders (non-zero cumulative_pnl OR cumulative_volume)
      const { count: totalTraders, error: tradersError } = await supabase
        .from('leaderboard')
        .select('*', { count: 'exact', head: true })
        .or('cumulative_pnl.neq.0,cumulative_volume.neq.0')

      if (tradersError) {
        console.error('Failed to fetch total traders:', tradersError)
      }

      // Calculate activity rate
      const activityRate = totalUsers > 0 ? (totalTraders / totalUsers) * 100 : 0

      setPlatformStats({
        totalUsers: totalUsers || 0,
        totalTraders: totalTraders || 0,
        activityRate
      })

      setPlatformLoading(false)
    } catch (err) {
      console.error('Failed to fetch platform data:', err)
      setPlatformLoading(false)
    }
  }

  const formatNumber = (num, prefix = '') => {
    if (Math.abs(num) >= 1000000) {
      const formatted = (num / 1000000).toFixed(2).replace('.', ',')
      return `${prefix}${formatted}M`
    }
    if (Math.abs(num) >= 1000) {
      const formatted = (num / 1000).toFixed(2).replace('.', ',')
      return `${prefix}${formatted}K`
    }
    return `${prefix}${num.toFixed(2).replace('.', ',')}`
  }

  const formatPercent = (num) => {
    return `${num.toFixed(1)}%`
  }

  return (
    <div className="mainnet-page dashboard">
      <h1 className="dashboard-title">Platform Stats</h1>

      <div className="stats-row">
        <div className="stat-item">
          <span className="stat-label">Total Users</span>
          <span className="stat-value">{platformLoading ? '...' : formatNumber(platformStats.totalUsers)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Traders</span>
          <span className="stat-value">{platformLoading ? '...' : formatNumber(platformStats.totalTraders)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Activity Rate</span>
          <span className="stat-value">{platformLoading ? '...' : formatPercent(platformStats.activityRate)}</span>
        </div>
      </div>

      <TopPairs />
    </div>
  )
}
