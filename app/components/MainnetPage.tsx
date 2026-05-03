import React, { useState, useEffect, useRef } from 'react'
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

import { SkeletonTop10, SkeletonLeaderboard } from './Skeleton'

export default function MainnetPage() {
  // Leaderboard data - paginated
  const [leaderboardData, setLeaderboardData] = useState([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const [leaderboardType, setLeaderboardType] = useState('volume')
  const [leaderboardPage, setLeaderboardPage] = useState(1)
  const [totalLeaderboardCount, setTotalLeaderboardCount] = useState(0)
  const [showSyncStatus, setShowSyncStatus] = useState(false)
  const [excludeSodexOwned, setExcludeSodexOwned] = useState(true)

  // View mode: 'futures' | 'spot' | 'total'
  const [viewMode, setViewMode] = useState('total')

  // Week selector: 'all' | 'current' | 1 | 2 | 3...
  const [timeRange, setTimeRange] = useState('all')
  const [lbMeta, setLbMeta] = useState(null)
  const [weekDropdownOpen, setWeekDropdownOpen] = useState(false)


  // "Your Row" - connected wallet's leaderboard entry
  const [yourRow, setYourRow] = useState(null)
  const [yourRowLoading, setYourRowLoading] = useState(false)

  const weekDropdownRef = useRef(null)

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
  const ownWallet = profileData?.profile?.own_wallet?.toLowerCase()
  const showZeroData = false

  const isWeeklyView = timeRange !== 'all'

  // Load leaderboard meta on mount
  useEffect(() => {
    loadLbMeta()
  }, [])

  // Load "Your Row" when wallet/week changes
  useEffect(() => {
    if (!ownWallet) { setYourRow(null); return }
    yourRowRankCache.current = {}
    loadYourRow()
  }, [ownWallet, timeRange, viewMode])

  const loadYourRow = async () => {
    if (!ownWallet) return
    setYourRowLoading(true)
    try {
      if (timeRange === 'all') {
        // All-time: use Sodex API rank endpoint for both total and futures/spot views
        const [volRes, pnlRes] = await Promise.all([
          fetch(`/api/sodex-leaderboard/rank?wallet_address=${ownWallet}&sort_by=volume&window_type=ALL_TIME`),
          fetch(`/api/sodex-leaderboard/rank?wallet_address=${ownWallet}&sort_by=pnl&window_type=ALL_TIME`)
        ])
        const [volJson, pnlJson] = await Promise.all([volRes.json(), pnlRes.json()])
        const volData = volJson.data
        const pnlData = pnlJson.data
        if (!volData && !pnlData) { setYourRow(null); return }
        const src = volData || pnlData
        setYourRow({
          walletAddress: src.wallet_address,
          pnl: parseFloat(pnlData?.pnl_usd) || 0,
          volume: parseFloat(volData?.volume_usd) || 0,
          unrealizedPnl: 0,
          pnlRank: pnlData ? pnlData.rank : null,
          volumeRank: volData ? volData.rank : null,
          sodexVolume: parseFloat(volData?.volume_usd) || 0,
          sodexPnl: parseFloat(pnlData?.pnl_usd) || 0,
          spotVolume: 0,
          spotPnl: 0,
          isYou: true
        })
      } else {
        // Weekly: use Sodex API rank endpoint with window_type=WEEKLY
        const [volRes, pnlRes] = await Promise.all([
          fetch(`/api/sodex-leaderboard/rank?wallet_address=${ownWallet}&sort_by=volume&window_type=WEEKLY`),
          fetch(`/api/sodex-leaderboard/rank?wallet_address=${ownWallet}&sort_by=pnl&window_type=WEEKLY`)
        ])
        const [volJson, pnlJson] = await Promise.all([volRes.json(), pnlRes.json()])
        const volData = volJson.data
        const pnlData = pnlJson.data
        if (!volData && !pnlData) { setYourRow(null); return }
        const src = volData || pnlData
        setYourRow({
          walletAddress: src.wallet_address,
          pnl: parseFloat(pnlData?.pnl_usd) || 0,
          volume: parseFloat(volData?.volume_usd) || 0,
          unrealizedPnl: 0,
          pnlRank: pnlData ? pnlData.rank : null,
          volumeRank: volData ? volData.rank : null,
          sodexVolume: parseFloat(volData?.volume_usd) || 0,
          sodexPnl: parseFloat(pnlData?.pnl_usd) || 0,
          spotVolume: 0,
          spotPnl: 0,
          isYou: true
        })
      }
    } catch (err) {
      console.error('Failed to load your row:', err)
      setYourRow(null)
    } finally {
      setYourRowLoading(false)
    }
  }

  const loadLbMeta = () => {
    // leaderboard_meta table has been dropped — use static defaults
    setLbMeta({ current_week_number: 1, pool_size: 1000000 })
  }

  // Display value helpers based on viewMode
  const getDisplayPnl = (user) => {
    if (viewMode === 'total') return user.sodexPnl ?? user.pnl ?? 0
    if (viewMode === 'spot') return user.spotPnl || 0
    return user.pnl
  }
  const getDisplayVolume = (user) => viewMode === 'total' ? (user.sodexVolume || user.volume || 0) : viewMode === 'spot' ? (user.spotVolume || 0) : user.volume

  // Cache top-100 lookups per view key to avoid re-fetching
  const yourRowRankCache = useRef({})

  const getYourRowRank = () => {
    if (!yourRow) return '-'
    // All-time futures: use DB ranks directly
    if (!isWeeklyView && viewMode === 'futures') {
      return leaderboardType === 'pnl' ? (yourRow.pnlRank || '-') : (yourRow.volumeRank || '-')
    }
    // Check current page first
    const idx = paginatedLeaderboard.findIndex(u => u.walletAddress?.toLowerCase() === ownWallet)
    if (idx !== -1) return paginatedLeaderboard[idx].displayRank
    // Check cached rank from top-100 scan
    const cacheKey = `${timeRange}_${viewMode}_${leaderboardType}_${excludeSodexOwned}`
    if (yourRowRankCache.current[cacheKey] !== undefined) return yourRowRankCache.current[cacheKey]
    return '100+'
  }

  // Scan top 100 for Your Row rank when not on the current page
  useEffect(() => {
    if (!ownWallet || !yourRow) return
    const cacheKey = `${timeRange}_${viewMode}_${leaderboardType}_${excludeSodexOwned}`
    if (yourRowRankCache.current[cacheKey] !== undefined) return

    const scanTop100 = async () => {
      try {
        const windowType = isWeeklyView ? 'WEEKLY' : 'ALL_TIME'
        const sortBy = leaderboardType === 'pnl' ? 'pnl' : 'volume'
        // Fetch first two pages (100 rows) from proxy
        const [res1, res2] = await Promise.all([
          fetch(`/api/sodex-leaderboard?page=1&page_size=50&sort_by=${sortBy}&sort_order=desc&window_type=${windowType}`),
          fetch(`/api/sodex-leaderboard?page=2&page_size=50&sort_by=${sortBy}&sort_order=desc&window_type=${windowType}`)
        ])
        const [json1, json2] = await Promise.all([res1.json(), res2.json()])
        const allRows = [...(json1.data?.items || []), ...(json2.data?.items || [])]
        const pos = allRows.findIndex(r => r.wallet_address?.toLowerCase() === ownWallet)
        yourRowRankCache.current[cacheKey] = pos !== -1 ? pos + 1 : '100+'
        setYourRow(prev => prev ? { ...prev } : null) // trigger re-render
      } catch (err) {
        yourRowRankCache.current[cacheKey] = '100+'
      }
    }
    scanTop100()
  }, [ownWallet, yourRow, timeRange, viewMode, leaderboardType, excludeSodexOwned, isWeeklyView])

  // Load weekly top 10 gainers/losers via proxy
  const loadWeeklyTop10 = async (weekNum, excludeSodex, mode) => {
    const top10Key = `weekly_proxy_${excludeSodex}_${mode}`
    const cached = globalCache.getTop10(top10Key)
    if (cached) {
      setTopGainersData(cached.gainers)
      setTopLosersData(cached.losers)
      setTop10Loading(false)
      return
    }

    setTop10Loading(true)
    try {
      const [gRes, lRes] = await Promise.all([
        fetch('/api/sodex-leaderboard?page=1&page_size=10&sort_by=pnl&sort_order=desc&window_type=WEEKLY'),
        fetch('/api/sodex-leaderboard?page=1&page_size=10&sort_by=pnl&sort_order=asc&window_type=WEEKLY')
      ])
      const [gJson, lJson] = await Promise.all([gRes.json(), lRes.json()])
      const gainers = (gJson.data?.items || []).map(r => ({
        walletAddress: r.wallet_address, pnl: parseFloat(r.pnl_usd) || 0, volume: parseFloat(r.volume_usd) || 0
      }))
      const losers = (lJson.data?.items || []).map(r => ({
        walletAddress: r.wallet_address, pnl: parseFloat(r.pnl_usd) || 0, volume: parseFloat(r.volume_usd) || 0
      }))
      globalCache.setTop10(gainers, losers, top10Key)
      setTopGainersData(gainers)
      setTopLosersData(losers)
    } catch (err) {
      console.error('Failed to load weekly top 10:', err)
    }
    setTop10Loading(false)
  }

  // Reload when filters change
  useEffect(() => {
    if (timeRange !== 'all' && viewMode === 'spot' && leaderboardType === 'pnl') setLeaderboardType('volume')
    setLeaderboardPage(1)
    if (timeRange === 'all') {
      loadLeaderboardPage(1, leaderboardType, excludeSodexOwned, showZeroData, viewMode)
      loadTop10(showZeroData, excludeSodexOwned, viewMode)
    } else {
      const weekNum = timeRange === 'current' ? 0 : timeRange
      loadWeeklyPage(1, weekNum, leaderboardType, excludeSodexOwned, viewMode)
      loadWeeklyTop10(weekNum, excludeSodexOwned, viewMode)
    }
  }, [excludeSodexOwned, showZeroData, leaderboardType, timeRange, viewMode])

  // ── Weekly leaderboard loading via Sodex proxy ──
  const loadWeeklyPage = async (page, weekNum, type, excludeSodex, mode = 'total') => {
    const sortBy = type === 'pnl' ? 'pnl' : 'volume'
    const cached = globalCache.getWeeklyLeaderboardPage(0, page, sortBy, false)
    if (cached) {
      setLeaderboardData(cached as any[])
      const cachedCount = globalCache.getWeeklyTotalCount(0, sortBy, false)
      if (cachedCount !== null) setTotalLeaderboardCount(cachedCount as number)
      setLeaderboardLoading(false)
      return
    }

    setLeaderboardLoading(true)
    try {
      const pageSize = 20
      const res = await fetch(`/api/sodex-leaderboard?page=${page}&page_size=${pageSize}&sort_by=${sortBy}&sort_order=desc&window_type=WEEKLY`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)

      const total = json.data?.total ?? 0
      setTotalLeaderboardCount(total)
      globalCache.setWeeklyTotalCount(0, sortBy, false, total)

      const formattedData = (json.data?.items || []).map(row => ({
        walletAddress: row.wallet_address,
        pnl: parseFloat(row.pnl_usd) || 0,
        volume: parseFloat(row.volume_usd) || 0,
        unrealizedPnl: 0,
        pnlRank: row.rank || null,
        volumeRank: row.rank || null,
        sodexVolume: parseFloat(row.volume_usd) || 0,
        sodexPnl: parseFloat(row.pnl_usd) || 0,
        spotVolume: 0,
        spotPnl: 0
      }))

      globalCache.setWeeklyLeaderboardPage(0, page, sortBy, false, formattedData)
      setLeaderboardData(formattedData)
    } catch (err) {
      console.error('Failed to load weekly leaderboard:', err)
    }
    setLeaderboardLoading(false)
  }

  // ── All-time leaderboard loading (existing) ──
  const loadLeaderboardPage = async (page, type, excludeSodex = true, showZero = false, mode = 'futures') => {
    // Use distinct cache key for Sodex API data so old DB-cached entries don't collide
    const cacheType = mode === 'total' ? `sodexapi_${type}` : `${mode}_${type}`
    const cachedData = globalCache.getLeaderboardPage(page, cacheType, excludeSodex, showZero)
    if (cachedData) {
      setLeaderboardData(cachedData as any[])
      const cachedCount = globalCache.getTotalCount(cacheType, excludeSodex, showZero)
      if (cachedCount !== null) setTotalLeaderboardCount(cachedCount as number)
      setLeaderboardLoading(false)
      return
    }

    setLeaderboardLoading(true)
    try {
      const pageSize = 20

      // Total all-time: fetch directly from Sodex API (100% live data, zero DB)
      if (mode === 'total') {
        const sortBy = type === 'pnl' ? 'pnl' : 'volume'
        const res = await fetch(`/api/sodex-leaderboard?page=${page}&page_size=${pageSize}&sort_by=${sortBy}&sort_order=desc&window_type=ALL_TIME`)
        const json = await res.json()
        if (json.error) throw new Error(json.error)

        const total = json.data?.total ?? 0
        const items = (json.data?.items || []).map(row => ({
          walletAddress: row.wallet_address,
          pnl: parseFloat(row.pnl_usd) || 0,
          volume: parseFloat(row.volume_usd) || 0,
          unrealizedPnl: 0,
          pnlRank: row.rank || null,
          volumeRank: row.rank || null,
          sodexVolume: parseFloat(row.volume_usd) || 0,
          sodexPnl: parseFloat(row.pnl_usd) || 0,
          spotVolume: 0,
          spotPnl: 0
        }))

        setTotalLeaderboardCount(total)
        globalCache.setTotalCount(cacheType, excludeSodex, showZero, total)
        globalCache.setLeaderboardPage(page, cacheType, excludeSodex, showZero, items)
        setLeaderboardData(items)
        setLeaderboardLoading(false)
        return
      }

      // Futures / Spot: underlying tables have been dropped — show empty
      setLeaderboardData([])
      setTotalLeaderboardCount(0)
    } catch (err) {
      console.error('Failed to load leaderboard page:', err)
    }
    setLeaderboardLoading(false)
  }

  // Load top 10 gainers/losers (PnL only)
  const loadTop10 = async (showZero = false, excludeSodex = true, mode = 'futures') => {
    const top10Key = mode === 'total' ? `sodexapi_top10_${mode}` : `${showZero}_${excludeSodex}_${mode}`
    const cached = globalCache.getTop10(top10Key)
    if (cached) {
      setTopGainersData(cached.gainers)
      setTopLosersData(cached.losers)
      setTop10Loading(false)
      return
    }

    setTop10Loading(true)
    try {
      // Total all-time: fetch from Sodex API directly (zero DB)
      if (mode === 'total') {
        const [gRes, lRes] = await Promise.all([
          fetch('/api/sodex-leaderboard?page=1&page_size=10&sort_by=pnl&sort_order=desc&window_type=ALL_TIME'),
          fetch('/api/sodex-leaderboard?page=1&page_size=10&sort_by=pnl&sort_order=asc&window_type=ALL_TIME')
        ])
        const [gJson, lJson] = await Promise.all([gRes.json(), lRes.json()])
        const gainers = (gJson.data?.items || []).map(r => ({
          walletAddress: r.wallet_address, pnl: parseFloat(r.pnl_usd) || 0, volume: parseFloat(r.volume_usd) || 0
        }))
        const losers = (lJson.data?.items || []).map(r => ({
          walletAddress: r.wallet_address, pnl: parseFloat(r.pnl_usd) || 0, volume: parseFloat(r.volume_usd) || 0
        }))
        globalCache.setTop10(gainers, losers, top10Key)
        setTopGainersData(gainers)
        setTopLosersData(losers)
        setTop10Loading(false)
        return
      }

      // Futures / Spot: underlying tables have been dropped — show empty
      globalCache.setTop10([], [], top10Key)
      setTopGainersData([])
      setTopLosersData([])
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
    if (cached) { setUserStats(cached as any); return }
    try {
      const res = await fetch('/api/sodex-leaderboard?page=1&page_size=1&sort_by=volume&sort_order=desc&window_type=ALL_TIME')
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      const total = json.data?.total ?? 0
      const stats = { totalUsers: total, gt2kVol: 0, gt1kVol: 0 }
      globalCache.setUserStats(stats)
      setUserStats(stats)
    } catch (err) {
      console.error('Failed to load user stats:', err)
    }
  }

  const sortedLeaderboard = leaderboardData.map((user, idx) => ({
    ...user,
    displayRank: (leaderboardPage - 1) * 20 + idx + 1
  }))

  const leaderboardPageSize = 20
  const totalLeaderboardPages = Math.ceil(totalLeaderboardCount / leaderboardPageSize)
  const paginatedLeaderboard = sortedLeaderboard

  // Pagination handler (works for both all-time and weekly)
  const handlePageChange = (newPage) => {
    setLeaderboardPage(newPage)
    if (timeRange === 'all') {
      loadLeaderboardPage(newPage, leaderboardType, excludeSodexOwned, showZeroData, viewMode)
    } else {
      const weekNum = timeRange === 'current' ? 0 : timeRange
      loadWeeklyPage(newPage, weekNum, leaderboardType, excludeSodexOwned, viewMode)
    }
  }

  // Export CSV
  const exportLeaderboardCSV = async () => {
    try {
      // Total all-time: export from Sodex API (zero DB)
      if (viewMode === 'total' && timeRange === 'all') {
        const sortBy = leaderboardType === 'pnl' ? 'pnl' : 'volume'
        const allData = []
        const maxPages = Math.min(Math.ceil(totalLeaderboardCount / 50), 20) // cap at 1000 rows
        for (let p = 1; p <= maxPages; p++) {
          const res = await fetch(`/api/sodex-leaderboard?page=${p}&page_size=50&sort_by=${sortBy}&sort_order=desc&window_type=ALL_TIME`)
          const json = await res.json()
          if (json.data?.items) allData.push(...json.data.items)
        }
        const headers = ['rank', 'wallet_address', 'total_pnl', 'total_volume']
        const rows = allData.map((row, idx) => [idx + 1, row.wallet_address, row.pnl_usd, row.volume_usd])
        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `leaderboard_total_${leaderboardType}_${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        return
      }

      // Futures / Spot: underlying tables have been dropped — no data to export
      console.warn('CSV export not available for Futures/Spot view: underlying tables have been removed.')
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
        options.push({ value: String(i), label: i === 1 ? 'CA + Week 1' : `Week ${i}` })
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

      {/* Futures / Spot / Total Toggle */}
      <div className="leaderboard-toggle" style={{ marginBottom: (viewMode !== 'total' || isWeeklyView) ? '8px' : '20px', display: 'inline-flex' }}>
        <button className={viewMode === 'total' ? 'active' : ''} onClick={() => setViewMode('total')}>Total</button>
        <button className={viewMode === 'futures' ? 'active' : ''} onClick={() => setViewMode('futures')}>Futures</button>
        <button className={viewMode === 'spot' ? 'active' : ''} onClick={() => setViewMode('spot')}>Spot</button>
      </div>
      {(viewMode !== 'total' || isWeeklyView) && (
        <div style={{
          fontSize: '12px', color: '#f59e0b', marginBottom: '16px',
          padding: '8px 12px', borderRadius: '6px',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.2)',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          This page is no longer maintained. Use the <strong>Total</strong> tab for accurate, live data.
        </div>
      )}

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

      {/* Top 10 Gainers & Losers */}
      {(top10Loading || topGainersData.length > 0 || topLosersData.length > 0) && (
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
                {top10Loading ? <SkeletonTop10 rows={10} /> : (
                  <tbody>
                    {topGainersData.map((user, idx) => (
                      <tr key={user.walletAddress}>
                        <td className="rank">{idx + 1}</td>
                        <td><CopyableAddress address={user.walletAddress} /></td>
                        <td className="text-right pnl">+${formatFullNumber(user.pnl)}</td>
                      </tr>
                    ))}
                  </tbody>
                )}
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
                {top10Loading ? <SkeletonTop10 rows={10} /> : (
                  <tbody>
                    {topLosersData.map((user, idx) => (
                      <tr key={user.walletAddress}>
                        <td className="rank">{idx + 1}</td>
                        <td><CopyableAddress address={user.walletAddress} /></td>
                        <td className="text-right pnl">-${formatFullNumber(Math.abs(user.pnl))}</td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {(leaderboardData.length > 0 || leaderboardLoading) && (
        <div className="mainnet-leaderboard" style={{ position: 'relative' }}>
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
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border-subtle)',
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
                      background: 'var(--popover)',
                      color: 'var(--popover-foreground)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      zIndex: 100,
                      minWidth: '160px',
                      boxShadow: '0 8px 24px var(--color-overlay-medium)'
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
                        onMouseEnter={(e) => { if (opt.value !== timeRange) (e.target as HTMLElement).style.background = 'var(--accent)' }}
                        onMouseLeave={(e) => { if (opt.value !== timeRange) (e.target as HTMLElement).style.background = 'transparent' }}
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
                {!(isWeeklyView && viewMode === 'spot') && (
                  <button
                    className={leaderboardType === 'pnl' ? 'active' : ''}
                    onClick={() => setLeaderboardType('pnl')}
                  >
                    PnL
                  </button>
                )}
              </div>
              {!isWeeklyView && viewMode === 'spot' && leaderboardType === 'pnl' && (
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: 4, opacity: 0.7 }}>
                  Spot PnL may be inaccurate due to sync issues
                </div>
              )}
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
                      color: 'var(--primary-foreground)',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = '0.8' }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = '1' }}
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
                  {!(isWeeklyView && viewMode === 'spot') && (
                    <th className="text-right">{isWeeklyView ? `Weekly ${viewMode === 'total' ? 'Total ' : ''}PnL` : `${viewMode === 'spot' ? 'Spot ' : viewMode === 'total' ? 'Total ' : ''}PnL`}</th>
                  )}
                  <th className="text-right">{isWeeklyView ? `Weekly ${viewMode === 'spot' ? 'Spot ' : viewMode === 'total' ? 'Total ' : ''}Volume` : `${viewMode === 'spot' ? 'Spot ' : viewMode === 'total' ? 'Total ' : ''}Volume`}</th>
                  {!isWeeklyView && showSyncStatus && <th className="text-right">Sync</th>}
                </tr>
              </thead>
              {leaderboardLoading ? (
                <SkeletonLeaderboard rows={20} cols={isWeeklyView && viewMode === 'spot' ? 3 : showSyncStatus && !isWeeklyView ? 5 : 4} />
              ) : (
                <tbody>
                  {yourRowLoading && ownWallet && (
                    <tr className="your-row" style={{ background: 'rgba(var(--color-primary-rgb, 60, 200, 240), 0.08)', borderBottom: '2px solid rgba(var(--color-primary-rgb, 60, 200, 240), 0.3)' }}>
                      <td className="rank-cell"><span className="skeleton-cell" style={{ width: '32px', height: '14px', display: 'inline-block', background: 'var(--color-skeleton)', borderRadius: '4px', animation: 'skeleton-shimmer 1.4s ease infinite' }} /></td>
                      <td className="address-cell"><span style={{ fontSize: '10px', opacity: 0.7, marginRight: 4 }}>YOU</span><span className="skeleton-cell" style={{ width: '120px', height: '14px', display: 'inline-block', background: 'var(--color-skeleton)', borderRadius: '4px', animation: 'skeleton-shimmer 1.4s ease infinite' }} /></td>
                      {!(isWeeklyView && viewMode === 'spot') && (
                        <td className="text-right"><span className="skeleton-cell" style={{ width: '70px', height: '14px', display: 'inline-block', background: 'var(--color-skeleton)', borderRadius: '4px', animation: 'skeleton-shimmer 1.4s ease infinite' }} /></td>
                      )}
                      <td className="text-right"><span className="skeleton-cell" style={{ width: '70px', height: '14px', display: 'inline-block', background: 'var(--color-skeleton)', borderRadius: '4px', animation: 'skeleton-shimmer 1.4s ease infinite' }} /></td>
                      {!isWeeklyView && showSyncStatus && <td />}
                    </tr>
                  )}
                  {!yourRowLoading && yourRow && (
                    <tr className="your-row" style={{ background: 'rgba(var(--color-primary-rgb, 60, 200, 240), 0.08)', borderBottom: '2px solid rgba(var(--color-primary-rgb, 60, 200, 240), 0.3)' }}>
                      <td className="rank-cell" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>#{getYourRowRank()}</td>
                      <td className="address-cell" style={{ color: 'var(--color-primary)' }}>
                        <span style={{ fontSize: '10px', opacity: 0.7, marginRight: 4 }}>YOU</span>
                        <CopyableAddress address={yourRow.walletAddress} />
                      </td>
                      {!(isWeeklyView && viewMode === 'spot') && (
                        <td className={`pnl-cell text-right ${getPnLClassName(getDisplayPnl(yourRow))}`}>
                          ${formatPnL(getDisplayPnl(yourRow))}
                        </td>
                      )}
                      <td className="volume-cell text-right">${formatFullNumber(getDisplayVolume(yourRow))}</td>
                      {!isWeeklyView && showSyncStatus && (
                        <td className="text-right" style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                          {formatSyncTime(yourRow.lastSyncedAt)}
                        </td>
                      )}
                    </tr>
                  )}
                  {paginatedLeaderboard.map((user) => (
                    <tr key={user.walletAddress} data-testid={`leaderboard-row-${user.walletAddress}`} data-rank={user.displayRank} data-pnl={user.pnl} style={user.walletAddress?.toLowerCase() === ownWallet ? { background: 'rgba(var(--color-primary-rgb, 60, 200, 240), 0.04)' } : undefined}>
                      <td className="rank-cell" aria-label={`Rank ${user.displayRank}`}>#{user.displayRank}</td>
                      <td className="address-cell"><CopyableAddress address={user.walletAddress} /></td>
                      {!(isWeeklyView && viewMode === 'spot') && (
                        <td className={`pnl-cell text-right ${getPnLClassName(getDisplayPnl(user))}`} aria-label={`PnL: ${getDisplayPnl(user)}`}>
                          ${formatPnL(getDisplayPnl(user))}
                        </td>
                      )}
                      <td className="volume-cell text-right" aria-label={`Volume: ${getDisplayVolume(user)}`}>${formatFullNumber(getDisplayVolume(user))}</td>
                      {!isWeeklyView && showSyncStatus && (
                        <td className="text-right" style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }} data-last-synced={user.lastSyncedAt}>
                          {formatSyncTime(user.lastSyncedAt)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              )}
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

      </>
    </div>
  )
}
