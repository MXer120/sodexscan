'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '../lib/ThemeContext'
import '../styles/SoPoints.css'
import { supabase } from '../lib/supabaseClient'
import { useUserProfile } from '../hooks/useProfile'
import { useSoPointsConfig } from '../hooks/useSoPointsConfig'
import { globalCache } from '../lib/globalCache'
import Link from 'next/link'

// Spot volume multiplier (spot is harder to get, worth more)
const SPOT_MULTIPLIER = 2
const TOTAL_POOL = 1_000_000
const SPOT_DATA_URL = 'https://raw.githubusercontent.com/Eliasdegemu61/sodex-spot-volume-data/main/spot_vol_data.json'

// Sodex-owned wallets to exclude from points calculation
const SODEX_SPOT_WALLETS = new Set([
    '0xc50e42e7f49881127e8183755be3f281bb687f7b',
    '0x1f446dfa225d5c9e8a80cd227bf57444fc141332',
    '0x4b16ce4edb6bfea22aa087fb5cb3cfd654ca99f5'
])

const SoPointsPage = () => {
    const { theme } = useTheme()
    const [showWarning, setShowWarning] = useState(true)
    const [timeLeft, setTimeLeft] = useState('')
    const [globalStats, setGlobalStats] = useState({
        totalUsers: 0,
        traders: 0,
        activeTraders: 0
    })
    const [showDiff, setShowDiff] = useState(false)
    const [loading, setLoading] = useState(true)
    const [lbMeta, setLbMeta] = useState(null)
    const [rewardEstimate, setRewardEstimate] = useState(null)
    const [rewardLoading, setRewardLoading] = useState(false)
    const [weeklyStats, setWeeklyStats] = useState({})
    const [totalUserCounts, setTotalUserCounts] = useState({})

    // Spot leaderboard data (for points LB)
    const [spotAllTime, setSpotAllTime] = useState(null)   // GitHub (all-time)
    const [spotSnapshots, setSpotSnapshots] = useState({})  // weekNum -> snapshot data
    const [spotDataLoading, setSpotDataLoading] = useState(false)

    // Weekly futures data for all users (from weekly LB RPC)
    const [futuresDataByWeek, setFuturesDataByWeek] = useState({}) // weekNum -> addr->vol map
    const [futuresLoading, setFuturesLoading] = useState(false)

    // Points leaderboard state
    const [selectedPointsWeek, setSelectedPointsWeek] = useState(null) // null = current week (set after meta loads)
    const [pointsLbPage, setPointsLbPage] = useState(1)
    const POINTS_PAGE_SIZE = 20

    const { getWeekConfig } = useSoPointsConfig()
    const { data: profileData } = useUserProfile()
    const ownWallet = profileData?.profile?.own_wallet

    const WEEK1_START = new Date('2026-02-02T00:00:00Z')
    const WEEK_DURATION = 7 * 24 * 60 * 60 * 1000

    const getWeekDateRange = (weekNum) => {
        const start = new Date(WEEK1_START.getTime() + (weekNum - 1) * WEEK_DURATION)
        const end = new Date(start.getTime() + WEEK_DURATION)
        const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
        return `${fmt(start)} - ${fmt(end)}`
    }

    // Next Saturday 00:00 UTC countdown
    const getNextSaturday = () => {
        const now = new Date()
        const day = now.getUTCDay()
        const daysUntilSat = day === 6 ? 7 : (6 - day)
        const next = new Date(now)
        next.setUTCDate(now.getUTCDate() + daysUntilSat)
        next.setUTCHours(0, 0, 0, 0)
        return next.getTime()
    }

    const [targetDate, setTargetDate] = useState(() => getNextSaturday())

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date().getTime()
            const distance = targetDate - now
            if (distance < 0) {
                // Week rolled over — reset countdown & reload all data
                setTargetDate(getNextSaturday())
                setTimeLeft('DISTRIBUTING...')
                globalCache.caches.leaderboardMeta = { data: null, timestamp: 0 }
                globalCache.caches.spotAllTimeData = { data: null, timestamp: 0 }
                setSpotSnapshots({})
                setFuturesDataByWeek({})
                setSelectedPointsWeek(null)
                loadMeta()
                return
            }
            const days = Math.floor(distance / (1000 * 60 * 60 * 24))
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((distance % (1000 * 60)) / 1000)
            setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`)
        }, 1000)
        return () => clearInterval(timer)
    }, [targetDate])

    // Load meta + stats on mount
    useEffect(() => {
        loadMeta()
        loadStats()
    }, [])

    // Set default selected week + load data once meta is available
    useEffect(() => {
        if (lbMeta) {
            const week = selectedPointsWeek || lbMeta.current_week_number
            if (!selectedPointsWeek) setSelectedPointsWeek(week)
            loadPointsWeekData(week)
        }
    }, [lbMeta])

    // When selected week changes, load its data
    useEffect(() => {
        if (selectedPointsWeek && lbMeta) {
            setPointsLbPage(1)
            loadPointsWeekData(selectedPointsWeek)
        }
    }, [selectedPointsWeek])

    // Load reward estimate when wallet available
    useEffect(() => {
        if (ownWallet) loadRewardEstimate(ownWallet)
    }, [ownWallet])

    // ── Load all-time spot data from GitHub ──
    const loadSpotAllTime = async () => {
        const cached = globalCache.getSpotAllTimeData()
        if (cached) { setSpotAllTime(cached); return }
        try {
            const res = await fetch(SPOT_DATA_URL)
            const data = await res.json()
            globalCache.setSpotAllTimeData(data)
            setSpotAllTime(data)
        } catch (err) {
            console.error('Failed to load spot all-time:', err)
        }
    }

    // ── Load a spot snapshot for a given week (cached in state) ──
    const loadSpotSnapshot = async (weekNum) => {
        if (weekNum < 1) return null
        if (spotSnapshots[weekNum] !== undefined) return spotSnapshots[weekNum]
        try {
            const { data, error } = await supabase.rpc('get_spot_snapshot', { p_week: weekNum })
            if (error) { console.error('Spot snapshot RPC error:', error); return null }
            const snapshotData = (data && typeof data === 'object') ? data : {}
            setSpotSnapshots(prev => ({ ...prev, [weekNum]: snapshotData }))
            return snapshotData
        } catch (err) {
            console.error('Failed to load spot snapshot:', err)
        }
        return null
    }

    // ── Load futures data for a given week (cached in state) ──
    const loadFuturesForWeek = async (weekNum) => {
        // weekNum: 0 = current live, 1+ = frozen
        if (futuresDataByWeek[weekNum] !== undefined) return futuresDataByWeek[weekNum]
        try {
            const { data, error } = await supabase.rpc('get_futures_volume_map', {
                p_week: weekNum,
                p_exclude_sodex: true
            })
            if (error) throw error
            const map = data || {}
            setFuturesDataByWeek(prev => ({ ...prev, [weekNum]: map }))
            return map
        } catch (err) {
            console.error('Failed to load weekly futures:', err)
            return null
        }
    }

    // ── Load all data needed for the selected points week ──
    const loadPointsWeekData = async (weekNum) => {
        if (!lbMeta) return
        setSpotDataLoading(true)
        setFuturesLoading(true)
        const currentWeek = lbMeta.current_week_number
        const isLive = weekNum === currentWeek

        try {
            // Always need all-time data for live week
            if (isLive) await loadSpotAllTime()

            // Load spot snapshot for previous week (base for diff)
            await loadSpotSnapshot(weekNum - 1)

            // For historical weeks, also load the week's own snapshot
            if (!isLive) await loadSpotSnapshot(weekNum)

            // Load futures: week 0 for live, weekNum for historical
            await loadFuturesForWeek(isLive ? 0 : weekNum)
        } catch (err) {
            console.error('Failed to load points week data:', err)
        }
        setSpotDataLoading(false)
        setFuturesLoading(false)
    }

    // Load per-week trader counts
    useEffect(() => {
        if (lbMeta && lbMeta.current_week_number > 1) {
            loadWeeklyStats(lbMeta.current_week_number)
        }
    }, [lbMeta, totalUserCounts])

    const loadWeeklyStats = async (currentWeek) => {
        try {
            const stats = {}
            for (let w = currentWeek - 1; w >= 1; w--) {
                const { count: traders } = await supabase
                    .from('leaderboard_weekly')
                    .select('account_id', { count: 'exact', head: true })
                    .eq('week_number', w)
                    .gt('cumulative_volume', 0)
                    .not('is_sodex_owned', 'is', true)

                const { count: activeTraders } = await supabase
                    .from('leaderboard_weekly')
                    .select('account_id', { count: 'exact', head: true })
                    .eq('week_number', w)
                    .gte('cumulative_volume', 5000)
                    .not('is_sodex_owned', 'is', true)

                const storedCount = totalUserCounts[String(w)]
                stats[w] = {
                    traders: traders || 0,
                    totalUsers: storedCount || 0,
                    activeTraders: activeTraders || 0
                }
            }
            setWeeklyStats(stats)
        } catch (err) {
            console.error('Failed to load weekly stats:', err)
        }
    }

    const loadMeta = async () => {
        const cached = globalCache.getLeaderboardMeta()
        if (cached) { setLbMeta(cached); if (cached.total_user_counts) setTotalUserCounts(cached.total_user_counts); return }
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
                if (data.total_user_counts) setTotalUserCounts(data.total_user_counts)
            }
        } catch (err) {
            console.error('Failed to load lb meta:', err)
        }
    }

    const loadRewardEstimate = async (wallet) => {
        const cached = globalCache.getWeeklyRewardEstimate()
        if (cached) { setRewardEstimate(cached); return }
        setRewardLoading(true)
        try {
            const { data, error } = await supabase.rpc('get_user_weekly_reward_estimate', {
                p_wallet_address: wallet
            })
            if (error) throw error
            if (data) {
                globalCache.setWeeklyRewardEstimate(data)
                setRewardEstimate(data)
            }
        } catch (err) {
            console.error('Failed to load reward estimate:', err)
        }
        setRewardLoading(false)
    }

    const loadStats = async () => {
        setLoading(true)
        try {
            const { count: totalUsers } = await supabase
                .from('leaderboard')
                .select('account_id', { count: 'exact', head: true })
                .or('is_sodex_owned.is.null,is_sodex_owned.eq.false')

            const { count: traders } = await supabase
                .from('leaderboard')
                .select('account_id', { count: 'exact', head: true })
                .or('cumulative_pnl.neq.0,cumulative_volume.gt.0')
                .or('is_sodex_owned.is.null,is_sodex_owned.eq.false')

            const { count: activeTraders } = await supabase
                .from('leaderboard')
                .select('account_id', { count: 'exact', head: true })
                .gte('cumulative_volume', 5000)
                .or('is_sodex_owned.is.null,is_sodex_owned.eq.false')

            setGlobalStats({
                totalUsers: totalUsers || 0,
                traders: traders || 0,
                activeTraders: activeTraders || 0
            })
        } catch (err) {
            console.error("Failed to load global stats", err)
        } finally {
            setLoading(false)
        }
    }

    // ── Points Leaderboard: merge weekly spot + weekly futures, weighted scoring ──
    const pointsLeaderboard = useMemo(() => {
        if (!lbMeta || !selectedPointsWeek) return null
        const isLive = selectedPointsWeek === lbMeta.current_week_number
        const prevWeek = selectedPointsWeek - 1

        const weekConfig = getWeekConfig(selectedPointsWeek)
        const effectiveMultiplier = weekConfig.spot_multiplier

        // Determine spot data sources based on live vs historical
        const baseSnapshotRaw = prevWeek >= 1 ? spotSnapshots[prevWeek] : null
        const weekFutures = isLive ? futuresDataByWeek[0] : futuresDataByWeek[selectedPointsWeek]

        // For live week: need allTime. For historical: wait until snapshot is loaded (undefined = still loading, {} = loaded but empty)
        if (isLive && !spotAllTime) return null
        if (!isLive && spotSnapshots[selectedPointsWeek] === undefined) return null
        if (!weekFutures && futuresLoading) return null

        // Normalize baseSnapshot keys to lowercase for reliable case-insensitive lookup
        const baseSnapshot = baseSnapshotRaw
            ? Object.fromEntries(Object.entries(baseSnapshotRaw).map(([k, v]) => [k.toLowerCase(), v]))
            : null

        // Build spot weekly diff map
        const spotWeeklyMap = {}
        const spotSource = isLive ? spotAllTime : spotSnapshots[selectedPointsWeek]

        for (const [addr, d] of Object.entries(spotSource)) {
            if (SODEX_SPOT_WALLETS.has(addr.toLowerCase())) continue
            const vol = d.vol || 0
            const baseVol = baseSnapshot?.[addr.toLowerCase()]?.vol || 0
            const weeklySpot = Math.max(0, vol - baseVol)
            spotWeeklyMap[addr.toLowerCase()] = { weeklySpot, allTimeSpot: vol, userId: d.userId, originalAddr: addr }
        }

        // Merge all wallets from both spot and futures (exclude sodex-owned)
        const allAddrs = new Set([
            ...Object.keys(spotWeeklyMap),
            ...(weekFutures ? Object.keys(weekFutures) : [])
        ])
        for (const sw of SODEX_SPOT_WALLETS) allAddrs.delete(sw)

        const entries = []
        for (const addr of allAddrs) {
            const spot = spotWeeklyMap[addr]
            const rawFuturesVol = weekFutures?.[addr] || 0
            const rawWeeklySpot = spot?.weeklySpot || 0
            const rawAllTimeSpot = spot?.allTimeSpot || 0

            // Apply per-week config exclusions
            const weeklySpotVol = weekConfig.include_spot ? rawWeeklySpot : 0
            const allTimeSpotVol = weekConfig.include_spot ? rawAllTimeSpot : 0
            const weeklyFuturesVol = weekConfig.include_futures ? rawFuturesVol : 0

            if (weeklySpotVol === 0 && weeklyFuturesVol === 0) continue

            entries.push({
                walletAddress: spot?.originalAddr || addr,
                userId: spot?.userId || '',
                weeklySpotVol,
                allTimeSpotVol,
                weeklyFuturesVol,
                weightedVolume: weeklySpotVol * effectiveMultiplier + weeklyFuturesVol
            })
        }

        entries.sort((a, b) => b.weightedVolume - a.weightedVolume)

        const totalWeighted = entries.reduce((sum, e) => sum + e.weightedVolume, 0)
        entries.forEach(e => {
            e.share = totalWeighted > 0 ? e.weightedVolume / totalWeighted : 0
            e.points = e.share * TOTAL_POOL
        })

        const qualified = entries.filter(e => e.points >= 1)
        const qualifiedWeighted = qualified.reduce((sum, e) => sum + e.weightedVolume, 0)

        qualified.forEach((e, i) => {
            e.rank = i + 1
            e.share = qualifiedWeighted > 0 ? e.weightedVolume / qualifiedWeighted : 0
            e.points = Math.round(e.share * TOTAL_POOL)
        })

        return { entries: qualified, totalWeighted: qualifiedWeighted, weekConfig }
    }, [spotAllTime, spotSnapshots, futuresDataByWeek, futuresLoading, selectedPointsWeek, lbMeta, getWeekConfig])

    // Find user's position in points LB
    const userPointsEntry = useMemo(() => {
        if (!pointsLeaderboard || !ownWallet) return null
        return pointsLeaderboard.entries.find(e => e.walletAddress.toLowerCase() === ownWallet.toLowerCase())
    }, [pointsLeaderboard, ownWallet])

    const closedAlphaStats = {
        totalUsers: 4708,
        traders: 1800,
        activeTraders: 650,
        pool: '~1.000.000'
    }

    const formatNumber = (num) => num.toLocaleString('en-US')

    const formatDiff = (current, baseline) => {
        const diff = current - baseline
        const sign = diff >= 0 ? '+' : ''
        return `${sign}${formatNumber(diff)}`
    }

    const renderValue = (currentVal, baselineVal) => {
        if (!showDiff) return formatNumber(currentVal)
        return (
            <span className={currentVal >= baselineVal ? 'positive-diff' : 'negative-diff'}>
                {formatDiff(currentVal, baselineVal)}
            </span>
        )
    }

    const renderClosedAlphaValue = (val, prefix = '') => {
        if (!showDiff) return `${prefix}${formatNumber(val)}`
        return `+${formatNumber(val)}`
    }

    const calcAvg = (pool, traders) => {
        if (!traders || traders === 0) return 0
        let poolValue = typeof pool === 'string'
            ? parseFloat(pool.replace(/[^\d]/g, ''))
            : pool
        if (!poolValue && pool === '~1.000.000') poolValue = 1000000
        return Math.round(poolValue / traders)
    }

    const renderAvgReward = (pool, traders, baselinePool, baselineTraders) => {
        const currentAvg = calcAvg(pool, traders)
        if (!showDiff) return `~${formatNumber(currentAvg)}`
        const baselineAvg = calcAvg(baselinePool, baselineTraders)
        return (
            <span className={currentAvg >= baselineAvg ? 'positive-diff' : 'negative-diff'}>
                {formatDiff(currentAvg, baselineAvg)}
            </span>
        )
    }

    const formatSoPoints = (num) => {
        if (!num || num === 0) return '0'
        return Math.round(num).toLocaleString('en-US')
    }

    const formatVol = (num) => {
        const absNum = Math.abs(num)
        if (absNum >= 1000000) return `${(absNum / 1000000).toFixed(2)}M`
        if (absNum >= 1000) return `${(absNum / 1000).toFixed(1)}K`
        return absNum.toFixed(0)
    }

    const poolSize = lbMeta?.pool_size ? parseFloat(lbMeta.pool_size) : 1000000
    const currentWeekNum = lbMeta?.current_week_number || 1

    const getPrevStats = (weekNum) => {
        if (weekNum <= 1) return closedAlphaStats
        const prev = weeklyStats[weekNum - 1]
        if (prev) return prev
        return { totalUsers: 0, traders: 0, activeTraders: 0 }
    }

    // Truncate address
    const truncAddr = (addr) => {
        if (!addr || addr.length < 12) return addr
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`
    }

    return (
        <div className="sopoints-container">
            <div className="sopoints-header">
                {/* Current Week Pool Card */}
                <div className="sopoints-card pool-card">
                    <div className="pool-label">Week {currentWeekNum} Reward Pool</div>
                    <div className="pool-amount" style={{ fontSize: '32px' }}>
                        {formatNumber(poolSize)} <span style={{ color: 'var(--color-primary)' }}>SoPoints</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                        Spot volume weighted {SPOT_MULTIPLIER}x vs futures
                    </div>
                    <div className="countdown-container">
                        <div className="countdown-label">Next Snapshot in</div>
                        <div className="countdown-timer">
                            {timeLeft || 'Calculating...'}
                        </div>
                    </div>
                </div>

                {/* Your Estimated Reward Card */}
                {ownWallet ? (
                    <div className="sopoints-card cta-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div className="pool-label" style={{ marginBottom: '8px' }}>Your Estimated Reward</div>
                        {rewardLoading && !userPointsEntry ? (
                            <div className="pool-amount" style={{ fontSize: '28px' }}>...</div>
                        ) : userPointsEntry ? (
                            <>
                                <div className="pool-amount" style={{ fontSize: '28px' }}>
                                    ~{formatSoPoints(userPointsEntry.points)} <span style={{ color: 'var(--color-primary)', fontSize: '18px' }}>SoPoints</span>
                                </div>
                                <div style={{ marginTop: '12px', display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
                                    <span>Futures: ${formatVol(userPointsEntry.weeklyFuturesVol)}</span>
                                    <span>Spot: ${formatVol(userPointsEntry.weeklySpotVol)}</span>
                                    <span>Share: {(userPointsEntry.share * 100).toFixed(2)}%</span>
                                    <span>Rank: #{userPointsEntry.rank}</span>
                                </div>
                            </>
                        ) : rewardEstimate?.found ? (
                            <>
                                <div className="pool-amount" style={{ fontSize: '28px' }}>
                                    ~{formatSoPoints(rewardEstimate.estimated_reward)} <span style={{ color: 'var(--color-primary)', fontSize: '18px' }}>SoPoints</span>
                                </div>
                                <div style={{ marginTop: '12px', display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
                                    <span>Vol: ${parseFloat(rewardEstimate.weekly_volume || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                                    <span>Share: {rewardEstimate.total_weekly_volume > 0
                                        ? ((parseFloat(rewardEstimate.weekly_volume) / parseFloat(rewardEstimate.total_weekly_volume)) * 100).toFixed(2)
                                        : '0.00'}%</span>
                                    <span>Rank: #{rewardEstimate.volume_rank || '-'}</span>
                                </div>
                            </>
                        ) : (spotDataLoading || futuresLoading) ? (
                            <div className="pool-amount" style={{ fontSize: '28px' }}>
                                <span className="spot-loading-dot">...</span>
                            </div>
                        ) : (
                            <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                                No trading volume this week yet
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="sopoints-card cta-card">
                        <div className="cta-boost">+5% Points Boost</div>
                        <div className="cta-text">Connect your wallet in <Link href="/profile" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Profile</Link> to see your estimated reward.</div>
                        <a
                            href="https://sodex.com/join/SOSO"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="join-btn"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <line x1="19" y1="8" x2="19" y2="14"></line>
                                <line x1="22" y1="11" x2="16" y2="11"></line>
                            </svg>
                            Join now
                        </a>
                    </div>
                )}
            </div>

            <div className="table-controls" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <label className="diff-checkbox">
                    <input
                        type="checkbox"
                        checked={showDiff}
                        onChange={(e) => setShowDiff(e.target.checked)}
                    />
                    <span className="checkbox-custom"></span>
                    Show Diff
                </label>
            </div>

            <div className="sopoints-table-container">
                <table className="sopoints-table">
                    <thead>
                        <tr>
                            <th>Week</th>
                            <th>Total Users</th>
                            <th>Traders</th>
                            <th>Active Traders</th>
                            <th>Avg. Reward</th>
                            <th>SoPoints Pool</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Current Week Row (Live) */}
                        <tr>
                            <td>
                                <div className="week-cell">
                                    <span className="week-name">Week {currentWeekNum} <span style={{ color: 'var(--color-primary)', fontSize: '11px' }}>LIVE</span></span>
                                    <span className="week-dates">Ongoing</span>
                                </div>
                            </td>
                            <td className="global-stats-value">
                                {loading ? '...' : renderValue(globalStats.totalUsers, getPrevStats(currentWeekNum).totalUsers)}
                            </td>
                            <td className="global-stats-value">
                                {loading ? '...' : renderValue(globalStats.traders, getPrevStats(currentWeekNum).traders)}
                            </td>
                            <td className="global-stats-value">
                                {loading ? '...' : renderValue(globalStats.activeTraders, getPrevStats(currentWeekNum).activeTraders)}
                            </td>
                            <td className="points-cell" style={{ color: 'var(--color-text-main)' }}>
                                {loading ? '...' : renderAvgReward(poolSize, globalStats.traders, poolSize, getPrevStats(currentWeekNum).traders)}
                            </td>
                            <td className="points-cell">{formatNumber(poolSize)}</td>
                        </tr>

                        {/* Frozen Week Rows */}
                        {Array.from({ length: Math.max(0, currentWeekNum - 1) }, (_, i) => currentWeekNum - 1 - i).map(weekNum => {
                            const ws = weeklyStats[weekNum]
                            const prev = getPrevStats(weekNum)
                            return (
                                <tr key={`week-${weekNum}`}>
                                    <td>
                                        <div className="week-cell">
                                            <span className="week-name">Week {weekNum}</span>
                                            <span className="week-dates">{getWeekDateRange(weekNum)}</span>
                                        </div>
                                    </td>
                                    <td className="global-stats-value">
                                        {ws ? renderValue(ws.totalUsers, prev.totalUsers) : '...'}
                                    </td>
                                    <td className="global-stats-value">
                                        {ws ? renderValue(ws.traders, prev.traders) : '...'}
                                    </td>
                                    <td className="global-stats-value">
                                        {ws ? renderValue(ws.activeTraders, prev.activeTraders) : '...'}
                                    </td>
                                    <td className="points-cell" style={{ color: 'var(--color-text-main)' }}>
                                        {ws ? renderAvgReward(poolSize, ws.traders, poolSize, prev.traders) : '...'}
                                    </td>
                                    <td className="points-cell">{formatNumber(poolSize)}</td>
                                </tr>
                            )
                        })}

                        {/* Closed Alpha Row */}
                        <tr>
                            <td>
                                <div className="week-cell">
                                    <span className="week-name">Closed Alpha</span>
                                    <span className="week-dates">Oct 06 - Jan 31</span>
                                </div>
                            </td>
                            <td className="global-stats-value">{renderClosedAlphaValue(closedAlphaStats.totalUsers)}</td>
                            <td className="global-stats-value">{renderClosedAlphaValue(closedAlphaStats.traders, '~')}</td>
                            <td className="global-stats-value">{renderClosedAlphaValue(closedAlphaStats.activeTraders, '~')}</td>
                            <td className="points-cell" style={{ color: 'var(--color-text-main)' }}>
                                {renderAvgReward(closedAlphaStats.pool, closedAlphaStats.traders)}
                            </td>
                            <td className="points-cell">
                                <span className="tooltip-container">
                                    {closedAlphaStats.pool}
                                    <span className="info-icon">i</span>
                                    <span className="tooltip-text">This is a pure estimate based on closed alpha participation.</span>
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ─── Points Leaderboard ─── */}
            {pointsLeaderboard && (
                <div className="sopoints-table-container" style={{ marginTop: '24px' }}>
                    <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                                Points Leaderboard
                            </h2>
                            <select
                                value={selectedPointsWeek || currentWeekNum}
                                onChange={(e) => setSelectedPointsWeek(parseInt(e.target.value))}
                                style={{
                                    background: 'var(--color-bg-secondary)',
                                    border: '1px solid var(--color-border-subtle)',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    fontSize: '13px',
                                    color: 'var(--color-text-main)',
                                    cursor: 'pointer'
                                }}
                            >
                                {Array.from({ length: currentWeekNum }, (_, i) => currentWeekNum - i).map(w => (
                                    <option key={w} value={w}>
                                        Week {w}{w === currentWeekNum ? ' (Live)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span>{pointsLeaderboard.entries.length} traders · Spot {pointsLeaderboard.weekConfig.spot_multiplier}x weighted</span>
                            {!pointsLeaderboard.weekConfig.include_spot && (
                                <span style={{ color: '#f59e0b', fontSize: '11px' }}>&#9888; spot excluded</span>
                            )}
                            {!pointsLeaderboard.weekConfig.include_futures && (
                                <span style={{ color: '#f59e0b', fontSize: '11px' }}>&#9888; futures excluded</span>
                            )}
                            {pointsLeaderboard.weekConfig.spot_multiplier !== SPOT_MULTIPLIER && pointsLeaderboard.weekConfig.include_spot && pointsLeaderboard.weekConfig.include_futures && (
                                <span style={{ color: '#f59e0b', fontSize: '11px' }}>&#9888; custom multiplier</span>
                            )}
                        </span>
                    </div>
                    <table className="sopoints-table points-lb-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Wallet</th>
                                <th style={{ textAlign: 'right' }}>Spot Vol</th>
                                <th style={{ textAlign: 'right' }}>Futures Vol</th>
                                <th style={{ textAlign: 'right' }}>Est. Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pointsLeaderboard.entries
                                .slice((pointsLbPage - 1) * POINTS_PAGE_SIZE, pointsLbPage * POINTS_PAGE_SIZE)
                                .map((entry) => {
                                    const isUser = ownWallet && entry.walletAddress.toLowerCase() === ownWallet.toLowerCase()
                                    return (
                                        <tr key={entry.walletAddress} style={isUser ? { background: 'rgba(var(--color-primary-rgb), 0.08)' } : {}}>
                                            <td style={{ fontWeight: 600 }}>#{entry.rank}</td>
                                            <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                                                {isUser ? (
                                                    <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                                                        {truncAddr(entry.walletAddress)} <span style={{ fontSize: '10px' }}>(you)</span>
                                                    </span>
                                                ) : truncAddr(entry.walletAddress)}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>${formatVol(entry.weeklySpotVol)}</td>
                                            <td style={{ textAlign: 'right' }}>${formatVol(entry.weeklyFuturesVol)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>
                                                {formatSoPoints(entry.points)}
                                            </td>
                                        </tr>
                                    )
                                })}
                        </tbody>
                    </table>
                    {pointsLeaderboard.entries.length > POINTS_PAGE_SIZE && (
                        <div style={{ padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border-subtle)' }}>
                            <button
                                className="points-lb-page-btn"
                                onClick={() => setPointsLbPage(p => Math.max(1, p - 1))}
                                disabled={pointsLbPage === 1}
                            >
                                &lt; Prev
                            </button>
                            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                                Page {pointsLbPage} of {Math.ceil(pointsLeaderboard.entries.length / POINTS_PAGE_SIZE)}
                            </span>
                            <button
                                className="points-lb-page-btn"
                                onClick={() => setPointsLbPage(p => Math.min(Math.ceil(pointsLeaderboard.entries.length / POINTS_PAGE_SIZE), p + 1))}
                                disabled={pointsLbPage >= Math.ceil(pointsLeaderboard.entries.length / POINTS_PAGE_SIZE)}
                            >
                                Next &gt;
                            </button>
                        </div>
                    )}
                    <div style={{ padding: '8px 24px 16px', textAlign: 'center', fontSize: '11px', color: '#666' }}>
                        Spot data by <a href="https://x.com/eliasing__" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>@eliasing__</a>
                    </div>
                </div>
            )}

            {(spotDataLoading || futuresLoading) && !pointsLeaderboard && (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
                    <span className="spot-loading-dot">Loading points leaderboard...</span>
                </div>
            )}

            <style jsx>{`
        .diff-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 14px;
          color: var(--color-text-secondary);
          user-select: none;
        }

        .diff-checkbox input {
          display: none;
        }

        .checkbox-custom {
          width: 18px;
          height: 18px;
          border: 2px solid var(--color-border-visible);
          border-radius: 4px;
          position: relative;
          transition: all 0.2s;
        }

        .diff-checkbox input:checked + .checkbox-custom {
          background: var(--color-primary);
          border-color: var(--color-primary);
        }

        .diff-checkbox input:checked + .checkbox-custom::after {
          content: '';
          position: absolute;
          left: 5px;
          top: 2px;
          width: 4px;
          height: 8px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        .positive-diff {
          color: var(--color-success);
          font-weight: 600;
        }

        .negative-diff {
          color: var(--color-error);
          font-weight: 600;
        }

        .tooltip-container {
            position: relative;
            cursor: help;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }

        .info-icon {
            font-size: 12px;
            opacity: 0.6;
        }

        .tooltip-text {
            visibility: hidden;
            width: 200px;
            background-color: var(--color-bg-modal);
            color: var(--color-text-main);
            text-align: center;
            border-radius: 6px;
            padding: 8px;
            position: absolute;
            z-index: 10;
            bottom: 125%;
            left: 50%;
            margin-left: -100px;
            opacity: 0;
            transition: opacity 0.3s;
            font-size: 12px;
            font-weight: 400;
            border: 1px solid var(--color-border-subtle);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            pointer-events: none;
        }

        .tooltip-container:hover .tooltip-text {
            visibility: visible;
            opacity: 1;
        }

        .tooltip-text::after {
            content: "";
            position: absolute;
            top: 100%;
            left: 50%;
            margin-left: -5px;
            border-width: 5px;
            border-style: solid;
            border-color: var(--color-border-subtle) transparent transparent transparent;
        }

        .points-lb-page-btn {
            background: transparent;
            border: 1px solid var(--color-border-subtle);
            color: var(--color-text-secondary);
            padding: 6px 14px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s;
        }

        .points-lb-page-btn:hover:not(:disabled) {
            border-color: var(--color-primary);
            color: var(--color-primary);
        }

        .points-lb-page-btn:disabled {
            opacity: 0.3;
            cursor: not-allowed;
        }
      `}</style>
            {showWarning && (
                <WarningModal onClose={() => setShowWarning(false)} theme={theme} />
            )}

            <style jsx>{`
                @keyframes modalFadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes overlayFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    )
}

function WarningModal({ onClose, theme }) {
    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = 'unset' }
    }, [])

    if (typeof document === 'undefined') return null

    return createPortal(
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.85)',
                backdropFilter: 'blur(12px)',
                zIndex: 100000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                animation: 'overlayFadeIn 0.3s ease-out'
            }}>
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#111',
                    border: `1px solid ${theme.accentColor}33`,
                    borderRadius: '24px',
                    width: '100%',
                    maxWidth: '440px',
                    boxShadow: `0 24px 80px rgba(0,0,0,0.9), 0 0 40px ${theme.accentColor}11`,
                    overflow: 'hidden',
                    animation: 'modalFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    position: 'relative'
                }}>
                {/* Decorative background element */}
                <div style={{
                    position: 'absolute',
                    top: '-50px',
                    right: '-50px',
                    width: '150px',
                    height: '150px',
                    background: theme.accentColor,
                    filter: 'blur(70px)',
                    opacity: 0.15,
                    pointerEvents: 'none'
                }} />

                <div style={{ padding: '40px 32px', textAlign: 'center' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: `${theme.accentColor}15`,
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 24px',
                        border: `1px solid ${theme.accentColor}33`
                    }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={theme.accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                    </div>

                    <h2 style={{
                        fontSize: '24px',
                        fontWeight: '800',
                        color: '#fff',
                        marginBottom: '16px',
                        letterSpacing: '-0.02em'
                    }}>
                        Information & Disclaimer
                    </h2>

                    <p style={{
                        fontSize: '15px',
                        lineHeight: '1.6',
                        color: 'rgba(255,255,255,0.7)',
                        marginBottom: '32px'
                    }}>
                        Please note that this is a <strong>very rudimentary calculation</strong>, not close to the official Sodex one.
                        <br /><br />
                        It is <strong>guaranteed to be inaccurate</strong> and should be used for informational purposes only.
                    </p>

                    <button
                        onClick={onClose}
                        style={{
                            width: '100%',
                            background: theme.accentColor,
                            color: '#000',
                            border: 'none',
                            borderRadius: '14px',
                            padding: '16px',
                            fontSize: '15px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: `0 8px 24px ${theme.accentColor}44`
                        }}
                        onMouseOver={e => {
                            e.currentTarget.style.transform = 'translateY(-2px)'
                            e.currentTarget.style.boxShadow = `0 12px 28px ${theme.accentColor}66`
                        }}
                        onMouseOut={e => {
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.boxShadow = `0 8px 24px ${theme.accentColor}44`
                        }}
                    >
                        I Understand
                    </button>
                </div>
            </div>
        </div>
        , document.body
    )
}

export default SoPointsPage
