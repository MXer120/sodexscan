import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { globalCache } from '../lib/globalCache'
import '../styles/MainnetPage.css'

// Set document title
if (typeof document !== 'undefined') {
  document.title = 'Mainnet | CommunityScan SoDEX'
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)


// Truncate address for mobile: 0x + first 4 ... last 4
const truncateAddress = (address) => {
  if (!address || address.length < 12) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

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
      <span className="addr-text addr-full" style={{ fontFamily: 'monospace', fontSize: '13px' }}>{address}</span>
      <span className="addr-text addr-truncated" style={{ fontFamily: 'monospace', fontSize: '13px' }}>{truncateAddress(address)}</span>
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
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
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
  // Leaderboard data - paginated
  const [leaderboardData, setLeaderboardData] = useState([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const [leaderboardType, setLeaderboardType] = useState('volume')
  const [leaderboardPage, setLeaderboardPage] = useState(1)
  const [totalLeaderboardCount, setTotalLeaderboardCount] = useState(0)
  const [showSyncStatus, setShowSyncStatus] = useState(false)
  const [excludeSodexOwned, setExcludeSodexOwned] = useState(true)

  // Using global cache that persists across component mounts (navigation)
  // No more useRef caches - globalCache persists even when navigating away

  // Top 10 data
  const [topGainersData, setTopGainersData] = useState([])
  const [topLosersData, setTopLosersData] = useState([])
  const [top10Loading, setTop10Loading] = useState(false)

  useEffect(() => {
    loadLeaderboardPage(1, leaderboardType, excludeSodexOwned)
    loadTop10()
  }, [])

  // Reload when exclude filter changes (cache remains - different filter states cached separately)
  useEffect(() => {
    setLeaderboardPage(1)
    loadLeaderboardPage(1, leaderboardType, excludeSodexOwned)
  }, [excludeSodexOwned])

  // Load single page of leaderboard (20 users)
  const loadLeaderboardPage = async (page, type, excludeSodex = true) => {
    // Check global cache first
    const cachedData = globalCache.getLeaderboardPage(page, type, excludeSodex)
    if (cachedData) {
      // Cache hit - use cached data
      setLeaderboardData(cachedData)

      // Use cached total count if available
      const cachedCount = globalCache.getTotalCount(type, excludeSodex)
      if (cachedCount !== null) {
        setTotalLeaderboardCount(cachedCount)
      }
      setLeaderboardLoading(false)
      return
    }

    // Cache miss - fetch from Supabase
    setLeaderboardLoading(true)
    try {
      const pageSize = 20
      const orderColumn = type === 'volume' ? 'volume_rank' : 'pnl_rank'

      // Get total count (cached separately)
      let totalCount = globalCache.getTotalCount(type, excludeSodex)
      if (totalCount === null) {
        let countQuery = supabase
          .from('leaderboard_smart')
          .select('*', { count: 'exact', head: true })

        if (excludeSodex) {
          countQuery = countQuery.or('is_sodex_owned.is.null,is_sodex_owned.eq.false')
        }

        const { count } = await countQuery
        totalCount = count || 0
        globalCache.setTotalCount(type, excludeSodex, totalCount)
      }
      setTotalLeaderboardCount(totalCount)

      // Fetch single page
      let dataQuery = supabase
        .from('leaderboard_smart')
        .select('account_id, wallet_address, cumulative_pnl, cumulative_volume, unrealized_pnl, pnl_rank, volume_rank, last_synced_at')
        .order(orderColumn, { ascending: true, nullsFirst: false })

      if (excludeSodex) {
        dataQuery = dataQuery.or('is_sodex_owned.is.null,is_sodex_owned.eq.false')
      }

      const { data, error } = await dataQuery.range((page - 1) * pageSize, page * pageSize - 1)

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
          pnlRank: parseInt(row.pnl_rank, 10) || null,
          volumeRank: parseInt(row.volume_rank, 10) || null,
          lastSyncedAt: row.last_synced_at
        }
      })

      // Store in global cache
      globalCache.setLeaderboardPage(page, type, excludeSodex, formattedData)
      setLeaderboardData(formattedData)
    } catch (err) {
      console.error('Failed to load leaderboard page:', err)
    }
    setLeaderboardLoading(false)
  }

  // Load top 10 gainers/losers (PnL only) - always excludes Sodex-owned
  const loadTop10 = async () => {
    // Check global cache first
    const cached = globalCache.getTop10()
    if (cached) {
      setTopGainersData(cached.gainers)
      setTopLosersData(cached.losers)
      setTop10Loading(false)
      return
    }

    setTop10Loading(true)
    try {
      // Top 10 gainers (exclude Sodex-owned)
      const { data: gainers, error: gainersError } = await supabase
        .from('leaderboard_smart')
        .select('account_id, wallet_address, cumulative_pnl, cumulative_volume')
        .or('is_sodex_owned.is.null,is_sodex_owned.eq.false')
        .order('cumulative_pnl', { ascending: false })
        .limit(10)

      if (gainersError) throw gainersError

      // Top 10 losers (exclude Sodex-owned)
      const { data: losers, error: losersError } = await supabase
        .from('leaderboard_smart')
        .select('account_id, wallet_address, cumulative_pnl, cumulative_volume')
        .or('is_sodex_owned.is.null,is_sodex_owned.eq.false')
        .order('cumulative_pnl', { ascending: true })
        .limit(10)

      if (losersError) throw losersError

      const formatUser = (row) => ({
        walletAddress: row.wallet_address,
        pnl: parseFloat(row.cumulative_pnl) || 0,
        volume: parseFloat(row.cumulative_volume) || 0
      })

      const formattedGainers = (gainers || []).map(formatUser).filter(u => u.pnl > 0)
      const formattedLosers = (losers || []).map(formatUser).filter(u => u.pnl < 0)

      // Update global cache
      globalCache.setTop10(formattedGainers, formattedLosers)

      setTopGainersData(formattedGainers)
      setTopLosersData(formattedLosers)
    } catch (err) {
      console.error('Failed to load top 10:', err)
    }
    setTop10Loading(false)
  }


  const formatFullNumber = (num) => {
    // Use European format: . for thousands, , for decimals
    const absNum = Math.abs(num)
    const sign = num < 0 ? '-' : ''

    if (absNum >= 1000000) {
      const formatted = (absNum / 1000000).toFixed(2).replace('.', ',')
      return `${sign}${formatted}M`
    }
    if (absNum >= 1000) {
      const formatted = (absNum / 1000).toFixed(2).replace('.', ',')
      return `${sign}${formatted}K`
    }
    return num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formatPnL = (pnl) => {
    if (pnl === 0) return formatFullNumber(pnl)
    if (pnl > 0) return `+${formatFullNumber(pnl)}`
    return formatFullNumber(pnl) // negative sign already in number
  }

  const getPnLClassName = (pnl) => {
    if (pnl === 0) return 'zero'
    return pnl > 0 ? 'positive' : 'negative'
  }

  const formatSyncTime = (timestamp) => {
    if (!timestamp) return '-'
    const date = new Date(timestamp)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  // User stats loaded separately (aggregate query would be better for production)
  const [userStats, setUserStats] = React.useState({
    totalUsers: 0
  })

  // Load aggregate stats
  React.useEffect(() => {
    if (userStats.totalUsers === 0) {
      loadUserStats()
    }
  }, [])

  const loadUserStats = async () => {
    // Check global cache first
    const cached = globalCache.getUserStats()
    if (cached) {
      setUserStats(cached)
      return
    }

    try {
      // Could use Supabase RPC for aggregates, but using count for now
      const { count } = await supabase
        .from('leaderboard_smart')
        .select('*', { count: 'exact', head: true })

      const stats = { totalUsers: count || 0 }

      // Update global cache
      globalCache.setUserStats(stats)

      setUserStats(stats)
    } catch (err) {
      console.error('Failed to load user stats:', err)
    }
  }

  // Leaderboard is already sorted by server, calculate sequential display ranks
  const sortedLeaderboard = leaderboardData.map((user, idx) => ({
    ...user,
    // Calculate sequential rank based on page position
    displayRank: (leaderboardPage - 1) * 20 + idx + 1
  }))

  const leaderboardPageSize = 20
  const totalLeaderboardPages = Math.ceil(totalLeaderboardCount / leaderboardPageSize)
  // Data is already paginated from server
  const paginatedLeaderboard = sortedLeaderboard

  // Export CSV - fetches all data for export
  const exportLeaderboardCSV = async () => {
    try {
      const orderColumn = leaderboardType === 'volume' ? 'volume_rank' : 'pnl_rank'

      // Fetch all data for export
      const pageSize = 1000
      const allData = []
      let currentPage = 0

      while (currentPage * pageSize < totalLeaderboardCount) {
        let query = supabase
          .from('leaderboard_smart')
          .select('account_id, wallet_address, cumulative_pnl, cumulative_volume, unrealized_pnl, pnl_rank, volume_rank')
          .order(orderColumn, { ascending: true, nullsFirst: false })

        if (excludeSodexOwned) {
          query = query.or('is_sodex_owned.is.null,is_sodex_owned.eq.false')
        }

        const { data, error } = await query.range(currentPage * pageSize, (currentPage + 1) * pageSize - 1)

        if (error) throw error
        allData.push(...data)
        currentPage++
      }

      const headers = ['rank', 'wallet_address', 'pnl', 'volume', 'unrealized_pnl']
      const rows = allData.map((row, idx) => [
        idx + 1, // Sequential rank for filtered/exported data
        row.wallet_address,
        row.cumulative_pnl,
        row.cumulative_volume,
        row.unrealized_pnl
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
    } catch (err) {
      console.error('Failed to export CSV:', err)
    }
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Sodex Leaderboard",
    "itemListElement": paginatedLeaderboard.map((user, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `https://www.communityscan-sodex.com/tracker/${user.walletAddress}`,
      "name": user.walletAddress
    }))
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://www.communityscan-sodex.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Leaderboard",
        "item": "https://www.communityscan-sodex.com/mainnet"
      }
    ]
  }

  return (
    <div className="mainnet-page dashboard">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <h1 className="dashboard-title">Leaderboard</h1>

      {/* User Overview Stats */}
      <div className="stats-row">
        <div className="stat-item">
          <span className="stat-label">Total Users</span>
          <span className="stat-value">{userStats.totalUsers.toLocaleString()}</span>
        </div>
      </div>

      {/* Top 10 Gainers & Losers */}
      {!top10Loading && (topGainersData.length > 0 || topLosersData.length > 0) && (
        <div className="top-10-grid">
          {/* Top 10 Gainers */}
          <div className="top-10-card gainers">
            <div className="top-10-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
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
                  {topGainersData.map((user, idx) => (
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
                <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
                <polyline points="16 17 22 17 22 11" />
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
                  {topLosersData.map((user, idx) => (
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
      {leaderboardData.length > 0 && (
        <div className="mainnet-leaderboard" style={{ position: 'relative', opacity: leaderboardLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
          <div className="leaderboard-header">
            <h2>Leaderboard</h2>
            <div className="leaderboard-controls">
              <div className="leaderboard-toggle">
                <button
                  className={leaderboardType === 'volume' ? 'active' : ''}
                  onClick={() => {
                    setLeaderboardType('volume')
                    setLeaderboardPage(1)
                    loadLeaderboardPage(1, 'volume', excludeSodexOwned)
                  }}
                >
                  Volume
                </button>
                <button
                  className={leaderboardType === 'pnl' ? 'active' : ''}
                  onClick={() => {
                    setLeaderboardType('pnl')
                    setLeaderboardPage(1)
                    loadLeaderboardPage(1, 'pnl', excludeSodexOwned)
                  }}
                >
                  PnL
                </button>
              </div>
              <div className="leaderboard-options-row">
                <label className="leaderboard-checkbox">
                  <input
                    type="checkbox"
                    checked={showSyncStatus}
                    onChange={(e) => setShowSyncStatus(e.target.checked)}
                  />
                  <span className="custom-check">
                    <svg viewBox="0 0 24 24" fill="none">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span>Sync Status</span>
                </label>
                <label className="leaderboard-checkbox">
                  <input
                    type="checkbox"
                    checked={excludeSodexOwned}
                    onChange={(e) => setExcludeSodexOwned(e.target.checked)}
                  />
                  <span className="custom-check">
                    <svg viewBox="0 0 24 24" fill="none">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span>Excl. Sodex</span>
                </label>
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
                  {showSyncStatus && <th className="text-right">Sync</th>}
                </tr>
              </thead>
              <tbody>
                {paginatedLeaderboard.map((user) => (
                  <tr key={user.walletAddress} data-testid={`leaderboard-row-${user.walletAddress}`} data-rank={user.displayRank} data-pnl={user.pnl}>
                    <td className="rank-cell" aria-label={`Rank ${user.displayRank}`}>#{user.displayRank}</td>
                    <td className="address-cell"><CopyableAddress address={user.walletAddress} /></td>
                    <td className={`pnl-cell text-right ${getPnLClassName(user.pnl)}`} aria-label={`PnL: ${user.pnl}`}>
                      ${formatPnL(user.pnl)}
                    </td>
                    <td className="volume-cell text-right" aria-label={`Volume: ${user.volume}`}>${formatFullNumber(user.volume)}</td>
                    {showSyncStatus && (
                      <td className="text-right" style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }} data-last-synced={user.lastSyncedAt}>
                        {formatSyncTime(user.lastSyncedAt)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <button
              onClick={() => {
                const newPage = Math.max(1, leaderboardPage - 1)
                setLeaderboardPage(newPage)
                loadLeaderboardPage(newPage, leaderboardType, excludeSodexOwned)
              }}
              disabled={leaderboardPage === 1}
              className="page-btn"
            >
              &lt; Prev
            </button>
            <span className="page-info">
              Page {leaderboardPage} of {totalLeaderboardPages} ({totalLeaderboardCount} traders)
            </span>
            <button
              onClick={() => {
                const newPage = Math.min(totalLeaderboardPages, leaderboardPage + 1)
                setLeaderboardPage(newPage)
                loadLeaderboardPage(newPage, leaderboardType, excludeSodexOwned)
              }}
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
    </div>
  )
}
