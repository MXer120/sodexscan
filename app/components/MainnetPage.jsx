import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useUserProfile } from '../hooks/useProfile'
import { globalCache } from '../lib/globalCache'
import { THEME_COLORS } from '../lib/themeColors'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import '../styles/MainnetPage.css'


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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={THEME_COLORS.success} strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={THEME_COLORS.textSubtle} strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>
      <style>{`
        .copyable-address:hover .copy-btn { opacity: 1 !important; }
        .copy-btn:hover svg { stroke: var(--color-success); }
      `}</style>
    </span>
  )
}

// Spot leaderboard data URL
const SPOT_DATA_URL = 'https://raw.githubusercontent.com/Eliasdegemu61/sodex-spot-volume-data/main/spot_vol_data.json'

// Sodex-owned wallets to exclude from spot LBs
const SODEX_SPOT_WALLETS = new Set([
  '0xc50e42e7f49881127e8183755be3f281bb687f7b',
  '0x1f446dfa225d5c9e8a80cd227bf57444fc141332',
  '0x4b16ce4edb6bfea22aa087fb5cb3cfd654ca99f5'
])

export default function MainnetPage() {
  // Leaderboard data - paginated
  const [leaderboardData, setLeaderboardData] = useState([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const [leaderboardType, setLeaderboardType] = useState('volume')
  const [leaderboardPage, setLeaderboardPage] = useState(1)
  const [totalLeaderboardCount, setTotalLeaderboardCount] = useState(0)
  const [showSyncStatus, setShowSyncStatus] = useState(false)
  const [excludeSodexOwned, setExcludeSodexOwned] = useState(true)

  // Spot leaderboard state
  const [spotView, setSpotView] = useState(false) // false = perps, true = spot
  const [spotData, setSpotData] = useState(null) // full parsed array (all-time)
  const [spotLocalData, setSpotLocalData] = useState(null) // local snapshot for diff
  const [spotWeeklyData, setSpotWeeklyData] = useState(null) // computed weekly diff
  const [spotLoading, setSpotLoading] = useState(false)
  const [spotPage, setSpotPage] = useState(1)
  const [spotTimeRange, setSpotTimeRange] = useState('all') // 'all' | 'weekly'
  const [spotDropdownOpen, setSpotDropdownOpen] = useState(false)
  const spotDropdownRef = useRef(null)
  const SPOT_PAGE_SIZE = 20

  // Week selector: 'all' | 'current' | 1 | 2 | 3...
  const [timeRange, setTimeRange] = useState('all')
  const [lbMeta, setLbMeta] = useState(null)
  const [weekDropdownOpen, setWeekDropdownOpen] = useState(false)

  const weekDropdownRef = useRef(null)

  // Close spot dropdown on click outside
  useEffect(() => {
    if (!spotDropdownOpen) return
    const handleClick = (e) => { if (spotDropdownRef.current && !spotDropdownRef.current.contains(e.target)) setSpotDropdownOpen(false) }
    const handleEsc = (e) => { if (e.key === 'Escape') setSpotDropdownOpen(false) }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleEsc) }
  }, [spotDropdownOpen])

  // Close dropdown on click outside or Escape
  useEffect(() => {
    if (!weekDropdownOpen) return
    const handleClickOutside = (e) => {
      if (weekDropdownRef.current && !weekDropdownRef.current.contains(e.target)) {
        setWeekDropdownOpen(false)
      }
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') setWeekDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [weekDropdownOpen])

  // Top 10 data
  const [topGainersData, setTopGainersData] = useState([])
  const [topLosersData, setTopLosersData] = useState([])
  const [top10Loading, setTop10Loading] = useState(false)

  const { data: profileData } = useUserProfile()
  const showZeroData = false

  const isWeeklyView = timeRange !== 'all'

  // Load leaderboard meta on mount
  useEffect(() => {
    loadLbMeta()
  }, [])

  const loadLbMeta = async () => {
    const cached = globalCache.getLeaderboardMeta()
    if (cached) { setLbMeta(cached); return }
    try {
      const { data, error } = await supabase
        .from('leaderboard_meta')
        .select('*')
        .eq('id', 1)
        .single()
      if (error) throw error
      if (data) {
        globalCache.setLeaderboardMeta(data)
        setLbMeta(data)
      }
    } catch (err) {
      console.error('Failed to load leaderboard meta:', err)
    }
  }

  // Load spot leaderboard data when spot view selected
  useEffect(() => {
    if (spotView && !spotData) loadSpotData()
  }, [spotView])

  // Reset page when spot time range changes
  useEffect(() => {
    setSpotPage(1)
  }, [spotTimeRange])

  const loadSpotData = async () => {
    setSpotLoading(true)
    try {
      // Load all-time from cache or GitHub
      let allTimeJson = globalCache.getSpotAllTimeData()
      if (!allTimeJson) {
        const res = await fetch(SPOT_DATA_URL)
        allTimeJson = await res.json()
        globalCache.setSpotAllTimeData(allTimeJson)
      }
      setSpotData(parseSpotJson(allTimeJson))

      // Load local snapshot for weekly diff
      let localJson = globalCache.getSpotLocalData()
      if (!localJson) {
        try {
          const localRes = await fetch('/data/spot_vol_data.json')
          if (localRes.ok) {
            localJson = await localRes.json()
            globalCache.setSpotLocalData(localJson)
          }
        } catch { /* no local file */ }
      }
      setSpotLocalData(localJson)

      // Compute weekly diff
      if (localJson) {
        const weeklyEntries = Object.entries(allTimeJson)
          .filter(([address]) => !SODEX_SPOT_WALLETS.has(address.toLowerCase()))
          .map(([address, d]) => {
            const allTimeVol = d.vol || 0
            const localVol = localJson[address]?.vol || 0
            return {
              walletAddress: address,
              accountId: d.userId,
              volume: Math.max(0, allTimeVol - localVol),
              lastTs: d.last_ts
            }
          }).filter(e => e.volume > 0)
        weeklyEntries.sort((a, b) => b.volume - a.volume)
        weeklyEntries.forEach((e, i) => { e.rank = i + 1 })
        setSpotWeeklyData(weeklyEntries)
      }
    } catch (err) {
      console.error('Failed to load spot data:', err)
    }
    setSpotLoading(false)
  }

  const parseSpotJson = (json) => {
    const entries = Object.entries(json)
      .filter(([address]) => !SODEX_SPOT_WALLETS.has(address.toLowerCase()))
      .map(([address, d]) => ({
        walletAddress: address,
        accountId: d.userId,
        volume: d.vol || 0,
        lastTs: d.last_ts
      }))
    entries.sort((a, b) => b.volume - a.volume)
    entries.forEach((e, i) => { e.rank = i + 1 })
    return entries
  }

  // Export spot data as JSON
  const exportSpotJSON = () => {
    const dataToExport = spotTimeRange === 'weekly' ? spotWeeklyData : spotData
    if (!dataToExport) return
    const exportObj = {}
    dataToExport.forEach(e => {
      exportObj[e.walletAddress] = { userId: e.accountId, vol: e.volume, rank: e.rank }
    })
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `spot_volume_${spotTimeRange}_${new Date().toISOString().split('T')[0]}.json`
    link.click()
  }

  // Active spot data based on time range
  const activeSpotData = spotTimeRange === 'weekly' ? spotWeeklyData : spotData

  // Reload when filters change
  useEffect(() => {
    setLeaderboardPage(1)
    if (timeRange === 'all') {
      loadLeaderboardPage(1, leaderboardType, excludeSodexOwned, showZeroData)
      loadTop10(showZeroData, excludeSodexOwned)
    } else {
      const weekNum = timeRange === 'current' ? 0 : timeRange
      loadWeeklyPage(1, weekNum, leaderboardType, excludeSodexOwned)
    }
  }, [excludeSodexOwned, showZeroData, leaderboardType, timeRange])

  // ── Weekly leaderboard loading (RPC) ──
  const loadWeeklyPage = async (page, weekNum, type, excludeSodex) => {
    const cached = globalCache.getWeeklyLeaderboardPage(weekNum, page, type, excludeSodex)
    if (cached) {
      setLeaderboardData(cached)
      const cachedCount = globalCache.getWeeklyTotalCount(weekNum, type, excludeSodex)
      if (cachedCount !== null) setTotalLeaderboardCount(cachedCount)
      setLeaderboardLoading(false)
      return
    }

    setLeaderboardLoading(true)
    try {
      const pageSize = 20

      // Get total count
      let totalCount = globalCache.getWeeklyTotalCount(weekNum, type, excludeSodex)
      if (totalCount === null) {
        const { data: cnt, error: cntErr } = await supabase.rpc('get_weekly_leaderboard_count', {
          p_week: weekNum,
          p_exclude_sodex: excludeSodex
        })
        if (cntErr) throw cntErr
        totalCount = cnt || 0
        globalCache.setWeeklyTotalCount(weekNum, type, excludeSodex, totalCount)
      }
      setTotalLeaderboardCount(totalCount)

      // Get page data
      const { data, error } = await supabase.rpc('get_weekly_leaderboard', {
        p_week: weekNum,
        p_sort: type,
        p_limit: pageSize,
        p_offset: (page - 1) * pageSize,
        p_exclude_sodex: excludeSodex
      })
      if (error) throw error

      const formattedData = (data || []).map(row => ({
        accountId: row.account_id,
        walletAddress: row.wallet_address,
        pnl: parseFloat(row.weekly_pnl) || 0,
        volume: parseFloat(row.weekly_volume) || 0,
        unrealizedPnl: parseFloat(row.unrealized_pnl) || 0,
        pnlRank: row.pnl_rank || null,
        volumeRank: row.volume_rank || null
      }))

      globalCache.setWeeklyLeaderboardPage(weekNum, page, type, excludeSodex, formattedData)
      setLeaderboardData(formattedData)
    } catch (err) {
      console.error('Failed to load weekly leaderboard:', err)
    }
    setLeaderboardLoading(false)
  }

  // ── All-time leaderboard loading (existing) ──
  const loadLeaderboardPage = async (page, type, excludeSodex = true, showZero = false) => {
    const cachedData = globalCache.getLeaderboardPage(page, type, excludeSodex, showZero)
    if (cachedData) {
      setLeaderboardData(cachedData)
      const cachedCount = globalCache.getTotalCount(type, excludeSodex, showZero)
      if (cachedCount !== null) setTotalLeaderboardCount(cachedCount)
      setLeaderboardLoading(false)
      return
    }

    setLeaderboardLoading(true)
    try {
      const pageSize = 20
      const orderColumn = type === 'volume' ? 'volume_rank' : 'pnl_rank'

      let totalCount = globalCache.getTotalCount(type, excludeSodex, showZero)
      if (totalCount === null) {
        let countQuery = supabase
          .from('leaderboard_smart')
          .select('*', { count: 'exact', head: true })
        if (excludeSodex) countQuery = countQuery.not('is_sodex_owned', 'is', true)
        if (!showZero) countQuery = countQuery.or('cumulative_volume.gt.0,cumulative_pnl.neq.0')
        const { count } = await countQuery
        totalCount = count || 0
        globalCache.setTotalCount(type, excludeSodex, showZero, totalCount)
      }
      setTotalLeaderboardCount(totalCount)

      let dataQuery = supabase
        .from('leaderboard_smart')
        .select('account_id, wallet_address, cumulative_pnl, cumulative_volume, unrealized_pnl, pnl_rank, volume_rank, last_synced_at')
        .order(orderColumn, { ascending: true, nullsFirst: false })
      if (excludeSodex) dataQuery = dataQuery.not('is_sodex_owned', 'is', true)
      if (!showZero) dataQuery = dataQuery.or('cumulative_volume.gt.0,cumulative_pnl.neq.0')

      const { data, error } = await dataQuery.range((page - 1) * pageSize, page * pageSize - 1)
      if (error) throw error

      const formattedData = (data || []).map(row => ({
        accountId: row.account_id,
        walletAddress: row.wallet_address,
        pnl: parseFloat(row.cumulative_pnl) || 0,
        volume: parseFloat(row.cumulative_volume) || 0,
        unrealizedPnl: parseFloat(row.unrealized_pnl) || 0,
        pnlRank: parseInt(row.pnl_rank, 10) || null,
        volumeRank: parseInt(row.volume_rank, 10) || null,
        lastSyncedAt: row.last_synced_at
      }))

      globalCache.setLeaderboardPage(page, type, excludeSodex, showZero, formattedData)
      setLeaderboardData(formattedData)
    } catch (err) {
      console.error('Failed to load leaderboard page:', err)
    }
    setLeaderboardLoading(false)
  }

  // Load top 10 gainers/losers (PnL only)
  const loadTop10 = async (showZero = false, excludeSodex = true) => {
    const cached = globalCache.getTop10(showZero, excludeSodex)
    if (cached) {
      setTopGainersData(cached.gainers)
      setTopLosersData(cached.losers)
      setTop10Loading(false)
      return
    }

    setTop10Loading(true)
    try {
      let gainersQuery = supabase
        .from('leaderboard_smart')
        .select('account_id, wallet_address, cumulative_pnl, cumulative_volume, is_sodex_owned')
        .order('cumulative_pnl', { ascending: false, nullsFirst: false })
        .limit(10)
      if (excludeSodex) gainersQuery = gainersQuery.not('is_sodex_owned', 'is', true)
      if (!showZero) {
        gainersQuery = gainersQuery.gt('cumulative_pnl', 0)
      } else {
        gainersQuery = gainersQuery.or('cumulative_pnl.gt.0,cumulative_pnl.is.null')
      }
      const { data: gainers, error: gainersError } = await gainersQuery
      if (gainersError) throw gainersError

      let losersQuery = supabase
        .from('leaderboard_smart')
        .select('account_id, wallet_address, cumulative_pnl, cumulative_volume, is_sodex_owned')
        .order('cumulative_pnl', { ascending: true, nullsFirst: false })
        .limit(10)
      if (excludeSodex) losersQuery = losersQuery.not('is_sodex_owned', 'is', true)
      if (!showZero) {
        losersQuery = losersQuery.lt('cumulative_pnl', 0)
      } else {
        losersQuery = losersQuery.or('cumulative_pnl.lt.0,cumulative_pnl.is.null')
      }
      const { data: losers, error: losersError } = await losersQuery
      if (losersError) throw losersError

      const formatUser = (row) => ({
        walletAddress: row.wallet_address,
        pnl: parseFloat(row.cumulative_pnl) || 0,
        volume: parseFloat(row.cumulative_volume) || 0
      })

      const formattedGainers = (gainers || []).map(formatUser)
      const formattedLosers = (losers || []).map(formatUser)
      globalCache.setTop10(formattedGainers, formattedLosers, showZero, excludeSodex)
      setTopGainersData(formattedGainers)
      setTopLosersData(formattedLosers)
    } catch (err) {
      console.error('Failed to load top 10:', err)
    }
    setTop10Loading(false)
  }


  const formatFullNumber = (num) => {
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
    return formatFullNumber(pnl)
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

  const [userStats, setUserStats] = React.useState({
    totalUsers: 0,
    gt2kVol: 0,
    gt1kVol: 0
  })

  React.useEffect(() => {
    if (userStats.totalUsers === 0) loadUserStats()
  }, [])

  const loadUserStats = async () => {
    const cached = globalCache.getUserStats()
    if (cached) { setUserStats(cached); return }
    try {
      const { data, error } = await supabase.rpc('get_leaderboard_stats')
      if (error) throw error
      if (data) {
        globalCache.setUserStats(data)
        setUserStats(data)
      }
    } catch (err) {
      console.error('Failed to load user stats:', err)
    }
  }

  const sortedLeaderboard = leaderboardData.map((user, idx) => ({
    ...user,
    displayRank: isWeeklyView
      ? (leaderboardType === 'volume' ? user.volumeRank : user.pnlRank) || ((leaderboardPage - 1) * 20 + idx + 1)
      : (leaderboardPage - 1) * 20 + idx + 1
  }))

  const leaderboardPageSize = 20
  const totalLeaderboardPages = Math.ceil(totalLeaderboardCount / leaderboardPageSize)
  const paginatedLeaderboard = sortedLeaderboard

  // Pagination handler (works for both all-time and weekly)
  const handlePageChange = (newPage) => {
    setLeaderboardPage(newPage)
    if (timeRange === 'all') {
      loadLeaderboardPage(newPage, leaderboardType, excludeSodexOwned, showZeroData)
    } else {
      const weekNum = timeRange === 'current' ? 0 : timeRange
      loadWeeklyPage(newPage, weekNum, leaderboardType, excludeSodexOwned)
    }
  }

  // Export CSV
  const exportLeaderboardCSV = async () => {
    try {
      const orderColumn = leaderboardType === 'volume' ? 'volume_rank' : 'pnl_rank'
      const pageSize = 1000
      const allData = []
      let currentPage = 0

      while (currentPage * pageSize < totalLeaderboardCount) {
        let query = supabase
          .from('leaderboard_smart')
          .select('account_id, wallet_address, cumulative_pnl, cumulative_volume, unrealized_pnl, pnl_rank, volume_rank')
          .order(orderColumn, { ascending: true, nullsFirst: false })
        if (excludeSodexOwned) query = query.not('is_sodex_owned', 'is', true)
        const { data, error } = await query.range(currentPage * pageSize, (currentPage + 1) * pageSize - 1)
        if (error) throw error
        allData.push(...data)
        currentPage++
      }

      const headers = ['rank', 'wallet_address', 'pnl', 'volume', 'unrealized_pnl']
      const rows = allData.map((row, idx) => [
        idx + 1,
        row.wallet_address,
        row.cumulative_pnl,
        row.cumulative_volume,
        row.unrealized_pnl
      ])

      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
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

  // Build week options for dropdown
  const getWeekOptions = () => {
    const options = [{ value: 'all', label: 'All Time' }]
    if (lbMeta) {
      options.push({ value: 'current', label: `Week ${lbMeta.current_week_number} (Live)` })
      for (let i = lbMeta.current_week_number - 1; i >= 1; i--) {
        options.push({ value: i, label: `Week ${i}` })
      }
    }
    return options
  }

  const weekOptions = getWeekOptions()
  const selectedLabel = weekOptions.find(o => o.value === timeRange)?.label || 'All Time'

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

      {/* Perps / Spot Toggle */}
      <div className="leaderboard-toggle" style={{ marginBottom: '20px', display: 'inline-flex' }}>
        <button className={!spotView ? 'active' : ''} onClick={() => setSpotView(false)}>Perps</button>
        <button className={spotView ? 'active' : ''} onClick={() => setSpotView(true)}>Spot</button>
      </div>

      {/* ─── SPOT LEADERBOARD ─── */}
      {spotView ? (
        <div className="mainnet-leaderboard" style={{ position: 'relative', opacity: spotLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
          <div className="leaderboard-header">
            <h2>{spotTimeRange === 'weekly' ? `Week ${lbMeta?.current_week_number || 2} Spot Volume` : 'All-Time Spot Volume'}</h2>
            <div className="leaderboard-controls">
              {/* Spot Time Range Dropdown */}
              <div className="week-selector" ref={spotDropdownRef} style={{ position: 'relative' }}>
                <button
                  className="week-selector-btn"
                  onClick={() => setSpotDropdownOpen(!spotDropdownOpen)}
                  style={{
                    padding: '10px 16px',
                    background: 'rgba(30, 30, 30, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    color: 'var(--color-text-main)',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'border-color 0.2s',
                    minWidth: '140px',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>{spotTimeRange === 'weekly' ? `Week ${lbMeta?.current_week_number || 2}` : 'All Time'}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: spotDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {spotDropdownOpen && (
                  <div className="week-dropdown" style={{
                    position: 'absolute', top: '100%', left: 0, marginTop: '4px',
                    background: 'var(--color-bg-secondary, rgba(25, 25, 25, 0.98))',
                    border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px',
                    overflow: 'hidden', zIndex: 100, minWidth: '160px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
                  }}>
                    {[
                      { value: 'all', label: 'All Time' },
                      { value: 'weekly', label: `Week ${lbMeta?.current_week_number || 2}` }
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setSpotTimeRange(opt.value); setSpotDropdownOpen(false) }}
                        style={{
                          display: 'block', width: '100%', padding: '10px 16px',
                          background: opt.value === spotTimeRange ? 'rgba(var(--color-primary-rgb, 60, 200, 240), 0.15)' : 'transparent',
                          border: 'none',
                          color: opt.value === spotTimeRange ? 'var(--color-primary)' : 'var(--color-text-main)',
                          fontSize: '13px', fontWeight: opt.value === spotTimeRange ? '600' : '400',
                          cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s'
                        }}
                        onMouseEnter={(e) => { if (opt.value !== spotTimeRange) e.target.style.background = 'rgba(255, 255, 255, 0.05)' }}
                        onMouseLeave={(e) => { if (opt.value !== spotTimeRange) e.target.style.background = 'transparent' }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={exportSpotJSON}
                style={{
                  padding: '8px 16px', background: 'var(--color-accent)', color: 'white',
                  border: 'none', borderRadius: '6px', cursor: 'pointer',
                  fontSize: '13px', fontWeight: '500', transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                onMouseLeave={(e) => e.target.style.opacity = '1'}
              >
                Export JSON
              </button>
            </div>
          </div>
          {spotLoading && !activeSpotData && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Loading spot leaderboard...</div>
          )}
          {spotTimeRange === 'weekly' && !spotWeeklyData && !spotLoading && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>No local snapshot found. Place week 1 snapshot at <code>/data/spot_vol_data.json</code></div>
          )}
          {activeSpotData && (
            <>
              <div className="table-wrapper">
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Wallet</th>
                      <th className="text-right">Spot Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSpotData.slice((spotPage - 1) * SPOT_PAGE_SIZE, spotPage * SPOT_PAGE_SIZE).map((user) => (
                      <tr key={user.walletAddress}>
                        <td className="rank-cell">#{user.rank}</td>
                        <td className="address-cell"><CopyableAddress address={user.walletAddress} /></td>
                        <td className="volume-cell text-right">${formatFullNumber(user.volume)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pagination">
                <button className="page-btn" onClick={() => setSpotPage(p => Math.max(1, p - 1))} disabled={spotPage === 1}>&lt; Prev</button>
                <span className="page-info">Page {spotPage} of {Math.ceil(activeSpotData.length / SPOT_PAGE_SIZE)} ({activeSpotData.length} traders)</span>
                <button className="page-btn" onClick={() => setSpotPage(p => Math.min(Math.ceil(activeSpotData.length / SPOT_PAGE_SIZE), p + 1))} disabled={spotPage === Math.ceil(activeSpotData.length / SPOT_PAGE_SIZE)}>Next &gt;</button>
              </div>
              <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
                Data provided by <a href="https://x.com/eliasing__" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>@eliasing__</a>
              </div>
            </>
          )}
        </div>
      ) : (
      <>
      {/* User Overview Stats */}
      <div className="stats-row">
        <div className="stat-item">
          <span className="stat-label">Total Users</span>
          <span className="stat-value">{userStats.totalUsers.toLocaleString()}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">&gt; 2k Vol</span>
          <span className="stat-value">{userStats.gt2kVol.toLocaleString()}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">&gt; 1k Vol</span>
          <span className="stat-value">{userStats.gt1kVol.toLocaleString()}</span>
        </div>
      </div>

      {/* Top 10 Gainers & Losers - only for All Time view */}
      {timeRange === 'all' && !top10Loading && (topGainersData.length > 0 || topLosersData.length > 0) && (
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
      {(leaderboardData.length > 0 || leaderboardLoading) && (
        <div className="mainnet-leaderboard" style={{ position: 'relative', opacity: leaderboardLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
          <div className="leaderboard-header">
            <h2>Leaderboard</h2>
            <div className="leaderboard-controls">
              {/* Week Selector Dropdown */}
              <div className="week-selector" ref={weekDropdownRef} style={{ position: 'relative' }}>
                <button
                  className="week-selector-btn"
                  onClick={() => setWeekDropdownOpen(!weekDropdownOpen)}
                  style={{
                    padding: '10px 16px',
                    background: 'rgba(30, 30, 30, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    color: 'var(--color-text-main)',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'border-color 0.2s',
                    minWidth: '140px',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>{selectedLabel}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: weekDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {weekDropdownOpen && (
                  <div
                    className="week-dropdown"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: '4px',
                      background: 'var(--color-bg-secondary, rgba(25, 25, 25, 0.98))',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      zIndex: 100,
                      minWidth: '160px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
                    }}
                  >
                    {weekOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setTimeRange(opt.value)
                          setWeekDropdownOpen(false)
                        }}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '10px 16px',
                          background: opt.value === timeRange ? 'rgba(var(--color-primary-rgb, 60, 200, 240), 0.15)' : 'transparent',
                          border: 'none',
                          color: opt.value === timeRange ? 'var(--color-primary)' : 'var(--color-text-main)',
                          fontSize: '13px',
                          fontWeight: opt.value === timeRange ? '600' : '400',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={(e) => { if (opt.value !== timeRange) e.target.style.background = 'rgba(255, 255, 255, 0.05)' }}
                        onMouseLeave={(e) => { if (opt.value !== timeRange) e.target.style.background = 'transparent' }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="leaderboard-toggle">
                <button
                  className={leaderboardType === 'volume' ? 'active' : ''}
                  onClick={() => setLeaderboardType('volume')}
                >
                  Volume
                </button>
                <button
                  className={leaderboardType === 'pnl' ? 'active' : ''}
                  onClick={() => setLeaderboardType('pnl')}
                >
                  PnL
                </button>
              </div>
              <div className="leaderboard-options-row">
                {!isWeeklyView && (
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
                )}
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
                {!isWeeklyView && (
                  <button
                    onClick={exportLeaderboardCSV}
                    className="export-csv-btn"
                    title="Export as CSV"
                    style={{
                      padding: '8px 16px',
                      background: 'var(--color-accent)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                    onMouseLeave={(e) => e.target.style.opacity = '1'}
                  >
                    Export CSV
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Wallet</th>
                  <th className="text-right">{isWeeklyView ? 'Weekly PnL' : 'PnL'}</th>
                  <th className="text-right">{isWeeklyView ? 'Weekly Volume' : 'Volume'}</th>
                  {!isWeeklyView && showSyncStatus && <th className="text-right">Sync</th>}
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
                    {!isWeeklyView && showSyncStatus && (
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
              onClick={() => handlePageChange(Math.max(1, leaderboardPage - 1))}
              disabled={leaderboardPage === 1}
              className="page-btn"
            >
              &lt; Prev
            </button>
            <span className="page-info">
              Page {leaderboardPage} of {totalLeaderboardPages} ({totalLeaderboardCount} traders)
            </span>
            <button
              onClick={() => handlePageChange(Math.min(totalLeaderboardPages, leaderboardPage + 1))}
              disabled={leaderboardPage === totalLeaderboardPages}
              className="page-btn"
            >
              Next &gt;
            </button>
          </div>
        </div>
      )}

      {leaderboardLoading && leaderboardData.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: THEME_COLORS.textDark }}>Loading leaderboard...</div>
      )}
      </>
      )}
    </div>
  )
}
