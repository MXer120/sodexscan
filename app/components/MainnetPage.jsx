import React, { useState, useEffect, useRef } from 'react'
import ChartCard from './ChartCard'
import { motion } from 'framer-motion'
import DebugPanel from './DebugPanel'
import { createClient } from '@supabase/supabase-js'
import '../styles/MainnetPage.css'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// TabSwitch - separate component for User/Platform tabs
function TabSwitch({
  value,
  onValueChange,
  options
}) {
  return (
    <div className="tab-switch">
      {options.map((option) => (
        <button
          key={option}
          className={`tab-switch-btn ${value === option ? 'active' : ''}`}
          onClick={() => onValueChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

const BASE_URL = 'https://mainnet-data.sodex.dev/api/v1/dashboard'

// Copy icon component for wallet addresses
const CopyableAddress = ({ address }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  return (
    <span className="copyable-address" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span className="addr-text" style={{ fontFamily: 'monospace', fontSize: '13px' }}>{address}</span>
      <button
        className="copy-btn"
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy address'}
        style={{
          background: 'transparent',
          border: 'none',
          padding: '2px',
          cursor: 'pointer',
          opacity: 0,
          transition: 'opacity 0.2s',
          display: 'inline-flex',
          alignItems: 'center'
        }}
      >
        {copied ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        )}
      </button>
      <style>{`
        .copyable-address:hover .copy-btn { opacity: 1 !important; }
        .copy-btn:hover svg { stroke: #4ade80; }
      `}</style>
    </span>
  )
}

export default function MainnetPage() {
  const [activeTab, setActiveTab] = useState('User')

  // Leaderboard data from CSV
  const [leaderboardData, setLeaderboardData] = useState([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const [leaderboardType, setLeaderboardType] = useState('volume')
  const [leaderboardSearch, setLeaderboardSearch] = useState('')
  const [highlightedWallet, setHighlightedWallet] = useState(null)
  const [leaderboardPage, setLeaderboardPage] = useState(1)
  const highlightedRowRef = useRef(null)

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
    loadLeaderboardFromSupabase()
    loadPlatformData()
  }, [])

  useEffect(() => {
    if (highlightedWallet && highlightedRowRef.current) {
      highlightedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightedWallet])

  const loadLeaderboardFromSupabase = async () => {
    setLeaderboardLoading(true)
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('account_id, wallet_address, cumulative_pnl, cumulative_volume, unrealized_pnl, pnl_rank, volume_rank', { count: 'exact' })
        .order('pnl_rank', { ascending: true, nullsFirst: false })
        .limit(10000)

      if (error) throw error

      const formattedData = (data || []).map(row => {
        const pnl = parseFloat(row.cumulative_pnl)
        const volume = parseFloat(row.cumulative_volume)
        const unrealizedPnl = parseFloat(row.unrealized_pnl)

        return {
          accountId: row.account_id,
          walletAddress: row.wallet_address,
          pnl: isNaN(pnl) ? 0 : pnl,
          volume: isNaN(volume) ? 0 : volume,
          unrealizedPnl: isNaN(unrealizedPnl) ? 0 : unrealizedPnl,
          pnlRank: parseInt(row.pnl_rank, 10),
          volumeRank: parseInt(row.volume_rank, 10)
        }
      })

      setLeaderboardData(formattedData)
    } catch (err) {
      console.error('Failed to load leaderboard from Supabase:', err)
    }
    setLeaderboardLoading(false)
  }

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

  const formatFullNumber = (num) => {
    // Use European format: . for thousands, , for decimals
    if (Math.abs(num) >= 1000000) {
      const formatted = (num / 1000000).toFixed(2).replace('.', ',')
      return `${formatted}M`
    }
    if (Math.abs(num) >= 1000) {
      const formatted = (num / 1000).toFixed(2).replace('.', ',')
      return `${formatted}K`
    }
    return num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // Calculate user stats from leaderboard data
  const userStats = React.useMemo(() => {
    if (leaderboardData.length === 0) return { totalUsers: 0, deltaGains: 0, profitPercent: 0, drawdownPercent: 0, tvl: platformStats.tvl }

    const totalPnL = leaderboardData.reduce((sum, u) => sum + u.pnl, 0)
    const usersInProfit = leaderboardData.filter(u => u.pnl > 0).length
    const usersInDrawdown = leaderboardData.filter(u => u.pnl < 0).length
    const totalUsers = leaderboardData.length

    return {
      totalUsers,
      deltaGains: totalPnL,
      profitPercent: totalUsers > 0 ? ((usersInProfit / totalUsers) * 100).toFixed(1) : 0,
      drawdownPercent: totalUsers > 0 ? ((usersInDrawdown / totalUsers) * 100).toFixed(1) : 0,
      tvl: platformStats.tvl
    }
  }, [leaderboardData, platformStats.tvl])

  // Top 10 gainers/losers
  const topGainers = [...leaderboardData].filter(u => u.pnl > 0).sort((a, b) => b.pnl - a.pnl).slice(0, 10)
  const topLosers = [...leaderboardData].filter(u => u.pnl < 0).sort((a, b) => a.pnl - b.pnl).slice(0, 10)

  // Sorted leaderboard - use server-side ranks from Supabase
  const sortedLeaderboard = [...leaderboardData].sort((a, b) => {
    if (leaderboardType === 'volume') {
      // Sort by volume_rank (nulls last)
      if (a.volumeRank == null) return 1
      if (b.volumeRank == null) return -1
      return a.volumeRank - b.volumeRank
    }
    // Sort by pnl_rank (nulls last)
    if (a.pnlRank == null) return 1
    if (b.pnlRank == null) return -1
    return a.pnlRank - b.pnlRank
  }).map((user) => ({
    ...user,
    displayRank: leaderboardType === 'volume' ? user.volumeRank : user.pnlRank
  }))

  // Search handler
  const handleLeaderboardSearch = (searchVal) => {
    const search = (searchVal || '').toLowerCase().trim()
    if (!search) {
      setHighlightedWallet(null)
      return
    }

    const foundIdx = sortedLeaderboard.findIndex(u => u.walletAddress.toLowerCase().includes(search))
    if (foundIdx !== -1) {
      const targetPage = Math.floor(foundIdx / 20) + 1
      setLeaderboardPage(targetPage)
      setHighlightedWallet(sortedLeaderboard[foundIdx].walletAddress)
    } else {
      setHighlightedWallet(null)
    }
  }

  const leaderboardPageSize = 20
  const totalLeaderboardPages = Math.ceil(sortedLeaderboard.length / leaderboardPageSize)
  const paginatedLeaderboard = sortedLeaderboard.slice(
    (leaderboardPage - 1) * leaderboardPageSize,
    leaderboardPage * leaderboardPageSize
  )

  // Export CSV
  const exportLeaderboardCSV = () => {
    const headers = ['rank', 'wallet_address', 'pnl', 'volume', 'unrealized_pnl']
    const rows = sortedLeaderboard.map(user => [
      user.displayRank || '',
      user.walletAddress,
      user.pnl,
      user.volume,
      user.unrealizedPnl
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `leaderboard_${leaderboardType}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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

  const tabs = ['User', 'Platform']

  return (
    <div className="mainnet-page dashboard">
      <DebugPanel />
      <h1 className="dashboard-title">Mainnet Stats</h1>

      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
        <TabSwitch
          value={activeTab}
          onValueChange={setActiveTab}
          options={tabs}
        />
      </div>

      <div className="tab-content">
        {/* USER TAB */}
        {activeTab === 'User' && (
          <>
            {/* User Overview Stats */}
            <div className="stats-row">
              <div className="stat-item">
                <span className="stat-label">Total Users</span>
                <span className="stat-value">{userStats.totalUsers.toLocaleString()}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Delta Gains</span>
                <span className="stat-value" style={{ color: userStats.deltaGains >= 0 ? '#4ade80' : '#f44336' }}>
                  {userStats.deltaGains >= 0 ? '+' : ''}${formatFullNumber(userStats.deltaGains)}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Users in Profit</span>
                <span className="stat-value" style={{ color: '#4ade80' }}>{userStats.profitPercent}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Users in Drawdown</span>
                <span className="stat-value" style={{ color: '#f44336' }}>{userStats.drawdownPercent}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">TVL</span>
                <span className="stat-value">${formatNumber(userStats.tvl)}</span>
              </div>
            </div>

            {/* Top 10 Gainers & Losers */}
            {!leaderboardLoading && leaderboardData.length > 0 && (
              <div className="top-10-grid">
                {/* Top 10 Gainers */}
                <div className="top-10-card gainers">
                  <div className="top-10-header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                      <polyline points="16 7 22 7 22 13"/>
                    </svg>
                    <span>Top 10 Gainers</span>
                  </div>
                  <div className="top-10-table-wrapper">
                    <table className="top-10-table">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Address</th>
                          <th className="text-right">PnL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topGainers.map((user, idx) => (
                          <tr key={user.walletAddress}>
                            <td className="rank">{idx + 1}</td>
                            <td><CopyableAddress address={user.walletAddress} /></td>
                            <td className="text-right pnl">+${formatFullNumber(user.pnl)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top 10 Losers */}
                <div className="top-10-card losers">
                  <div className="top-10-header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/>
                      <polyline points="16 17 22 17 22 11"/>
                    </svg>
                    <span>Top 10 Losers</span>
                  </div>
                  <div className="top-10-table-wrapper">
                    <table className="top-10-table">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Address</th>
                          <th className="text-right">PnL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topLosers.map((user, idx) => (
                          <tr key={user.walletAddress}>
                            <td className="rank">{idx + 1}</td>
                            <td><CopyableAddress address={user.walletAddress} /></td>
                            <td className="text-right pnl">-${formatFullNumber(Math.abs(user.pnl))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Leaderboard */}
            {!leaderboardLoading && leaderboardData.length > 0 && (
              <div className="mainnet-leaderboard">
                <div className="leaderboard-header">
                  <h2>Leaderboard</h2>
                  <div className="leaderboard-controls">
                    <input
                      type="text"
                      placeholder="Search wallet..."
                      value={leaderboardSearch}
                      onChange={(e) => {
                        setLeaderboardSearch(e.target.value)
                        handleLeaderboardSearch(e.target.value)
                      }}
                      className="leaderboard-search"
                    />
                    <button
                      onClick={exportLeaderboardCSV}
                      className="export-csv-btn"
                      title="Export as CSV"
                      style={{
                        padding: '8px 16px',
                        background: '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#5568d3'}
                      onMouseLeave={(e) => e.target.style.background = '#667eea'}
                    >
                      Export CSV
                    </button>
                    <div className="leaderboard-toggle">
                      <button
                        className={leaderboardType === 'volume' ? 'active' : ''}
                        onClick={() => { setLeaderboardType('volume'); setLeaderboardPage(1); setHighlightedWallet(null) }}
                      >
                        Volume
                      </button>
                      <button
                        className={leaderboardType === 'pnl' ? 'active' : ''}
                        onClick={() => { setLeaderboardType('pnl'); setLeaderboardPage(1); setHighlightedWallet(null) }}
                      >
                        PnL
                      </button>
                    </div>
                  </div>
                </div>

                <div className="table-wrapper">
                  <table className="leaderboard-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Wallet</th>
                        <th className="text-right">PnL</th>
                        <th className="text-right">Volume</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedLeaderboard.map((user) => {
                        const isHighlighted = highlightedWallet === user.walletAddress
                        return (
                          <tr
                            key={user.walletAddress}
                            ref={isHighlighted ? highlightedRowRef : null}
                            className={isHighlighted ? 'highlighted' : ''}
                          >
                            <td className="rank-cell">#{user.displayRank}</td>
                            <td className="address-cell"><CopyableAddress address={user.walletAddress} /></td>
                            <td className={`pnl-cell text-right ${user.pnl >= 0 ? 'positive' : 'negative'}`}>
                              {user.pnl >= 0 ? '+' : ''}${formatFullNumber(user.pnl)}
                            </td>
                            <td className="volume-cell text-right">${formatFullNumber(user.volume)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="pagination">
                  <button
                    onClick={() => setLeaderboardPage(p => Math.max(1, p - 1))}
                    disabled={leaderboardPage === 1}
                    className="page-btn"
                  >
                    &lt; Prev
                  </button>
                  <span className="page-info">
                    Page {leaderboardPage} of {totalLeaderboardPages} ({sortedLeaderboard.length} traders)
                  </span>
                  <button
                    onClick={() => setLeaderboardPage(p => Math.min(totalLeaderboardPages, p + 1))}
                    disabled={leaderboardPage === totalLeaderboardPages}
                    className="page-btn"
                  >
                    Next &gt;
                  </button>
                </div>
              </div>
            )}

            {leaderboardLoading && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading leaderboard...</div>
            )}
          </>
        )}

        {/* PLATFORM TAB */}
        {activeTab === 'Platform' && (
          <>
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
          </>
        )}
      </div>
    </div>
  )
}
