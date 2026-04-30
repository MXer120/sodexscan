'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { LUT_RANKS, LUT_POINTS, estimatePoints, MODEL_FORMULA, MODEL_DESC, DATA_POINTS_COUNT } from '../lib/soPointsEstimatorData'

// Downsample curve data for charts (every 3rd point to keep ~200 points)
const CURVE_DATA = LUT_RANKS.map((r, i) => ({ rank: r, points: LUT_POINTS[i] }))
const SAMPLED = CURVE_DATA.filter((_, i) => i % 3 === 0 || i === CURVE_DATA.length - 1)

const CHART_VIEWS = [
    { key: 'logY', label: 'Log Y-Axis', yScale: 'log', xScale: 'linear' },
    { key: 'loglog', label: 'Log-Log', yScale: 'log', xScale: 'log' },
    { key: 'linear', label: 'Linear Scale', yScale: 'linear', xScale: 'linear', defaultMinRank: 26 },
]

const fmtNum = (v) => {
    if (v >= 1000) return (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k'
    return v.toLocaleString()
}

export default function SoPointsEstimator() {
    const [lookupRank, setLookupRank] = useState('1000')
    const [activeChart, setActiveChart] = useState('logY')
    const [showFromTop, setShowFromTop] = useState(false)

    const lookupResult = useMemo(() => {
        const r = parseInt(lookupRank)
        if (r >= 1 && r <= 50000) return Math.round(estimatePoints(r))
        return null
    }, [lookupRank])

    const chartView = CHART_VIEWS.find(v => v.key === activeChart)

    const chartData = useMemo(() => {
        const minRank = showFromTop ? 10 : (chartView.defaultMinRank || 10)
        return SAMPLED.filter(d => d.rank >= minRank)
    }, [activeChart, showFromTop, chartView])

    const CustomTooltip = useCallback(({ active, payload }: { active?: boolean; payload?: any[] }) => {
        if (!active || !payload?.[0]) return null
        const d = payload[0].payload
        return (
            <div style={{
                background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)',
                borderRadius: '6px', padding: '8px 12px', fontSize: '13px'
            }}>
                <div>Rank #{d.rank.toLocaleString()}</div>
                <div style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                    ~{Math.round(d.points).toLocaleString()} SoPoints
                </div>
            </div>
        )
    }, [])

    return (
        <div>
            {/* Chart view toggle + show from #10 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                    {CHART_VIEWS.map(v => (
                        <button key={v.key} onClick={() => setActiveChart(v.key)} style={{
                            padding: '6px 14px', borderRadius: '6px',
                            border: '1px solid var(--color-border-subtle)',
                            background: activeChart === v.key ? 'var(--color-primary)' : 'transparent',
                            color: activeChart === v.key ? '#fff' : 'var(--color-text-secondary)',
                            fontSize: '13px', cursor: 'pointer',
                            fontWeight: activeChart === v.key ? 600 : 400, transition: 'all 0.15s'
                        }}>
                            {v.label}
                        </button>
                    ))}
                </div>
                <button onClick={() => setShowFromTop(v => !v)} style={{
                    padding: '4px 12px', borderRadius: '6px',
                    border: '1px solid var(--color-border-subtle)',
                    background: showFromTop ? 'var(--color-primary)' : 'transparent',
                    color: showFromTop ? '#fff' : 'var(--color-text-muted)',
                    fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s'
                }}>
                    {showFromTop ? 'From #10' : 'Show from #10'}
                </button>
            </div>

            {/* Chart */}
            <div className="sopoints-table-container" style={{ padding: '16px', marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600 }}>
                    SoPoints vs Rank ({chartView.label})
                </h3>
                <div style={{ height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" opacity={0.5} />
                            <XAxis
                                dataKey="rank"
                                scale={chartView.xScale === 'log' ? 'log' : 'auto'}
                                domain={chartView.xScale === 'log' ? [10, 50000] : [0, 50000]}
                                type="number"
                                tickFormatter={fmtNum}
                                tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                                label={{ value: 'Rank', position: 'insideBottomRight', offset: -5, style: { fill: 'var(--color-text-muted)', fontSize: 12 } }}
                            />
                            <YAxis
                                scale={chartView.yScale === 'log' ? 'log' : 'auto'}
                                domain={chartView.yScale === 'log' ? [1, 100000] : [0, 'auto']}
                                type="number"
                                tickFormatter={fmtNum}
                                tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                                label={{ value: 'SoPoints', angle: -90, position: 'insideLeft', offset: 10, style: { fill: 'var(--color-text-muted)', fontSize: 12 } }}
                                allowDataOverflow
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Line
                                type="monotone"
                                dataKey="points"
                                stroke="var(--color-primary)"
                                strokeWidth={2.5}
                                dot={false}
                                name="Estimated SoPoints"
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Lookup + Model row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Rank Lookup */}
                <div className="sopoints-table-container" style={{ padding: '16px 20px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600 }}>Rank Lookup</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Rank:</label>
                        <input
                            type="number"
                            min={1}
                            max={50000}
                            value={lookupRank}
                            onChange={(e) => setLookupRank(e.target.value)}
                            style={{
                                background: 'var(--color-bg-main)',
                                border: '1px solid var(--color-border-subtle)',
                                color: 'var(--color-text-main)',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                width: '120px',
                                fontSize: '16px',
                                outline: 'none'
                            }}
                        />
                    </div>
                    {lookupResult !== null && (
                        <div style={{ marginTop: '12px', fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)' }}>
                            {"Rank #" + parseInt(lookupRank).toLocaleString() + " \u2248 " + lookupResult.toLocaleString() + " SoPoints"}
                        </div>
                    )}
                </div>

                {/* Model Info */}
                <div className="sopoints-table-container" style={{ padding: '16px 20px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600 }}>Model</h3>
                    <div style={{
                        background: 'var(--color-bg-main)',
                        border: '1px solid var(--color-border-subtle)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontFamily: 'monospace',
                        fontSize: '14px',
                        color: 'var(--color-primary)',
                        fontWeight: 600
                    }}>
                        {MODEL_FORMULA}
                    </div>
                    <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        {MODEL_DESC}
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        {"Based on " + DATA_POINTS_COUNT + " known data points"}
                    </p>
                </div>
            </div>

            {/* Quick reference table */}
            <div className="sopoints-table-container" style={{ padding: '16px 20px', marginTop: '16px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600 }}>Quick Reference</h3>
                <table className="sopoints-table" style={{ fontSize: '13px' }}>
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th style={{ textAlign: 'right' }}>Est. SoPoints</th>
                            <th>Rank</th>
                            <th style={{ textAlign: 'right' }}>Est. SoPoints</th>
                            <th>Rank</th>
                            <th style={{ textAlign: 'right' }}>Est. SoPoints</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            [10, 50, 100],
                            [250, 500, 1000],
                            [2500, 5000, 10000],
                            [15000, 25000, 50000],
                        ].map((row, i) => (
                            <tr key={i}>
                                {row.map(r => (
                                    <React.Fragment key={r}>
                                        <td style={{ fontWeight: 600 }}>{"#" + r.toLocaleString()}</td>
                                        <td style={{ textAlign: 'right', color: 'var(--color-primary)' }}>
                                            {Math.round(estimatePoints(r)).toLocaleString()}
                                        </td>
                                    </React.Fragment>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
