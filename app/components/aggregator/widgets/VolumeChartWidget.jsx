'use client'
import { useState, useEffect, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { supabase } from '../../../lib/supabaseClient'
import { useUserProfile } from '../../../hooks/useProfile'
import { useLeaderboardMeta } from '../../../hooks/useLeaderboardMeta'

const BROKEN_SPOT_WEEK = 4
const WEEK1_START = new Date('2026-02-02T00:00:00Z')
const WEEK_DURATION = 7 * 24 * 60 * 60 * 1000

const formatVol = (num) => {
    const absNum = Math.abs(num)
    if (absNum >= 1000000) return `${(absNum / 1000000).toFixed(2)}M`
    if (absNum >= 1000) return `${(absNum / 1000).toFixed(1)}K`
    return absNum.toFixed(0)
}

const getWeekDateRange = (weekNum) => {
    const start = new Date(WEEK1_START.getTime() + (weekNum - 1) * WEEK_DURATION)
    const end = new Date(start.getTime() + WEEK_DURATION)
    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    return `${fmt(start)} - ${fmt(end)}`
}

export default function VolumeChartWidget({ config, onUpdateConfig }) {
    const { data: profileData } = useUserProfile()
    const ownWallet = profileData?.profile?.own_wallet
    const { data: lbMeta } = useLeaderboardMeta()

    const [platformVolume, setPlatformVolume] = useState({ all: null, spot: null, futures: null })
    const [platformVolumeLoading, setPlatformVolumeLoading] = useState(false)
    const [chartFilter, setChartFilter] = useState('all')
    const [spotWeight, setSpotWeight] = useState(2)
    const [zoomRange, setZoomRange] = useState({ start: 0, end: null })

    const [userWeeklyData, setUserWeeklyData] = useState({})
    const [futuresDataByWeek, setFuturesDataByWeek] = useState({})
    const [chartDataLoaded, setChartDataLoaded] = useState(false)

    // Load platform volume on mount
    useEffect(() => {
        ;(async () => {
            setPlatformVolumeLoading(true)
            try {
                const endDate = new Date().toISOString().slice(0, 10)
                const base = `https://mainnet-data.sodex.dev/api/v1/dashboard/volume?start_date=2024-01-01&end_date=${endDate}&market_type=`
                const [allRes, spotRes, futRes] = await Promise.all([
                    fetch(base + 'all').then(r => r.json()).catch(() => null),
                    fetch(base + 'spot').then(r => r.json()).catch(() => null),
                    fetch(base + 'futures').then(r => r.json()).catch(() => null),
                ])
                setPlatformVolume({ all: allRes, spot: spotRes, futures: futRes })
            } catch (err) {
                console.error('VolumeChartWidget: platform volume fetch failed, using empty data', err)
                setPlatformVolume({ all: null, spot: null, futures: null })
            }
            setPlatformVolumeLoading(false)
        })()
    }, [])

    // Load all chart data once we have wallet + meta
    useEffect(() => {
        if (!ownWallet || !lbMeta || chartDataLoaded) return
        const currentWeek = lbMeta.current_week_number
        const walletLow = ownWallet.toLowerCase()
        ;(async () => {
            try {
                // Fetch user's weekly data from leaderboard_weekly
                const [userWeeklyRes, futRes] = await Promise.all([
                    supabase
                        .from('leaderboard_weekly')
                        .select('week_number, sodex_total_volume, cumulative_volume')
                        .eq('wallet_address', walletLow)
                        .lte('week_number', currentWeek),
                    supabase.rpc('get_all_futures_volume_maps', { p_max_week: currentWeek - 1, p_exclude_sodex: true })
                ])

                // Build user weekly data map: { weekNum: { spot, futures } }
                // week_number=0 is live data → map it to currentWeek
                const weeklyMap = {}
                if (userWeeklyRes.data) {
                    for (const row of userWeeklyRes.data) {
                        const sodexVol = parseFloat(row.sodex_total_volume) || 0
                        const futVol = parseFloat(row.cumulative_volume) || 0
                        const key = row.week_number === 0 ? currentWeek : row.week_number
                        weeklyMap[key] = {
                            spot: Math.max(sodexVol - futVol, 0),
                            futures: futVol
                        }
                    }
                }
                setUserWeeklyData(weeklyMap)
                setFuturesDataByWeek(futRes.data && typeof futRes.data === 'object' ? futRes.data : {})
                setChartDataLoaded(true)
            } catch (err) {
                console.error('VolumeChartWidget: chart data error', err)
            }
        })()
    }, [ownWallet, lbMeta, chartDataLoaded])

    const volumeChartData = useMemo(() => {
        if (!lbMeta) return []
        const currentWeek = lbMeta.current_week_number
        const platformRaw = chartFilter === 'spot' ? platformVolume.spot
            : chartFilter === 'futures' ? platformVolume.futures
            : platformVolume.all

        const extractArr = (d) => {
            if (!d) return []
            if (Array.isArray(d)) return d
            if (d.data?.data && Array.isArray(d.data.data)) return d.data.data
            if (d.data && Array.isArray(d.data)) return d.data
            return []
        }

        const getCumVolAtDate = (arr, targetDate) => {
            const targetMs = targetDate.getTime()
            let best = null
            let bestMs = -Infinity
            for (const p of arr) {
                const ms = p.timestamp ?? new Date(p.day_date || p.date || p.time).getTime()
                if (!ms || isNaN(ms)) continue
                if (ms <= targetMs && ms > bestMs) { best = p; bestMs = ms }
            }
            return best ? parseFloat(best.cumulative ?? best.cumulative_volume ?? best.total ?? 0) : 0
        }

        const platformArr = extractArr(platformRaw)
        const walletLow = ownWallet?.toLowerCase()

        return Array.from({ length: currentWeek }, (_, i) => {
            const w = i + 1
            const isLive = w === currentWeek

            // User spot volume from DB weekly data
            let userSpotVol = 0
            let userFuturesVol = 0

            if (w === BROKEN_SPOT_WEEK) {
                userSpotVol = 0
            } else if (walletLow && userWeeklyData[w]) {
                userSpotVol = userWeeklyData[w].spot || 0
            }

            // For futures: use the per-week futures map for historical, or DB weekly data for live
            if (walletLow) {
                if (isLive && userWeeklyData[w]) {
                    userFuturesVol = userWeeklyData[w].futures || 0
                } else {
                    const weekFutures = futuresDataByWeek[w]
                    userFuturesVol = weekFutures ? (weekFutures[walletLow] || 0) : 0
                }
            }

            const userVol = chartFilter === 'spot' ? userSpotVol
                : chartFilter === 'futures' ? userFuturesVol
                : userSpotVol + userFuturesVol

            const weekEnd = new Date(WEEK1_START.getTime() + w * WEEK_DURATION)
            let platformVol = 0
            if (w !== BROKEN_SPOT_WEEK) {
                const platformStart = w === BROKEN_SPOT_WEEK + 1
                    ? new Date(WEEK1_START.getTime() + (BROKEN_SPOT_WEEK - 1) * WEEK_DURATION)
                    : new Date(WEEK1_START.getTime() + (w - 1) * WEEK_DURATION)
                platformVol = Math.max(0, getCumVolAtDate(platformArr, weekEnd) - getCumVolAtDate(platformArr, platformStart))
            }

            const userWeightedVol = userSpotVol * spotWeight + userFuturesVol
            const actualCompetitiveness = platformVol > 0 ? (userVol / platformVol) * 100 : 0

            return {
                week: `W${w}`,
                weekLabel: getWeekDateRange(w),
                userVol,
                userWeightedVol,
                platformVol,
                actualCompetitiveness,
                brokenSpot: w === BROKEN_SPOT_WEEK
            }
        })
    }, [lbMeta, platformVolume, chartFilter, futuresDataByWeek, userWeeklyData, ownWallet, spotWeight])

    const visibleChartData = useMemo(() => {
        if (!volumeChartData.length) return volumeChartData
        const end = zoomRange.end ?? volumeChartData.length
        return volumeChartData.slice(zoomRange.start, end)
    }, [volumeChartData, zoomRange])

    if (platformVolumeLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', fontSize: 13 }}>
                Loading chart...
            </div>
        )
    }

    return (
        <div
            onWheel={(e) => {
                e.preventDefault()
                const total = volumeChartData.length
                if (total <= 2) return
                setZoomRange(prev => {
                    const start = prev.start
                    const end = prev.end ?? total
                    const range = end - start
                    if (e.deltaY < 0) {
                        if (range <= 2) return prev
                        return { start: Math.min(start + 1, end - 2), end: Math.max(end - 1, start + 2) }
                    }
                    if (start === 0 && end >= total) return prev
                    return { start: Math.max(0, start - 1), end: Math.min(total, end + 1) }
                })
            }}
            style={{ touchAction: 'none', height: '100%', display: 'flex', flexDirection: 'column', padding: '12px 16px', boxSizing: 'border-box' }}
        >
            {/* Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                    {['all', 'spot', 'futures'].map(f => (
                        <button key={f} onClick={() => setChartFilter(f)} style={{
                            padding: '3px 10px', borderRadius: '6px',
                            border: '1px solid var(--color-border-subtle)',
                            background: chartFilter === f ? 'var(--color-primary)' : 'transparent',
                            color: chartFilter === f ? '#fff' : 'var(--color-text-secondary)',
                            fontSize: '11px', cursor: 'pointer',
                            fontWeight: chartFilter === f ? 600 : 400
                        }}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>Spot:</span>
                    {[1, 1.5, 2, 3, 5].map(w => (
                        <button key={w} onClick={() => setSpotWeight(w)} style={{
                            padding: '3px 6px', borderRadius: '6px',
                            border: '1px solid var(--color-border-subtle)',
                            background: spotWeight === w ? 'var(--color-primary)' : 'transparent',
                            color: spotWeight === w ? '#fff' : 'var(--color-text-secondary)',
                            fontSize: '10px', cursor: 'pointer',
                            fontWeight: spotWeight === w ? 600 : 400
                        }}>
                            {w}x
                        </button>
                    ))}
                </div>
            </div>

            {/* Amber notice for broken spot week */}
            {volumeChartData.some(d => d.brokenSpot) && chartFilter !== 'futures' && (
                <div style={{ fontSize: '11px', color: '#f59e0b', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '6px', padding: '4px 10px', marginBottom: '8px' }}>
                    &#9888; Spot data for W{BROKEN_SPOT_WEEK} was not recorded correctly — spot volume is $0 for that week and included in W{BROKEN_SPOT_WEEK + 1}.
                </div>
            )}

            {/* Chart */}
            <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={visibleChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" opacity={0.5} />
                        <XAxis dataKey="week" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="vol" tickFormatter={v => '$' + formatVol(v)} tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={55} />
                        <YAxis yAxisId="pct" orientation="right" tickFormatter={v => v.toFixed(2) + '%'} tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null
                                const d = visibleChartData.find(x => x.week === label)
                                return (
                                    <div style={{ background: 'var(--color-bg-modal)', border: '1px solid var(--color-border-subtle)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px' }}>
                                        <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--color-text-main)' }}>{d?.weekLabel || label}</div>
                                        {payload.map((p, i) => (
                                            <div key={i} style={{ color: p.color, marginBottom: '2px' }}>
                                                {p.name}: <strong>{p.dataKey === 'actualCompetitiveness' ? p.value.toFixed(4) + '%' : '$' + formatVol(p.value)}</strong>
                                            </div>
                                        ))}
                                    </div>
                                )
                            }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--color-text-secondary)' }} />
                        {ownWallet && (
                            <Line yAxisId="vol" type="monotone" dataKey="userVol" name="Your Volume"
                                stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-primary)' }} connectNulls activeDot={{ r: 5 }} />
                        )}
                        {ownWallet && chartFilter === 'all' && spotWeight > 1 && (
                            <Line yAxisId="vol" type="monotone" dataKey="userWeightedVol" name={`Weighted Volume (${spotWeight}x spot)`}
                                stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} connectNulls activeDot={{ r: 5 }} />
                        )}
                        {ownWallet && (
                            <Line yAxisId="pct" type="monotone" dataKey="actualCompetitiveness" name="Actual Competitiveness"
                                stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3, fill: '#6366f1' }} connectNulls activeDot={{ r: 5 }} />
                        )}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {!ownWallet && (
                <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                    Connect your wallet in <a href="/profile" style={{ color: 'var(--color-primary)' }}>Profile</a> to see your volume lines
                </div>
            )}
        </div>
    )
}
