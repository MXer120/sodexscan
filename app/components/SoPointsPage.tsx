'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import '../styles/SoPoints.css'
import { useUserProfile } from '../hooks/useProfile'
import Link from 'next/link'
import { SkeletonList, SkeletonBar } from './Skeleton'
import dynamic from 'next/dynamic'

const SoPointsEstimator = dynamic(() => import('./SoPointsEstimator'), { ssr: false })

// Spot volume multiplier (spot is harder to get, worth more)
const SPOT_MULTIPLIER = 2

const SoPointsPage = () => {
    const [showWarning, setShowWarning] = useState(true)
    const [timeLeft, setTimeLeft] = useState('')
    const [globalStats, setGlobalStats] = useState({
        totalUsers: 0,
        traders: 0,
        activeTraders: 0
    })
    const [showDiff, setShowDiff] = useState(false)
    const [loading, setLoading] = useState(true)

    // Static meta — leaderboard_meta table has been removed
    const lbMeta = { current_week_number: 1, pool_size: 1000000, total_user_counts: {} }

    // Weekly leaderboard data from official API (weekNum -> array of {wallet_address, volume_usd, rank, ...})
    const [weeklyLbData, setWeeklyLbData] = useState({}) // weekNum -> API result array
    const [weeklyLbLoading, setWeeklyLbLoading] = useState(false)

    // Volume chart state
    const [platformVolume, setPlatformVolume] = useState({ all: null, spot: null, futures: null })
    const [platformVolumeLoading, setPlatformVolumeLoading] = useState(false)
    const [chartFilter, setChartFilter] = useState('all')
    const [chartDataLoaded, setChartDataLoaded] = useState(false)
    const [spotWeight, setSpotWeight] = useState(2)

    // Volume chart zoom
    const [zoomRange, setZoomRange] = useState({ start: 0, end: null })
    const mouseRatioRef = useRef(0.5)
    const [legacyExpanded, setLegacyExpanded] = useState(false)
    const [activeTab, setActiveTab] = useState('overview')

    // Points leaderboard state
    const [selectedPointsWeek, setSelectedPointsWeek] = useState(null) // null = current week (set after meta loads)
    const [pointsLbPage, setPointsLbPage] = useState(1)
    const POINTS_PAGE_SIZE = 20

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
                setWeeklyLbData({})
                setChartDataLoaded(false)
                setSelectedPointsWeek(null)
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

    // Load stats on mount
    useEffect(() => {
        loadStats()
    }, [])

    const legacyVisible = activeTab === 'legacy'

    // Set default selected week + load data once meta + legacy tab active
    useEffect(() => {
        if (lbMeta && legacyVisible) {
            const week = selectedPointsWeek || lbMeta.current_week_number
            if (!selectedPointsWeek) setSelectedPointsWeek(week)
            loadPointsWeekData(week)
        }
    }, [lbMeta, legacyVisible])

    // When selected week changes, load its data (only if legacy tab active)
    useEffect(() => {
        if (selectedPointsWeek && lbMeta && legacyVisible) {
            setPointsLbPage(1)
            loadPointsWeekData(selectedPointsWeek)
        }
    }, [selectedPointsWeek])

    // Load all weeks data for chart + points LB when meta available
    useEffect(() => {
        if (lbMeta && !chartDataLoaded && (activeTab === 'overview' || activeTab === 'legacy')) {
            loadAllChartData(lbMeta.current_week_number)
        }
    }, [lbMeta, chartDataLoaded, activeTab])

    // ── Load leaderboard data from official API ──
    const loadWeeklyLb = async (weekNum) => {
        if (weeklyLbData[weekNum] !== undefined) return weeklyLbData[weekNum]
        try {
            const res = await fetch('/api/sodex-leaderboard?sort_by=volume&page_size=50&window_type=ALL_TIME')
            const json = await res.json()
            if (json?.code !== 0) throw new Error('API error')
            const rows = (json?.data?.items ?? []).map((item, i) => ({
                wallet_address: item.wallet_address,
                volume_usd: item.volume_usd,
                pnl_usd: item.pnl_usd,
                rank: item.rank ?? (i + 1),
            }))
            setWeeklyLbData(prev => ({ ...prev, [weekNum]: rows }))
            return rows
        } catch (err) {
            console.error('Failed to load leaderboard:', err)
            return []
        }
    }

    // ── Load platform volume from API (all / spot / futures) ──
    const loadPlatformVolume = async () => {
        setPlatformVolumeLoading(true)
        try {
            const today = new Date().toISOString().split('T')[0]
            const base = `https://mainnet-data.sodex.dev/api/v1/dashboard/volume?start_date=2024-01-01&end_date=${today}&market_type=`
            const [allRes, spotRes, futRes] = await Promise.all([
                fetch(base + 'all').then(r => r.json()),
                fetch(base + 'spot').then(r => r.json()),
                fetch(base + 'futures').then(r => r.json()),
            ])
            setPlatformVolume({ all: allRes, spot: spotRes, futures: futRes })
        } catch (err) {
            console.error('Failed to load platform volume:', err)
        }
        setPlatformVolumeLoading(false)
    }

    // ── Load all weeks data for the volume chart (sequential to avoid connection pool exhaustion) ──
    const loadAllChartData = async (currentWeek) => {
        try {
            // Load weekly LB data for each week: 0 = current live, 1..currentWeek-1 = frozen
            for (let w = 0; w < currentWeek; w++) {
                await loadWeeklyLb(w === 0 ? 0 : w)
            }
            setChartDataLoaded(true)
        } catch (err) {
            console.error('Failed to load chart data:', err)
            setChartDataLoaded(true) // prevent stuck state on error
        }
    }

    // ── Load all data needed for the selected points week ──
    const loadPointsWeekData = async (weekNum) => {
        if (!lbMeta) return
        setWeeklyLbLoading(true)
        const currentWeek = lbMeta.current_week_number
        const isLive = weekNum === currentWeek

        try {
            // Load the weekly LB: week 0 for live, weekNum for historical
            await loadWeeklyLb(isLive ? 0 : weekNum)
        } catch (err) {
            console.error('Failed to load points week data:', err)
        }
        setWeeklyLbLoading(false)
    }

    const loadStats = async () => {
        setLoading(true)
        // Global stats from leaderboard table are no longer available.
        // Use placeholder values.
        setGlobalStats({ totalUsers: 0, traders: 0, activeTraders: 0 })
        setLoading(false)
    }

    // ── Points Leaderboard: use official API data (volume-based ranking) ──
    const pointsLeaderboard = useMemo(() => {
        if (!selectedPointsWeek) return null
        const weekKey = 0 // always use the single cached result

        const rows = weeklyLbData[weekKey]
        if (!rows && weeklyLbLoading) return null
        if (!rows) return null

        const entries = rows
            .filter(row => parseFloat(row.volume_usd) > 0)
            .map((row, i) => ({
                walletAddress: row.wallet_address,
                rank: row.rank ?? (i + 1),
                volume: parseFloat(row.volume_usd) || 0,
            }))

        return { entries }
    }, [weeklyLbData, weeklyLbLoading, selectedPointsWeek])

    // Find user's position in points LB
    const userPointsEntry = useMemo(() => {
        if (!pointsLeaderboard || !ownWallet) return null
        return pointsLeaderboard.entries.find(e => e.walletAddress?.toLowerCase() === ownWallet.toLowerCase()) ?? null
    }, [pointsLeaderboard, ownWallet])

    // ── Volume chart data (all-time, single data point from official API) ──
    const volumeChartData = useMemo(() => {
        const walletLow = ownWallet?.toLowerCase()
        const rows = weeklyLbData[0]
        if (!rows) return []

        let userVol = 0
        let totalPlatformVol = 0
        for (const r of rows) {
            const v = parseFloat(r.volume_usd) || 0
            totalPlatformVol += v
            if (walletLow && r.wallet_address?.toLowerCase() === walletLow) {
                userVol = v
            }
        }

        const competitiveness = totalPlatformVol > 0 ? (userVol / totalPlatformVol) * 100 : 0
        return [{ week: 'All-time', weekLabel: 'All-time Volume', userVol, userWeightedVol: userVol, competitiveness }]
    }, [weeklyLbData, ownWallet])

    const visibleChartData = useMemo(() => {
        if (!volumeChartData.length) return volumeChartData
        const end = zoomRange.end ?? volumeChartData.length
        return volumeChartData.slice(zoomRange.start, end)
    }, [volumeChartData, zoomRange])

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

    const poolSize = 1000000
    const currentWeekNum = 1

    // Truncate address
    const truncAddr = (addr) => {
        if (!addr || addr.length < 12) return addr
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`
    }

    return (
        <div className="sopoints-container">
            {/* ─── Tab Switcher ─── */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
                {[
                    { key: 'overview', label: 'Overview' },
                    { key: 'estimator', label: 'SoPoint Leaderboard (Est)' },
                    { key: 'legacy', label: 'Legacy' },
                ].map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                        padding: '8px 18px', borderRadius: '8px',
                        border: '1px solid var(--color-border-subtle)',
                        background: activeTab === tab.key ? 'var(--color-primary)' : 'transparent',
                        color: activeTab === tab.key ? '#fff' : 'var(--color-text-secondary)',
                        fontSize: '14px', cursor: 'pointer',
                        fontWeight: activeTab === tab.key ? 600 : 400, transition: 'all 0.15s'
                    }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ─── Estimator Tab ─── */}
            {activeTab === 'estimator' && <SoPointsEstimator />}

            {/* ─── Overview Tab ─── */}
            {activeTab === 'overview' && <>
            <div style={{
              fontSize: '12px', color: '#f59e0b', marginBottom: '16px',
              padding: '8px 12px', borderRadius: '6px',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" style={{ flexShrink: 0 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              This page is no longer maintained. Data may be outdated or inaccurate.
            </div>
            {/* ─── Volume Chart ─── */}
            <div className="sopoints-table-container"
                style={{ marginBottom: '24px', padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Weekly Volume</h2>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Market filter */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {['all', 'spot', 'futures'].map(f => (
                                <button key={f} onClick={() => setChartFilter(f)} style={{
                                    padding: '4px 12px', borderRadius: '6px',
                                    border: '1px solid var(--color-border-subtle)',
                                    background: chartFilter === f ? 'var(--color-primary)' : 'transparent',
                                    color: chartFilter === f ? '#fff' : 'var(--color-text-secondary)',
                                    fontSize: '12px', cursor: 'pointer',
                                    fontWeight: chartFilter === f ? 600 : 400, transition: 'all 0.15s'
                                }}>
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                        {/* Spot weight */}
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>Spot Weight:</span>
                            {[1, 1.5, 2, 3, 5].map(w => (
                                <button key={w} onClick={() => setSpotWeight(w)} style={{
                                    padding: '4px 8px', borderRadius: '6px',
                                    border: '1px solid var(--color-border-subtle)',
                                    background: spotWeight === w ? 'var(--color-primary)' : 'transparent',
                                    color: spotWeight === w ? '#fff' : 'var(--color-text-secondary)',
                                    fontSize: '11px', cursor: 'pointer',
                                    fontWeight: spotWeight === w ? 600 : 400, transition: 'all 0.15s'
                                }}>
                                    {w}x
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                {!ownWallet ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                        Connect your wallet in <a href="/profile" style={{ color: 'var(--color-primary)' }}>Profile</a> to see your weekly volume chart
                    </div>
                ) : !chartDataLoaded ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                        <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            border: '2.5px solid var(--color-overlay-medium)',
                            borderTopColor: 'var(--color-primary)',
                            animation: 'spin 0.7s linear infinite'
                        }} />
                    </div>
                ) : (
                    <>
                        <div
                            style={{ touchAction: 'none' }}
                            onMouseMove={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect()
                                mouseRatioRef.current = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
                            }}
                            onWheel={(e) => {
                                e.preventDefault()
                                const total = volumeChartData.length
                                if (total <= 2) return
                                const ratio = mouseRatioRef.current
                                setZoomRange(prev => {
                                    const start = prev.start
                                    const end = prev.end ?? total
                                    const range = end - start
                                    const newRange = e.deltaY < 0 ? range - 2 : range + 2
                                    if (newRange < 2 || (e.deltaY > 0 && start === 0 && end >= total)) return prev
                                    const pivotIndex = start + ratio * range
                                    let newStart = Math.round(pivotIndex - ratio * newRange)
                                    let newEnd = newStart + newRange
                                    if (newEnd > total) { newEnd = total; newStart = newEnd - newRange }
                                    if (newStart < 0) { newStart = 0; newEnd = Math.min(total, newRange) }
                                    return { start: newStart, end: newEnd }
                                })
                            }}
                        >
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={visibleChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" opacity={0.5} />
                                <XAxis dataKey="week" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="vol" tickFormatter={v => '$' + formatVol(v)} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                                <YAxis yAxisId="pct" orientation="right" tickFormatter={v => v.toFixed(2) + '%'} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
                                <Tooltip
                                    content={({ active, payload, label }) => {
                                        if (!active || !payload?.length) return null
                                        const d = visibleChartData.find(x => x.week === label)
                                        return (
                                            <div style={{ background: 'var(--color-bg-modal)', border: '1px solid var(--color-border-subtle)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px' }}>
                                                <div style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-main)' }}>{d?.weekLabel || label}</div>
                                                {payload.map((p, i) => (
                                                    <div key={i} style={{ color: p.color, marginBottom: '2px' }}>
                                                        {p.name}: <strong>{p.dataKey === 'competitiveness' ? Number(p.value).toFixed(4) + '%' : '$' + formatVol(Number(p.value))}</strong>
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    }}
                                />
                                <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--color-text-secondary)' }} />
                                <Line yAxisId="vol" type="monotone" dataKey="userVol" name="Your Volume"
                                    stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 4, fill: 'var(--color-primary)' }} connectNulls activeDot={{ r: 6 }} />
                                {chartFilter === 'all' && spotWeight > 1 && (
                                    <Line yAxisId="vol" type="monotone" dataKey="userWeightedVol" name={`Weighted Volume (${spotWeight}x spot)`}
                                        stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} connectNulls activeDot={{ r: 6 }} />
                                )}
                                <Line yAxisId="pct" type="monotone" dataKey="competitiveness" name="Vol. Share %"
                                    stroke="#f59e0b" strokeWidth={1.5} dot={{ r: 3, fill: '#f59e0b' }} connectNulls activeDot={{ r: 5 }} strokeDasharray="4 2" />
                            </LineChart>
                        </ResponsiveContainer>
                        </div>
                    </>
                )}
            </div>

            <div className="sopoints-card pool-card" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                    <div>
                        <div className="pool-label">Week {currentWeekNum} Reward Pool</div>
                        <div className="pool-amount" style={{ fontSize: '32px' }}>
                            {formatNumber(poolSize)} <span style={{ color: 'var(--color-primary)' }}>SoPoints</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                            Spot volume weighted {SPOT_MULTIPLIER}x vs futures
                        </div>
                    </div>
                    <div className="countdown-container" style={{ textAlign: 'right' }}>
                        <div className="countdown-label">Next Snapshot in</div>
                        <div className="countdown-timer">
                            {timeLeft || 'Calculating...'}
                        </div>
                    </div>
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
                        {/* Current Week Row (Live) */}
                        <tr>
                            <td>
                                <div className="week-cell">
                                    <span className="week-name">Week {currentWeekNum} <span style={{ color: 'var(--color-primary)', fontSize: '11px' }}>LIVE</span></span>
                                    <span className="week-dates">Ongoing</span>
                                </div>
                            </td>
                            <td className="global-stats-value">—</td>
                            <td className="global-stats-value">—</td>
                            <td className="global-stats-value">—</td>
                            <td className="points-cell" style={{ color: 'var(--color-text-main)' }}>—</td>
                            <td className="points-cell">{formatNumber(poolSize)}</td>
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
                                {renderAvgReward(closedAlphaStats.pool, closedAlphaStats.traders, closedAlphaStats.pool, closedAlphaStats.traders)}
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

            </>}

            {/* ─── Legacy Tab ─── */}
            {activeTab === 'legacy' && (
                <div>
                    <div style={{
                      fontSize: '12px', color: '#f59e0b', marginBottom: '16px',
                      padding: '8px 12px', borderRadius: '6px',
                      background: 'rgba(245, 158, 11, 0.08)',
                      border: '1px solid rgba(245, 158, 11, 0.2)',
                      display: 'flex', alignItems: 'center', gap: '8px'
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" style={{ flexShrink: 0 }}>
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      This page is no longer maintained. Data may be outdated or inaccurate.
                    </div>
                        {/* Estimated Reward */}
                        {ownWallet ? (
                            <div className="sopoints-card cta-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: '24px' }}>
                                <div className="pool-label" style={{ marginBottom: '8px' }}>Your Position</div>
                                {weeklyLbLoading ? (
                                    <div className="pool-amount" style={{ fontSize: '28px' }}>
                                        <SkeletonBar width={60} height={12} style={{ display: 'inline-block' }} />
                                    </div>
                                ) : userPointsEntry ? (
                                    <div style={{ marginTop: '4px', display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
                                        <span>Rank: #{userPointsEntry.rank}</span>
                                        <span>Volume: ${formatVol(userPointsEntry.volume)}</span>
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                                        Not found in top 50 leaderboard
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="sopoints-card cta-card" style={{ marginBottom: '24px' }}>
                                <div className="cta-boost">+5% Points Boost</div>
                                <div className="cta-text">Connect your wallet in <Link href="/profile" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Profile</Link> to see your estimated reward.</div>
                                <a href="https://sodex.com/join/SOSO" target="_blank" rel="noopener noreferrer" className="join-btn">
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

                        {/* Points Leaderboard */}
                        {pointsLeaderboard && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Volume Leaderboard</h2>
                                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                        {pointsLeaderboard.entries.length} traders · All-time volume
                                    </span>
                                </div>
                                <table className="sopoints-table points-lb-table">
                                    <thead>
                                        <tr>
                                            <th>Rank</th>
                                            <th>Wallet</th>
                                            <th style={{ textAlign: 'right' }}>Volume</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pointsLeaderboard.entries
                                            .slice((pointsLbPage - 1) * POINTS_PAGE_SIZE, pointsLbPage * POINTS_PAGE_SIZE)
                                            .map((entry) => {
                                                const isUser = ownWallet && entry.walletAddress?.toLowerCase() === ownWallet.toLowerCase()
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
                                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>${formatVol(entry.volume)}</td>
                                                    </tr>
                                                )
                                            })}
                                    </tbody>
                                </table>
                                {pointsLeaderboard.entries.length > POINTS_PAGE_SIZE && (
                                    <div style={{ padding: '12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border-subtle)', marginTop: '4px' }}>
                                        <button className="points-lb-page-btn" onClick={() => setPointsLbPage(p => Math.max(1, p - 1))} disabled={pointsLbPage === 1}>&lt; Prev</button>
                                        <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Page {pointsLbPage} of {Math.ceil(pointsLeaderboard.entries.length / POINTS_PAGE_SIZE)}</span>
                                        <button className="points-lb-page-btn" onClick={() => setPointsLbPage(p => Math.min(Math.ceil(pointsLeaderboard.entries.length / POINTS_PAGE_SIZE), p + 1))} disabled={pointsLbPage >= Math.ceil(pointsLeaderboard.entries.length / POINTS_PAGE_SIZE)}>Next &gt;</button>
                                    </div>
                                )}
                                <div style={{ paddingTop: '8px', textAlign: 'center', fontSize: '11px', color: '#666' }}>
                                    Spot data by <a href="https://x.com/eliasing__" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>@eliasing__</a>
                                </div>
                            </div>
                        )}
                        {!pointsLeaderboard && (
                            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
                                {weeklyLbLoading ? (
                                    <SkeletonList items={8} />
                                ) : (
                                    <span>No leaderboard data for this week. Data may still be syncing.</span>
                                )}
                            </div>
                        )}
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
                <WarningModal onClose={() => setShowWarning(false)} />
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

function WarningModal({ onClose }) {
  const accentColor = '#f26b1f'
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
                    background: 'var(--color-bg-secondary)',
                    border: `1px solid ${accentColor}33`,
                    borderRadius: '24px',
                    width: '100%',
                    maxWidth: '440px',
                    boxShadow: `0 24px 80px rgba(0,0,0,0.9), 0 0 40px ${accentColor}11`,
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
                    background: accentColor,
                    filter: 'blur(70px)',
                    opacity: 0.15,
                    pointerEvents: 'none'
                }} />

                <div style={{ padding: '40px 32px', textAlign: 'center' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: `${accentColor}15`,
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 24px',
                        border: `1px solid ${accentColor}33`
                    }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                    </div>

                    <h2 style={{
                        fontSize: '24px',
                        fontWeight: '800',
                        color: 'var(--color-text-main)',
                        marginBottom: '16px',
                        letterSpacing: '-0.02em'
                    }}>
                        Information & Disclaimer
                    </h2>

                    <p style={{
                        fontSize: '15px',
                        lineHeight: '1.6',
                        color: 'var(--color-text-secondary)',
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
                            background: accentColor,
                            color: '#000',
                            border: 'none',
                            borderRadius: '14px',
                            padding: '16px',
                            fontSize: '15px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: `0 8px 24px ${accentColor}44`
                        }}
                        onMouseOver={e => {
                            e.currentTarget.style.transform = 'translateY(-2px)'
                            e.currentTarget.style.boxShadow = `0 12px 28px ${accentColor}66`
                        }}
                        onMouseOut={e => {
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.boxShadow = `0 8px 24px ${accentColor}44`
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
