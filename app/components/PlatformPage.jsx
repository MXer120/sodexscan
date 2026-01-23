import React, { useState, useEffect } from 'react'
import ChartCard from './ChartCard'
import TopPairs from './TopPairs'
import '../styles/MainnetPage.css'

const BASE_URL = 'https://mainnet-data.sodex.dev/api/v1/dashboard'

export default function PlatformPage() {
  // Platform stats
  const [volumeData, setVolumeData] = useState([])
  const [oiData, setOiData] = useState([])
  const [tvlData, setTvlData] = useState([])
  const [usersData, setUsersData] = useState([])
  const [uniqueTradersData, setUniqueTradersData] = useState([])
  const [tradesCountData, setTradesCountData] = useState([])
  const [fundingRateData, setFundingRateData] = useState([])
  const [volumeTotals, setVolumeTotals] = useState({})
  const [availableMarkets, setAvailableMarkets] = useState([])
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
    const symbols = 'ONDO-USD,AAVE-USD,1000PEPE-USD,1000SHIB-USD,BTC-USD,ADA-USD,HYPE-USD,SUI-USD,XAUT-USD,DOGE-USD,ASTER-USD,XPL-USD,LINK-USD,LTC-USD,XRP-USD,MON-USD,ETH-USD,AVAX-USD,BNB-USD,PUMP-USD,ZEC-USD,FARTCOIN-USD,PENGU-USD,WLFI-USD,ENA-USD,WLD-USD,UNI-USD,SOL-USD,BCH-USD,ADA/USDC,LINK/USDC,ETH/USDC,XRP/USDC,DOGE/USDC,BTC/USDC,SOL/USDC,MAG7ssi/USDC,BNB/USDC,SOSO/USDC'
    const fundingSymbols = 'BTC-USD,ETH-USD,SOL-USD'

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
        const vData = volumeJson.data.data.map(d => ({
          date: d.day_date,
          ...Object.fromEntries(Object.entries(d.markets || {}).map(([k, v]) => [k, parseFloat(v)])),
          total: parseFloat(d.total),
          cumulative: parseFloat(d.cumulative)
        }))
        setVolumeData(vData)
        setAvailableMarkets(volumeJson.data.availableMarkets || [])

        const totals = {}
        vData.forEach(d => {
          Object.entries(d).forEach(([k, v]) => {
            if (!['date', 'total', 'cumulative'].includes(k)) {
              totals[k] = (totals[k] || 0) + v
            }
          })
        })
        setVolumeTotals(totals)

        const totalVol = vData.length > 0 ? vData[vData.length - 1].cumulative : 0
        setPlatformStats(prev => ({ ...prev, totalVolume: totalVol }))
      }

      if (usersJson.code === 0 && usersJson.data) {
        const uData = usersJson.data.data.map(d => ({
          date: d.day_date,
          new_users: parseFloat(d.newUsers || d.total || 0),
          cumulative: parseFloat(d.cumulativeUsers || d.cumulative || 0)
        }))
        setUsersData(uData)
        const totalUsers = uData.length > 0 ? uData[uData.length - 1].cumulative : 0
        setPlatformStats(prev => ({ ...prev, totalUsers }))
      }

      if (tvlJson.code === 0 && tvlJson.data) {
        const tvData = tvlJson.data.data.map(d => ({
          date: d.day_date,
          tvl: parseFloat(d.value || d.total || d.tvl || 0)
        }))
        setTvlData(tvData)
        const latestTVL = tvData.length > 0 ? tvData[tvData.length - 1].tvl : 0
        setPlatformStats(prev => ({ ...prev, tvl: latestTVL }))
      }

      if (oiJson.code === 0 && oiJson.data) {
        const oData = oiJson.data.data.map(d => ({
          date: d.day_date,
          ...Object.fromEntries(Object.entries(d.markets || {}).map(([k, v]) => [k, parseFloat(v)])),
          total: parseFloat(d.total || 0)
        }))
        setOiData(oData)
        const latestOI = oData.length > 0 ? oData[oData.length - 1].total : 0
        setPlatformStats(prev => ({ ...prev, totalOI: latestOI }))
      }

      setPlatformLoading(false)

      // Load remaining charts
      fetch(`${BASE_URL}/unique-traders?start_date=2024-01-01&end_date=2025-12-26&market_type=all&symbols=${encodeURIComponent(symbols)}`)
        .then(res => res.json())
        .then(json => {
          if (json.code === 0 && json.data) {
            setUniqueTradersData(json.data.data.map(d => ({
              date: d.day_date,
              ...Object.fromEntries(Object.entries(d.markets || {}).map(([k, v]) => [k, parseFloat(v)])),
              total: parseFloat(d.total || 0)
            })))
          }
        })

      fetch(`${BASE_URL}/trades-count?start_date=2024-01-01&end_date=2025-12-26&market_type=all&symbols=${encodeURIComponent(symbols)}`)
        .then(res => res.json())
        .then(json => {
          if (json.code === 0 && json.data) {
            setTradesCountData(json.data.data.map(d => ({
              date: d.day_date,
              ...Object.fromEntries(Object.entries(d.markets || {}).map(([k, v]) => [k, parseFloat(v)])),
              total: parseFloat(d.total || 0),
              cumulative: parseFloat(d.cumulative || 0)
            })))
          }
        })

      fetch(`${BASE_URL}/funding-rate?start_date=2024-01-01&end_date=2025-12-26&basis=8h&symbols=${encodeURIComponent(fundingSymbols)}`)
        .then(res => res.json())
        .then(json => {
          if (json.code === 0 && json.data) {
            setFundingRateData(json.data.data.map(d => ({
              date: d.day_date,
              ...Object.fromEntries(Object.entries(d.markets || {}).map(([k, v]) => [k, parseFloat(v)]))
            })))
          }
        })

    } catch (err) {
      console.error('Failed to fetch platform data:', err)
      setPlatformLoading(false)
    }
  }

  const formatNumber = (num, prefix = '') => {
    // Use European format: . for thousands, , for decimals
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

  // Chart series helpers
  const getVolumeSeries = () => {
    const markets = availableMarkets.map(m => ({
      key: m.symbol,
      label: m.symbol,
      type: 'bar',
      volume: volumeTotals[m.symbol] || 0
    })).sort((a, b) => b.volume - a.volume)
    return [{ key: 'cumulative', label: 'Cumulative', type: 'line', cumulative: true }, ...markets]
  }

  const getOISeries = () => {
    if (oiData.length === 0) return []
    const allMarkets = new Set()
    oiData.forEach(row => Object.keys(row).forEach(k => { if (!['date', 'total'].includes(k)) allMarkets.add(k) }))
    return Array.from(allMarkets).map(k => ({ key: k, label: k, type: 'bar' }))
  }

  return (
    <div className="mainnet-page dashboard">
      <h1 className="dashboard-title">Platform Stats</h1>

      <div className="stats-row">
        <div className="stat-item">
          <span className="stat-label">Total Users</span>
          <span className="stat-value">{formatNumber(platformStats.totalUsers)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Volume</span>
          <span className="stat-value">{formatNumber(platformStats.totalVolume, '$')}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total OI</span>
          <span className="stat-value">{formatNumber(platformStats.totalOI, '$')}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">TVL</span>
          <span className="stat-value">{formatNumber(platformStats.tvl, '$')}</span>
        </div>
      </div>

      {/* Top 10 Pairs Box */}
      <TopPairs />

      {platformLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading...</div>
      ) : (
        <div className="charts-grid">
          <ChartCard
            title="Volume"
            data={volumeData}
            series={getVolumeSeries()}
            showCumulative={true}
            stacked={true}
          />
          <ChartCard
            title="Open Interest"
            data={oiData}
            series={getOISeries()}
            stacked={true}
          />
          <ChartCard
            title="TVL"
            data={tvlData}
            series={[{ key: 'tvl', label: 'TVL', type: 'area' }]}
            defaultSelected={['tvl']}
          />
          <ChartCard
            title="New Users"
            data={usersData}
            series={[
              { key: 'cumulative', label: 'Cumulative', type: 'line', cumulative: true },
              { key: 'new_users', label: 'New Users', type: 'bar' }
            ]}
            showCumulative={true}
            defaultSelected={['cumulative', 'new_users']}
          />
          {uniqueTradersData.length > 0 && (
            <ChartCard
              title="Unique Traders"
              data={uniqueTradersData}
              series={(() => {
                const allMarkets = new Set()
                uniqueTradersData.forEach(row => Object.keys(row).forEach(k => { if (!['date', 'total'].includes(k)) allMarkets.add(k) }))
                return Array.from(allMarkets).map(k => ({ key: k, label: k, type: 'bar' }))
              })()}
              stacked={true}
            />
          )}
          {tradesCountData.length > 0 && (
            <ChartCard
              title="Trades Count"
              data={tradesCountData}
              series={(() => {
                const allMarkets = new Set()
                tradesCountData.forEach(row => Object.keys(row).forEach(k => { if (!['date', 'total', 'cumulative'].includes(k)) allMarkets.add(k) }))
                return [
                  { key: 'cumulative', label: 'Cumulative', type: 'line', cumulative: true },
                  ...Array.from(allMarkets).map(k => ({ key: k, label: k, type: 'bar' }))
                ]
              })()}
              showCumulative={true}
              stacked={true}
            />
          )}
          {fundingRateData.length > 0 && (
            <ChartCard
              title="Funding Rate (8h)"
              data={fundingRateData}
              series={(() => {
                const allMarkets = new Set()
                fundingRateData.forEach(row => Object.keys(row).forEach(k => { if (k !== 'date') allMarkets.add(k) }))
                return Array.from(allMarkets).map(k => ({ key: k, label: k, type: 'line' }))
              })()}
            />
          )}
        </div>
      )}
    </div>
  )
}
