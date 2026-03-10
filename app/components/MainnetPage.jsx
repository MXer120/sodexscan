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

import { SkeletonTop10, SkeletonLeaderboard } from './Skeleton'
import { fetchHistoricalWeek, queryHistoricalWeek, findWalletInWeek } from '../lib/weeklyLeaderboardLoader'

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
  }, [ownWallet, timeRange])

  const loadYourRow = async () => {
    if (!ownWallet) return
    try {
      if (timeRange === 'all') {
        // Always fetch from DB for futures/spot data (needed for all modes)
        const { data, error } = await supabase
          .from('leaderboard_smart')
          .select('account_id, wallet_address, cumulative_pnl, cumulative_volume, unrealized_pnl, pnl_rank, volume_rank, sodex_total_volume, sodex_pnl, spot_volume, spot_pnl, last_synced_at')
          .ilike('wallet_address', ownWallet)
          .maybeSingle()

        // For total mode, also try Sodex API to get fresh total data
        let sodexVolume = 0, sodexPnl = 0
        if (data) {
          sodexVolume = parseFloat(data.sodex_total_volume) || 0
          sodexPnl = parseFloat(data.sodex_pnl) || 0
        }

        if (!error && !data) { setYourRow(null); return }
        if (error) { setYourRow(null); return }

        setYourRow({
          walletAddress: data.wallet_address,
          pnl: parseFloat(data.cumulative_pnl) || 0,
          volume: parseFloat(data.cumulative_volume) || 0,
          unrealizedPnl: parseFloat(data.unrealized_pnl) || 0,
          pnlRank: parseInt(data.pnl_rank, 10) || null,
          volumeRank: parseInt(data.volume_rank, 10) || null,
          lastSyncedAt: data.last_synced_at,
          sodexVolume,
          sodexPnl,
          spotVolume: parseFloat(data.spot_volume) || 0,
          spotPnl: parseFloat(data.spot_pnl) || 0,
          isYou: true
        })
      } else {
        const weekNum = timeRange === 'current' ? 0 : timeRange

        // Historical weeks: look up from static JSON
        if (weekNum >= 1) {
          try {
            const weekData = await fetchHistoricalWeek(weekNum)
            const found = findWalletInWeek(weekData, ownWallet)
            if (!found) { setYourRow(null); return }
            setYourRow({
              walletAddress: ownWallet,
              pnl: parseFloat(found.weekly_pnl) || 0,
              volume: parseFloat(found.weekly_volume) || 0,
              unrealizedPnl: parseFloat(found.unrealized_pnl) || 0,
              pnlRank: found.pnl_rank || null,
              volumeRank: found.volume_rank || null,
              sodexVolume: parseFloat(found.weekly_sodex_volume) || 0,
              spotVolume: parseFloat(found.weekly_spot_volume) || 0,
              isYou: true
            })
          } catch { setYourRow(null) }
          return
        }

        // Current week (0): Supabase (prev frozen week stays in DB for delta calc)
        const prevWeek = (lbMeta?.current_week_number || 1) - 1
        const { data: cw } = await supabase
          .from('leaderboard_weekly')
          .select('cumulative_pnl, cumulative_volume, unrealized_pnl, pnl_rank, volume_rank, sodex_total_volume, sodex_pnl')
          .eq('week_number', 0)
          .ilike('wallet_address', ownWallet)
          .maybeSingle()
        if (!cw) { setYourRow(null); return }
        let pw = null
        if (prevWeek >= 1) {
          const { data: pwData } = await supabase
            .from('leaderboard_weekly')
            .select('cumulative_pnl, cumulative_volume, sodex_total_volume, sodex_pnl')
            .eq('week_number', prevWeek)
            .ilike('wallet_address', ownWallet)
            .maybeSingle()
          pw = pwData
        }
        const weeklyPnl = (parseFloat(cw.cumulative_pnl) || 0) - (parseFloat(pw?.cumulative_pnl) || 0)
        const weeklyVol = (parseFloat(cw.cumulative_volume) || 0) - (parseFloat(pw?.cumulative_volume) || 0)
        const weeklySodex = (parseFloat(cw.sodex_total_volume) || 0) - (parseFloat(pw?.sodex_total_volume) || 0)
        const weeklySpot = Math.max(weeklySodex - weeklyVol, 0)
        setYourRow({
          walletAddress: ownWallet,
          pnl: weeklyPnl,
          volume: weeklyVol,
          unrealizedPnl: parseFloat(cw.unrealized_pnl) || 0,
          pnlRank: cw.pnl_rank || null,
          volumeRank: cw.volume_rank || null,
          sodexVolume: weeklySodex,
          spotVolume: weeklySpot,
          isYou: true
        })
      }
    } catch (err) {
      console.error('Failed to load your row:', err)
      setYourRow(null)
    }
  }

  const loadLbMeta = async () => {
    const cached = globalCache.getLeaderboardMeta()
    if (cached) { setLbMeta(cached); return }
    try {
      const { data, error } = await supabase
        .from('leaderboard_meta')
        .select('id, current_week_number, pool_size, total_user_counts')
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

  // Scan top 100 for Your Row rank when not using DB ranks
  useEffect(() => {
    if (!ownWallet || !yourRow) return
    if (!isWeeklyView && viewMode === 'futures') return // DB ranks used
    const cacheKey = `${timeRange}_${viewMode}_${leaderboardType}_${excludeSodexOwned}`
    if (yourRowRankCache.current[cacheKey] !== undefined) return

    const scanTop100 = async () => {
      try {
        if (isWeeklyView) {
          const weekNum = timeRange === 'current' ? 0 : timeRange
          const rpcSort = getRpcSort(leaderboardType, viewMode)
          let searchRows
          if (weekNum >= 1) {
            // Historical: from static JSON
            const weekData = await fetchHistoricalWeek(weekNum)
            const { rows } = queryHistoricalWeek(weekData, {
              sort: rpcSort, limit: 100, offset: 0, excludeSodex: excludeSodexOwned
            })
            searchRows = rows
          } else {
            const { data } = await supabase.rpc('get_weekly_leaderboard', {
              p_week: weekNum, p_sort: rpcSort, p_limit: 100, p_offset: 0, p_exclude_sodex: excludeSodexOwned
            })
            searchRows = data || []
          }
          const pos = searchRows.findIndex(r => r.wallet_address?.toLowerCase() === ownWallet)
          yourRowRankCache.current[cacheKey] = pos !== -1 ? pos + 1 : '100+'
        } else if (viewMode === 'total') {
          // Total all-time: scan via Sodex API proxy (zero DB)
          const sortBy = leaderboardType === 'pnl' ? 'pnl' : 'volume'
          const res = await fetch(`/api/sodex-leaderboard?page=1&page_size=50&sort_by=${sortBy}&sort_order=desc`)
          const json = await res.json()
          const rows1 = json.data || []
          const res2 = await fetch(`/api/sodex-leaderboard?page=2&page_size=50&sort_by=${sortBy}&sort_order=desc`)
          const json2 = await res2.json()
          const allRows = [...rows1, ...(json2.data || [])]
          const pos = allRows.findIndex(r => r.walletAddress?.toLowerCase() === ownWallet)
          yourRowRankCache.current[cacheKey] = pos !== -1 ? pos + 1 : '100+'
        } else {
          // Spot all-time: from DB
          let q = supabase.from('leaderboard_smart')
            .select('wallet_address')
            .order(leaderboardType === 'volume' ? 'spot_volume' : 'spot_pnl', { ascending: false, nullsFirst: false })
            .limit(100)
          if (excludeSodexOwned) q = q.not('is_sodex_owned', 'is', true)
          q = q.gt('spot_volume', 0)
          const { data } = await q
          const pos = (data || []).findIndex(r => r.wallet_address?.toLowerCase() === ownWallet)
          yourRowRankCache.current[cacheKey] = pos !== -1 ? pos + 1 : '100+'
        }
        setYourRow(prev => prev ? { ...prev } : null) // trigger re-render
      } catch (err) {
        yourRowRankCache.current[cacheKey] = '100+'
      }
    }
    scanTop100()
  }, [ownWallet, yourRow, timeRange, viewMode, leaderboardType, excludeSodexOwned, isWeeklyView])

  // Load weekly top 10 gainers/losers
  const loadWeeklyTop10 = async (weekNum, excludeSodex, mode) => {
    const top10Key = `weekly_${weekNum}_${excludeSodex}_${mode}`
    const cached = globalCache.getTop10(top10Key)
    if (cached) {
      setTopGainersData(cached.gainers)
      setTopLosersData(cached.losers)
      setTop10Loading(false)
      return
    }

    setTop10Loading(true)
    try {
      let rows
      if (weekNum >= 1) {
        // Historical: from static JSON
        const weekData = await fetchHistoricalWeek(weekNum)
        let allRows = weekData.rows
        if (excludeSodex) allRows = allRows.filter(r => !r.is_sodex_owned)
        rows = allRows.map(r => ({
          walletAddress: r.wallet_address,
          pnl: mode === 'total' ? (parseFloat(r.weekly_sodex_pnl) || 0)
             : mode === 'spot' ? (parseFloat(r.weekly_spot_pnl) || 0)
             : (parseFloat(r.weekly_pnl) || 0)
        }))
      } else {
        // Current week: Supabase RPC
        const pnlSort = mode === 'total' ? 'total_pnl' : mode === 'spot' ? 'spot_pnl' : 'pnl'
        const { data, error } = await supabase.rpc('get_weekly_leaderboard', {
          p_week: weekNum,
          p_sort: pnlSort,
          p_limit: 5000,
          p_offset: 0,
          p_exclude_sodex: excludeSodex
        })
        if (error) throw error
        rows = (data || []).map(r => ({
          walletAddress: r.wallet_address,
          pnl: mode === 'total' ? (parseFloat(r.weekly_sodex_pnl) || 0)
             : mode === 'spot' ? (parseFloat(r.weekly_spot_pnl) || 0)
             : (parseFloat(r.weekly_pnl) || 0)
        }))
      }
      const gainers = rows.filter(r => r.pnl > 0).sort((a, b) => b.pnl - a.pnl).slice(0, 10)
      const losers = rows.filter(r => r.pnl < 0).sort((a, b) => a.pnl - b.pnl).slice(0, 10)
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

  // Map leaderboardType + viewMode to RPC sort
  const getRpcSort = (type, mode) => {
    if (type === 'pnl') return mode === 'total' ? 'total_pnl' : mode === 'spot' ? 'spot_pnl' : 'pnl'
    if (mode === 'spot') return 'spot_volume'
    if (mode === 'futures') return 'futures_volume'
    return 'volume' // total
  }

  // ── Weekly leaderboard loading ──
  // Week 0 (current live): Supabase RPC
  // Week >= 1 (historical): Static JSON from GitHub CDN
  const loadWeeklyPage = async (page, weekNum, type, excludeSodex, mode = 'futures') => {
    const rpcSort = getRpcSort(type, mode)

    // Historical weeks: fetch from static JSON
    if (weekNum >= 1) {
      const cached = globalCache.getWeeklyLeaderboardPage(weekNum, page, rpcSort, excludeSodex)
      if (cached) {
        setLeaderboardData(cached)
        const cachedCount = globalCache.getWeeklyTotalCount(weekNum, rpcSort, excludeSodex)
        if (cachedCount !== null) setTotalLeaderboardCount(cachedCount)
        setLeaderboardLoading(false)
        return
      }
      setLeaderboardLoading(true)
      try {
        const weekData = await fetchHistoricalWeek(weekNum)
        const pageSize = 20
        const { rows: pageRows, totalCount } = queryHistoricalWeek(weekData, {
          sort: rpcSort, limit: pageSize, offset: (page - 1) * pageSize, excludeSodex
        })
        setTotalLeaderboardCount(totalCount)
        globalCache.setWeeklyTotalCount(weekNum, rpcSort, excludeSodex, totalCount)
        const formattedData = pageRows.map(row => ({
          accountId: row.account_id,
          walletAddress: row.wallet_address,
          pnl: parseFloat(row.weekly_pnl) || 0,
          volume: parseFloat(row.weekly_volume) || 0,
          unrealizedPnl: parseFloat(row.unrealized_pnl) || 0,
          pnlRank: row.pnl_rank || null,
          volumeRank: row.volume_rank || null,
          sodexVolume: parseFloat(row.weekly_sodex_volume) || 0,
          sodexPnl: parseFloat(row.weekly_sodex_pnl) || 0,
          spotVolume: parseFloat(row.weekly_spot_volume) || 0,
          spotPnl: parseFloat(row.weekly_spot_pnl) || 0
        }))
        globalCache.setWeeklyLeaderboardPage(weekNum, page, rpcSort, excludeSodex, formattedData)
        setLeaderboardData(formattedData)
      } catch (err) {
        console.error('Failed to load historical leaderboard:', err)
      }
      setLeaderboardLoading(false)
      return
    }

    // Current week (0): Supabase RPC
    const cached = globalCache.getWeeklyLeaderboardPage(weekNum, page, rpcSort, excludeSodex)
    if (cached) {
      setLeaderboardData(cached)
      const cachedCount = globalCache.getWeeklyTotalCount(weekNum, rpcSort, excludeSodex)
      if (cachedCount !== null) setTotalLeaderboardCount(cachedCount)
      setLeaderboardLoading(false)
      return
    }

    setLeaderboardLoading(true)
    try {
      const pageSize = 20

      let totalCount = globalCache.getWeeklyTotalCount(weekNum, type, excludeSodex)
      if (totalCount === null) {
        const { data: cnt, error: cntErr } = await supabase.rpc('get_weekly_leaderboard_count', {
          p_week: weekNum,
          p_exclude_sodex: excludeSodex
        })
        if (cntErr) throw cntErr
        totalCount = cnt || 0
        globalCache.setWeeklyTotalCount(weekNum, rpcSort, excludeSodex, totalCount)
      }
      setTotalLeaderboardCount(totalCount)

      const { data, error } = await supabase.rpc('get_weekly_leaderboard', {
        p_week: weekNum,
        p_sort: rpcSort,
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
        volumeRank: row.volume_rank || null,
        sodexVolume: parseFloat(row.weekly_sodex_volume) || 0,
        sodexPnl: parseFloat(row.weekly_sodex_pnl) || 0,
        spotVolume: parseFloat(row.weekly_spot_volume) || 0,
        spotPnl: parseFloat(row.weekly_spot_pnl) || 0
      }))

      globalCache.setWeeklyLeaderboardPage(weekNum, page, rpcSort, excludeSodex, formattedData)
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
      setLeaderboardData(cachedData)
      const cachedCount = globalCache.getTotalCount(cacheType, excludeSodex, showZero)
      if (cachedCount !== null) setTotalLeaderboardCount(cachedCount)
      setLeaderboardLoading(false)
      return
    }

    setLeaderboardLoading(true)
    try {
      const pageSize = 20

      // Total all-time: fetch directly from Sodex API (100% live data, zero DB)
      if (mode === 'total') {
        const sortBy = type === 'pnl' ? 'pnl' : 'volume'
        const res = await fetch(`/api/sodex-leaderboard?page=${page}&page_size=${pageSize}&sort_by=${sortBy}&sort_order=desc`)
        const json = await res.json()
        if (json.error) throw new Error(json.error)

        setTotalLeaderboardCount(json.meta.total)
        globalCache.setTotalCount(cacheType, excludeSodex, showZero, json.meta.total)
        globalCache.setLeaderboardPage(page, cacheType, excludeSodex, showZero, json.data)
        setLeaderboardData(json.data)
        setLeaderboardLoading(false)
        return
      }

      // Futures / Spot: from our DB
      let orderColumn, ascending
      if (mode === 'futures') {
        orderColumn = type === 'volume' ? 'volume_rank' : 'pnl_rank'
        ascending = true
      } else {
        orderColumn = type === 'volume' ? 'spot_volume' : 'spot_pnl'
        ascending = false
      }

      // Count query
      let totalCount = globalCache.getTotalCount(cacheType, excludeSodex, showZero)
      if (totalCount === null) {
        let countQuery = supabase
          .from('leaderboard_smart')
          .select('account_id', { count: 'exact', head: true })
        if (excludeSodex) countQuery = countQuery.not('is_sodex_owned', 'is', true)
        if (!showZero) {
          if (mode === 'futures') countQuery = countQuery.or('cumulative_volume.gt.0,cumulative_pnl.neq.0')
          else countQuery = countQuery.gt('spot_volume', 0)
        }
        const { count } = await countQuery
        totalCount = count || 0
        globalCache.setTotalCount(cacheType, excludeSodex, showZero, totalCount)
      }
      setTotalLeaderboardCount(totalCount)

      let dataQuery = supabase
        .from('leaderboard_smart')
        .select('account_id, wallet_address, cumulative_pnl, cumulative_volume, unrealized_pnl, pnl_rank, volume_rank, last_synced_at, sodex_total_volume, sodex_pnl, spot_volume, spot_pnl')
        .order(orderColumn, { ascending, nullsFirst: false })
      if (excludeSodex) dataQuery = dataQuery.not('is_sodex_owned', 'is', true)
      if (!showZero) {
        if (mode === 'futures') dataQuery = dataQuery.or('cumulative_volume.gt.0,cumulative_pnl.neq.0')
        else dataQuery = dataQuery.gt('spot_volume', 0)
      }

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
        lastSyncedAt: row.last_synced_at,
        sodexVolume: parseFloat(row.sodex_total_volume) || 0,
        sodexPnl: parseFloat(row.sodex_pnl) || 0,
        spotVolume: parseFloat(row.spot_volume) || 0,
        spotPnl: parseFloat(row.spot_pnl) || 0
      }))

      globalCache.setLeaderboardPage(page, cacheType, excludeSodex, showZero, formattedData)
      setLeaderboardData(formattedData)
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
          fetch('/api/sodex-leaderboard?page=1&page_size=10&sort_by=pnl&sort_order=desc'),
          fetch('/api/sodex-leaderboard?page=1&page_size=10&sort_by=pnl&sort_order=asc')
        ])
        const [gJson, lJson] = await Promise.all([gRes.json(), lRes.json()])
        const gainers = (gJson.data || []).map(r => ({
          walletAddress: r.walletAddress, pnl: r.sodexPnl || 0, volume: r.sodexVolume || 0
        }))
        const losers = (lJson.data || []).map(r => ({
          walletAddress: r.walletAddress, pnl: r.sodexPnl || 0, volume: r.sodexVolume || 0
        }))
        globalCache.setTop10(gainers, losers, top10Key)
        setTopGainersData(gainers)
        setTopLosersData(losers)
        setTop10Loading(false)
        return
      }

      const pnlColumn = mode === 'spot' ? 'spot_pnl' : 'cumulative_pnl'

      let gainersQuery = supabase
        .from('leaderboard_smart')
        .select('account_id, wallet_address, cumulative_pnl, cumulative_volume, is_sodex_owned, sodex_pnl, spot_pnl')
        .order(pnlColumn, { ascending: false, nullsFirst: false })
        .limit(10)
      if (excludeSodex) gainersQuery = gainersQuery.not('is_sodex_owned', 'is', true)
      if (!showZero) {
        gainersQuery = gainersQuery.gt(pnlColumn, 0)
      } else {
        gainersQuery = gainersQuery.or(`${pnlColumn}.gt.0,${pnlColumn}.is.null`)
      }
      const { data: gainers, error: gainersError } = await gainersQuery
      if (gainersError) throw gainersError

      let losersQuery = supabase
        .from('leaderboard_smart')
        .select('account_id, wallet_address, cumulative_pnl, cumulative_volume, is_sodex_owned, sodex_pnl, spot_pnl')
        .order(pnlColumn, { ascending: true, nullsFirst: false })
        .limit(10)
      if (excludeSodex) losersQuery = losersQuery.not('is_sodex_owned', 'is', true)
      if (!showZero) {
        losersQuery = losersQuery.lt(pnlColumn, 0)
      } else {
        losersQuery = losersQuery.or(`${pnlColumn}.lt.0,${pnlColumn}.is.null`)
      }
      const { data: losers, error: losersError } = await losersQuery
      if (losersError) throw losersError

      const formatUser = (row) => ({
        walletAddress: row.wallet_address,
        pnl: mode === 'spot' ? (parseFloat(row.spot_pnl) || 0) : (parseFloat(row.cumulative_pnl) || 0),
        volume: parseFloat(row.cumulative_volume) || 0
      })

      const formattedGainers = (gainers || []).map(formatUser)
      const formattedLosers = (losers || []).map(formatUser)
      globalCache.setTop10(formattedGainers, formattedLosers, top10Key)
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
          const res = await fetch(`/api/sodex-leaderboard?page=${p}&page_size=50&sort_by=${sortBy}&sort_order=desc`)
          const json = await res.json()
          if (json.data) allData.push(...json.data)
        }
        const headers = ['rank', 'wallet_address', 'total_pnl', 'total_volume']
        const rows = allData.map((row, idx) => [idx + 1, row.walletAddress, row.sodexPnl, row.sodexVolume])
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

      let orderColumn, ascending
      if (viewMode === 'futures') {
        orderColumn = leaderboardType === 'volume' ? 'volume_rank' : 'pnl_rank'
        ascending = true
      } else { // spot
        orderColumn = leaderboardType === 'volume' ? 'spot_volume' : 'spot_pnl'
        ascending = false
      }
      const pageSize = 1000
      const allData = []
      let currentPage = 0

      while (currentPage * pageSize < totalLeaderboardCount) {
        let query = supabase
          .from('leaderboard_smart')
          .select('account_id, wallet_address, cumulative_pnl, cumulative_volume, unrealized_pnl, pnl_rank, volume_rank, sodex_total_volume, sodex_pnl, spot_volume, spot_pnl')
          .order(orderColumn, { ascending, nullsFirst: false })
        if (excludeSodexOwned) query = query.not('is_sodex_owned', 'is', true)
        const { data, error } = await query.range(currentPage * pageSize, (currentPage + 1) * pageSize - 1)
        if (error) throw error
        allData.push(...data)
        currentPage++
      }

      const headers = viewMode === 'futures'
        ? ['rank', 'wallet_address', 'pnl', 'volume', 'unrealized_pnl']
        : ['rank', 'wallet_address', 'spot_pnl', 'spot_volume']
      const rows = allData.map((row, idx) => viewMode === 'futures'
        ? [idx + 1, row.wallet_address, row.cumulative_pnl, row.cumulative_volume, row.unrealized_pnl]
        : [idx + 1, row.wallet_address, row.spot_pnl, row.spot_volume]
      )

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
        options.push({ value: i, label: i === 1 ? 'CA + Week 1' : `Week ${i}` })
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
      <div className="leaderboard-toggle" style={{ marginBottom: isWeeklyView && viewMode !== 'total' ? '8px' : '20px', display: 'inline-flex' }}>
        <button className={viewMode === 'total' ? 'active' : ''} onClick={() => setViewMode('total')}>Total</button>
        <button className={viewMode === 'futures' ? 'active' : ''} onClick={() => setViewMode('futures')}>Futures</button>
        <button className={viewMode === 'spot' ? 'active' : ''} onClick={() => setViewMode('spot')}>Spot</button>
      </div>
      {isWeeklyView && viewMode !== 'total' && (
        <div style={{ fontSize: '11px', color: '#f59e0b', marginBottom: '16px', opacity: 0.85 }}>
          Week 6 {viewMode} data may be inaccurate due to sync issues. Use the Total tab for accurate rankings.
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
                      background: 'var(--color-bg-secondary, rgba(25, 25, 25, 0.98))',
                      border: '1px solid var(--color-border-subtle)',
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
                  {yourRow && (
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
