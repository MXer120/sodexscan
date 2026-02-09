'use client'

import React, { useState, useEffect } from 'react'
import '../styles/SoPoints.css'
import { supabase } from '../lib/supabaseClient'
import { useUserProfile } from '../hooks/useProfile'
import { globalCache } from '../lib/globalCache'
import Link from 'next/link'

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
    const [weeklyStats, setWeeklyStats] = useState({}) // { weekNum: { traders, totalUsers, activeTraders } }
    const [totalUserCounts, setTotalUserCounts] = useState({}) // { "1": 22189, ... }

    const { data: profileData } = useUserProfile()
    const ownWallet = profileData?.profile?.own_wallet

    // Week 1 ended at Feb 9 00:00 UTC (snapshot), Week 2 started Feb 9 00:00 UTC
    // So Week 1 started Feb 2, Week 2 = Feb 9, Week 3 = Feb 16, etc.
    const WEEK1_START = new Date('2026-02-02T00:00:00Z')

    const getWeekDateRange = (weekNum) => {
        const start = new Date(WEEK1_START.getTime() + (weekNum - 1) * 7 * 24 * 60 * 60 * 1000)
        const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
        const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
        return `${fmt(start)} - ${fmt(end)}`
    }

    // Next Monday 00:00 UTC countdown
    const getNextMonday = () => {
        const now = new Date()
        const day = now.getUTCDay()
        const daysUntilMonday = day === 0 ? 1 : (8 - day)
        const next = new Date(now)
        next.setUTCDate(now.getUTCDate() + daysUntilMonday)
        next.setUTCHours(0, 0, 0, 0)
        return next.getTime()
    }

    const [targetDate] = useState(() => getNextMonday())

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date().getTime()
            const distance = targetDate - now

            if (distance < 0) {
                setTimeLeft('DISTRIBUTING...')
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

    // Load meta + stats
    useEffect(() => {
        loadMeta()
        loadStats()
    }, [])

    // Load reward estimate when wallet available
    useEffect(() => {
        if (ownWallet) loadRewardEstimate(ownWallet)
    }, [ownWallet])

    // Load per-week trader counts for frozen weeks (after meta + totalUserCounts loaded)
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

                // Total users from stored snapshot counts (captured at freeze time)
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

    const poolSize = lbMeta?.pool_size ? parseFloat(lbMeta.pool_size) : 1000000
    const currentWeekNum = lbMeta?.current_week_number || 1

    // Get previous week's stats for diff calculation
    // Week 1 compares vs Closed Alpha, Week N compares vs Week N-1
    const getPrevStats = (weekNum) => {
        if (weekNum <= 1) return closedAlphaStats
        const prev = weeklyStats[weekNum - 1]
        if (prev) return prev
        return { totalUsers: 0, traders: 0, activeTraders: 0 }
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
                        {rewardLoading ? (
                            <div className="pool-amount" style={{ fontSize: '28px' }}>...</div>
                        ) : rewardEstimate?.found ? (
                            <>
                                <div className="pool-amount" style={{ fontSize: '28px' }}>
                                    ~{formatSoPoints(rewardEstimate.estimated_reward)} <span style={{ color: 'var(--color-primary)', fontSize: '18px' }}>SoPoints</span>
                                </div>
                                <div style={{ marginTop: '12px', display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                                    <span>Vol: ${parseFloat(rewardEstimate.weekly_volume || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                                    <span>Share: {rewardEstimate.total_weekly_volume > 0
                                        ? ((parseFloat(rewardEstimate.weekly_volume) / parseFloat(rewardEstimate.total_weekly_volume)) * 100).toFixed(2)
                                        : '0.00'}%</span>
                                    <span>Rank: #{rewardEstimate.volume_rank || '-'}</span>
                                </div>
                            </>
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
                        {/* Current Week Row (Live) — diff vs previous frozen week or closed alpha */}
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

                        {/* Frozen Week Rows (reverse chronological) — diff vs previous week */}
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

                        {/* Closed Alpha Row — no diff (baseline) */}
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
      `}</style>
        </div >
    )
}

export default SoPointsPage
