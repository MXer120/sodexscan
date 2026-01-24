import React, { useState, useEffect } from 'react'
import TopPairs from './TopPairs'
import '../styles/MainnetPage.css'

const BASE_URL = 'https://mainnet-data.sodex.dev/api/v1/dashboard'

export default function PlatformPage() {
  const [platformStats, setPlatformStats] = useState({
    totalUsers: 0,
    totalVolume: 0,
    totalOI: 0,
    tvl: 0
  })
  const [platformLoading, setPlatformLoading] = useState(true)

  useEffect(() => {
    loadPlatformData()
  }, [])

  const loadPlatformData = async () => {
    setPlatformLoading(true)

    try {
      const [volumeRes, usersRes, tvlRes, oiRes] = await Promise.all([
        fetch(`${BASE_URL}/volume?start_date=2024-01-01&end_date=2025-12-26&market_type=all`),
        fetch(`${BASE_URL}/users?start_date=2024-01-01&end_date=2025-12-26`),
        fetch(`${BASE_URL}/tvl?start_date=2024-01-01&end_date=2025-12-26`),
        fetch(`${BASE_URL}/open-interest?start_date=2024-01-01&end_date=2025-12-26&symbols=BTC-USD,ETH-USD,SOL-USD`)
      ])

      const volumeJson = await volumeRes.json()
      const usersJson = await usersRes.json()
      const tvlJson = await tvlRes.json()
      const oiJson = await oiRes.json()

      if (volumeJson.code === 0 && volumeJson.data) {
        const vData = volumeJson.data.data
        const totalVol = vData.length > 0 ? parseFloat(vData[vData.length - 1].cumulative) : 0
        setPlatformStats(prev => ({ ...prev, totalVolume: totalVol }))
      }

      if (usersJson.code === 0 && usersJson.data) {
        const uData = usersJson.data.data
        const totalUsers = uData.length > 0 ? parseFloat(uData[uData.length - 1].cumulativeUsers || uData[uData.length - 1].cumulative || 0) : 0
        setPlatformStats(prev => ({ ...prev, totalUsers }))
      }

      if (tvlJson.code === 0 && tvlJson.data) {
        const tvData = tvlJson.data.data
        const latestTVL = tvData.length > 0 ? parseFloat(tvData[tvData.length - 1].value || tvData[tvData.length - 1].total || tvData[tvData.length - 1].tvl || 0) : 0
        setPlatformStats(prev => ({ ...prev, tvl: latestTVL }))
      }

      if (oiJson.code === 0 && oiJson.data) {
        const oData = oiJson.data.data
        const latestOI = oData.length > 0 ? parseFloat(oData[oData.length - 1].total || 0) : 0
        setPlatformStats(prev => ({ ...prev, totalOI: latestOI }))
      }

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

  return (
    <div className="mainnet-page dashboard">
      <h1 className="dashboard-title">Platform Stats</h1>

      <div className="stats-row">
        <div className="stat-item">
          <span className="stat-label">Total Users</span>
          <span className="stat-value">{platformLoading ? '...' : formatNumber(platformStats.totalUsers)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Volume</span>
          <span className="stat-value">{platformLoading ? '...' : formatNumber(platformStats.totalVolume, '$')}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total OI</span>
          <span className="stat-value">{platformLoading ? '...' : formatNumber(platformStats.totalOI, '$')}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">TVL</span>
          <span className="stat-value">{platformLoading ? '...' : formatNumber(platformStats.tvl, '$')}</span>
        </div>
      </div>

      <TopPairs />
    </div>
  )
}
