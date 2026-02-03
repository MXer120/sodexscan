'use client'

import React, { useState, useEffect } from 'react'
import '../styles/SoPoints.css'
import { supabase } from '../lib/supabaseClient'

const SoPointsPage = () => {
    const [timeLeft, setTimeLeft] = useState('')
    const [globalStats, setGlobalStats] = useState({
        totalUsers: 0,
        traders: 0,
        activeTraders: 0
    })
    const [showDiff, setShowDiff] = useState(false)
    const [loading, setLoading] = useState(true)

    // Target date logic: Feb 10, 2026 12:00:00 UTC (1 min later than before)
    const targetDate = new Date('2026-02-10T12:00:00Z').getTime()

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date().getTime()
            const distance = targetDate - now

            if (distance < 0) {
                setTimeLeft('DISTRIBUTED')
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

    const loadStats = async () => {
        setLoading(true)
        try {
            // 1. Total Users
            const { count: totalUsers } = await supabase
                .from('leaderboard')
                .select('*', { count: 'exact', head: true })
                .or('is_sodex_owned.is.null,is_sodex_owned.eq.false')

            // 2. Traders
            const { count: traders } = await supabase
                .from('leaderboard')
                .select('*', { count: 'exact', head: true })
                .or('cumulative_pnl.neq.0,cumulative_volume.gt.0')
                .or('is_sodex_owned.is.null,is_sodex_owned.eq.false')

            // 3. Active Traders
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

    useEffect(() => {
        loadStats()
    }, [])

    // Closed Alpha Baseline (Static Snapshot)
    const closedAlphaStats = {
        totalUsers: 4708,
        traders: 1800,
        activeTraders: 650,
        pool: '~1.000.000'
    }

    const formatNumber = (num) => {
        return num.toLocaleString('en-US')
    }

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
        // For Closed Alpha baseline display (when diff enabled for current week)
        // usually baseline rows just show their value or 0 diff?
        // Logic asked: "For Closed Alpha take 0 as a baseline everywhere."
        // So display is +Value.
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

        // Diff logic
        const baselineAvg = calcAvg(baselinePool, baselineTraders)
        return (
            <span className={currentAvg >= baselineAvg ? 'positive-diff' : 'negative-diff'}>
                {formatDiff(currentAvg, baselineAvg)}
            </span>
        )
    }


    return (
        <div className="sopoints-container">
            <div className="sopoints-header">
                {/* Week 1 Pool Card */}
                <div className="sopoints-card pool-card">
                    <div className="pool-label">Week 1 Reward Pool</div>
                    <div className="pool-amount" style={{ fontSize: '32px' }}>
                        1.000.000 <span style={{ color: 'var(--color-primary)' }}>SoPoints</span>
                    </div>
                    <div className="countdown-container">
                        <div className="countdown-label">Next Distribution in</div>
                        <div className="countdown-timer">
                            {timeLeft || 'Calculating...'}
                        </div>
                    </div>
                </div>

                {/* Join Sodex Card */}
                <div className="sopoints-card cta-card">
                    <div className="cta-boost">+5% Points Boost</div>
                    <div className="cta-text">Join the Sodex ecosystem and boost your rewards.</div>
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
                        {/* Week 1 Row (Current) */}
                        <tr>
                            <td>
                                <div className="week-cell">
                                    <span className="week-name">Week 1</span>
                                    <span className="week-dates">Jan 31 - Feb 10</span>
                                </div>
                            </td>
                            <td className="global-stats-value">
                                {loading ? '...' : renderValue(globalStats.totalUsers, closedAlphaStats.totalUsers)}
                            </td>
                            <td className="global-stats-value">
                                {loading ? '...' : renderValue(globalStats.traders, closedAlphaStats.traders)}
                            </td>
                            <td className="global-stats-value">
                                {loading ? '...' : renderValue(globalStats.activeTraders, closedAlphaStats.activeTraders)}
                            </td>
                            <td className="points-cell" style={{ color: 'var(--color-text-main)' }}>
                                {loading ? '...' : renderAvgReward(1000000, globalStats.traders, closedAlphaStats.pool, closedAlphaStats.traders)}
                            </td>
                            <td className="points-cell">1,000,000</td>
                        </tr>

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
                                    <span className="info-icon">ⓘ</span>
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
