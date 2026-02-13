'use client'

import React, { useState, useEffect, useMemo } from 'react'
import '../styles/SoPoints.css'
import { supabase } from '../lib/supabaseClient'
import { useUserProfile } from '../hooks/useProfile'
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
    const [spotLocal, setSpotLocal] = useState(null)        // local snapshot (week 1 end)
    const [spotDataLoading, setSpotDataLoading] = useState(false)

    // Weekly futures data for all users (from weekly LB RPC)
    const [weeklyFuturesMap, setWeeklyFuturesMap] = useState(null) // addr -> weeklyVol
    const [futuresLoading, setFuturesLoading] = useState(false)

    // Points leaderboard state
    const [pointsLbPage, setPointsLbPage] = useState(1)
    const POINTS_PAGE_SIZE = 20

    const { data: profileData } = useUserProfile()
    const ownWallet = profileData?.profile?.own_wallet

    const WEEK1_START = new Date('2026-02-02T00:00:00Z')
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000

    // Dynamically compute current week from wall clock
    const getCurrentWeekNumber = () => {
        const now = Date.now()
        const elapsed = now - WEEK1_START.getTime()
        if (elapsed < 0) return 1
        return Math.floor(elapsed / WEEK_MS) + 1
    }

    const getWeekDateRange = (weekNum) => {
        const start = new Date(WEEK1_START.getTime() + (weekNum - 1) * WEEK_MS)
        const end = new Date(start.getTime() + WEEK_MS)
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
                // Week rolled over — reset countdown & reload data
                setTargetDate(getNextSaturday())
                setTimeLeft('DISTRIBUTING...')
                loadMeta()
                loadSpotSources()
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

    // Load meta + stats + spot data
    useEffect(() => {
        loadMeta()
        loadStats()
        loadSpotSources()
    }, [])

    // Load weekly futures data once we know the current week
    useEffect(() => {
        if (lbMeta) loadWeeklyFutures()
    }, [lbMeta])

    // Load reward estimate when wallet available
    useEffect(() => {
        if (ownWallet) loadRewardEstimate(ownWallet)
    }, [ownWallet])

    // ── Spot data sources (for points leaderboard) ──
    const loadSpotSources = async () => {
        setSpotDataLoading(true)
        try {
            // Load all-time from GitHub
            const allTimePromise = (async () => {
                const cached = globalCache.getSpotAllTimeData()
                if (cached) return cached
                const res = await fetch(SPOT_DATA_URL)
                const data = await res.json()
                globalCache.setSpotAllTimeData(data)
                return data
            })()

            // Load previous week snapshot from DB (prev week = current - 1)
            const prevWeek = getCurrentWeekNumber() - 1
            const snapshotPromise = (async () => {
                if (prevWeek < 1) return null
                const cached = globalCache.getSpotLocalData()
                if (cached) return cached
                const { data, error } = await supabase.rpc('get_spot_snapshot', { p_week: prevWeek })
                if (error) { console.error('Spot snapshot RPC error:', error); return null }
                if (data && Object.keys(data).length > 0) {
                    globalCache.setSpotLocalData(data)
                    return data
                }
                // Fallback to local file if no DB snapshot
                try {
                    const res = await fetch('/data/spot_vol_data.json')
                    if (!res.ok) return null
                    const fileData = await res.json()
                    globalCache.setSpotLocalData(fileData)
                    return fileData
                } catch { return null }
            })()

            const [allTimeRes, localRes] = await Promise.allSettled([allTimePromise, snapshotPromise])
            if (allTimeRes.status === 'fulfilled') setSpotAllTime(allTimeRes.value)
            if (localRes.status === 'fulfilled') setSpotLocal(localRes.value)
        } catch (err) {
            console.error('Failed to load spot sources:', err)
        }
        setSpotDataLoading(false)
    }

    // Load ALL weekly futures data (paginated RPC, same as leaderboard page uses)
    const loadWeeklyFutures = async () => {
        setFuturesLoading(true)
        try {
            const map = {}
            const pageSize = 1000
            let offset = 0
            let hasMore = true
            // Use week 0 (current/live) - same as leaderboard "current week" view
            while (hasMore) {
                const { data, error } = await supabase.rpc('get_weekly_leaderboard', {
                    p_week: 0,
                    p_sort: 'volume',
                    p_limit: pageSize,
                    p_offset: offset,
                    p_exclude_sodex: true
                })
                if (error) throw error
                if (!data || data.length === 0) { hasMore = false; break }
                for (const row of data) {
                    const vol = parseFloat(row.weekly_volume) || 0
                    if (vol > 0) {
                        map[row.wallet_address.toLowerCase()] = vol
                    }
                }
                if (data.length < pageSize) hasMore = false
                else offset += pageSize
            }
            setWeeklyFuturesMap(map)
        } catch (err) {
            console.error('Failed to load weekly futures:', err)
        }
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
                    .select('*', { count: 'exact', head: true })
                    .eq('week_number', w)
                    .gt('cumulative_volume', 0)
                    .not('is_sodex_owned', 'is', true)

                const { count: activeTraders } = await supabase
                    .from('leaderboard_weekly')
                    .select('*', { count: 'exact', head: true })
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
                .select('*')
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
                .select('*', { count: 'exact', head: true })
                .or('is_sodex_owned.is.null,is_sodex_owned.eq.false')

            const { count: traders } = await supabase
                .from('leaderboard')
                .select('*', { count: 'exact', head: true })
                .or('cumulative_pnl.neq.0,cumulative_volume.gt.0')
                .or('is_sodex_owned.is.null,is_sodex_owned.eq.false')

            const { count: activeTraders } = await supabase
                .from('leaderboard')
                .select('*', { count: 'exact', head: true })
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
        if (!spotAllTime) return null
        // Wait for futures data too (unless it failed)
        if (!weeklyFuturesMap && futuresLoading) return null

        // Build spot weekly diff map: allTime - local = week2 spot volume
        const spotWeeklyMap = {}
        for (const [addr, d] of Object.entries(spotAllTime)) {
            // Exclude sodex-owned wallets
            if (SODEX_SPOT_WALLETS.has(addr.toLowerCase())) continue
            const allTimeVol = d.vol || 0
            const localVol = spotLocal?.[addr]?.vol || spotLocal?.[addr.toLowerCase()]?.vol || 0
            const weeklySpot = Math.max(0, allTimeVol - localVol)
            spotWeeklyMap[addr.toLowerCase()] = { weeklySpot, allTimeSpot: allTimeVol, userId: d.userId, originalAddr: addr }
        }

        // Merge all wallets from both spot and futures (exclude sodex-owned)
        const allAddrs = new Set([
            ...Object.keys(spotWeeklyMap),
            ...(weeklyFuturesMap ? Object.keys(weeklyFuturesMap) : [])
        ])
        // Remove sodex wallets from merged set
        for (const sw of SODEX_SPOT_WALLETS) allAddrs.delete(sw)

        const entries = []
        for (const addr of allAddrs) {
            const spot = spotWeeklyMap[addr]
            const futuresVol = weeklyFuturesMap?.[addr] || 0
            const weeklySpot = spot?.weeklySpot || 0

            // Skip entries with zero everything
            if (weeklySpot === 0 && futuresVol === 0) continue

            entries.push({
                walletAddress: spot?.originalAddr || addr,
                userId: spot?.userId || '',
                weeklySpotVol: weeklySpot,
                allTimeSpotVol: spot?.allTimeSpot || 0,
                weeklyFuturesVol: futuresVol,
                weightedVolume: weeklySpot * SPOT_MULTIPLIER + futuresVol
            })
        }

        // Sort by weighted volume desc
        entries.sort((a, b) => b.weightedVolume - a.weightedVolume)

        // First pass: calculate preliminary points to identify <1 point users
        const totalWeighted = entries.reduce((sum, e) => sum + e.weightedVolume, 0)
        entries.forEach(e => {
            e.share = totalWeighted > 0 ? e.weightedVolume / totalWeighted : 0
            e.points = e.share * TOTAL_POOL
        })

        // Filter out users with <1 point, redistribute to qualified users
        const qualified = entries.filter(e => e.points >= 1)
        const qualifiedWeighted = qualified.reduce((sum, e) => sum + e.weightedVolume, 0)

        // Recalculate with only qualified users
        qualified.forEach((e, i) => {
            e.rank = i + 1
            e.share = qualifiedWeighted > 0 ? e.weightedVolume / qualifiedWeighted : 0
            e.points = Math.round(e.share * TOTAL_POOL)
        })

        return { entries: qualified, totalWeighted: qualifiedWeighted }
    }, [spotAllTime, spotLocal, weeklyFuturesMap, futuresLoading])

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
    // Use dynamic week calc so UI auto-updates even if DB cron hasn't run yet
    const currentWeekNum = getCurrentWeekNumber()

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
                    <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                            Week {currentWeekNum} Points Leaderboard
                        </h2>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                            {pointsLeaderboard.entries.length} traders · Spot {SPOT_MULTIPLIER}x weighted
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
        </div >
    )
}

export default SoPointsPage
