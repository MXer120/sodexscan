'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import '../styles/TopPerformers.css'

const PERIODS = [
  { id: '24h', label: '24h' },
  { id: '7d',  label: '7d' },
  { id: '30d', label: '30d' },
]

// Seed data for the layout. Wire to live leaderboard data via React Query when ready.
const SEED = {
  '24h': [
    { rank: 1, address: '0xa3f1...92d4', label: 'whale.eth',     pnl: 184_320, pct: 24.1 },
    { rank: 2, address: '0x77c2...0e1f', label: 'KaitoMaxi',     pnl:  92_440, pct: 17.8 },
    { rank: 3, address: '0xbe09...6a3c', label: 'sodex_pro',     pnl:  61_915, pct: 12.4 },
    { rank: 4, address: '0x12d8...44b9', label: 'fastfingers',   pnl:  38_240, pct:  8.6 },
    { rank: 5, address: '0x903a...c5e0', label: 'ranger.sol',    pnl:  21_080, pct:  4.1 },
  ],
  '7d': [
    { rank: 1, address: '0x77c2...0e1f', label: 'KaitoMaxi',     pnl: 612_850, pct: 41.2 },
    { rank: 2, address: '0xa3f1...92d4', label: 'whale.eth',     pnl: 488_200, pct: 33.0 },
    { rank: 3, address: '0xbe09...6a3c', label: 'sodex_pro',     pnl: 312_400, pct: 21.6 },
    { rank: 4, address: '0x44e1...11aa', label: 'momentum.x',    pnl: 198_770, pct: 15.3 },
    { rank: 5, address: '0x12d8...44b9', label: 'fastfingers',   pnl: 162_910, pct:  9.7 },
  ],
  '30d': [
    { rank: 1, address: '0x77c2...0e1f', label: 'KaitoMaxi',     pnl: 1_840_000, pct: 88.1 },
    { rank: 2, address: '0xa3f1...92d4', label: 'whale.eth',     pnl: 1_220_500, pct: 67.3 },
    { rank: 3, address: '0x44e1...11aa', label: 'momentum.x',    pnl:   908_100, pct: 49.8 },
    { rank: 4, address: '0xbe09...6a3c', label: 'sodex_pro',     pnl:   745_220, pct: 38.4 },
    { rank: 5, address: '0x12d8...44b9', label: 'fastfingers',   pnl:   512_340, pct: 24.2 },
  ],
}

const PALETTE = ['#6366f1', '#22c55e', '#f59e0b', '#06b6d4', '#ec4899']

const formatUsd = (n) => {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M'
  if (abs >= 1_000)     return '$' + (n / 1_000).toFixed(1) + 'K'
  return '$' + n.toFixed(0)
}

const initialFor = (label) => (label?.[0] ?? '?').toUpperCase()

export default function TopPerformers({ data = null, defaultPeriod = '24h', linkAll = '/mainnet' }) {
  const [period, setPeriod] = useState(defaultPeriod)
  const rows = useMemo(() => {
    if (data && data[period]) return data[period]
    return SEED[period] ?? []
  }, [data, period])

  const max = Math.max(...rows.map(r => Math.abs(r.pnl)), 1)

  return (
    <div className="top-performers-card">
      <div className="tp-header">
        <div className="tp-title-block">
          <h3 className="tp-title">Top Performers</h3>
          <span className="tp-subtitle">Highest PnL traders</span>
        </div>
        <div className="tp-controls">
          <div className="tp-period">
            {PERIODS.map(p => (
              <button
                key={p.id}
                type="button"
                className={`tp-period-btn ${period === p.id ? 'active' : ''}`}
                onClick={() => setPeriod(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Link href={linkAll} className="tp-view-all">View all →</Link>
        </div>
      </div>

      <ul className="tp-list">
        {rows.map((r, idx) => {
          const positive = r.pnl >= 0
          const bar = Math.max(2, Math.round((Math.abs(r.pnl) / max) * 100))
          const color = PALETTE[idx % PALETTE.length]
          return (
            <li key={r.address} className="tp-row">
              <span className="tp-rank">{r.rank}</span>
              <span className="tp-avatar" style={{ background: color }}>{initialFor(r.label)}</span>
              <div className="tp-name-block">
                <div className="tp-name">{r.label}</div>
                <div className="tp-addr">{r.address}</div>
              </div>
              <div className="tp-bar-block">
                <div className="tp-bar-track">
                  <div
                    className="tp-bar-fill"
                    style={{ width: bar + '%', background: color }}
                  />
                </div>
              </div>
              <div className={`tp-pnl ${positive ? 'up' : 'down'}`}>
                <span className="tp-pnl-value">{positive ? '+' : ''}{formatUsd(r.pnl)}</span>
                <span className="tp-pnl-pct">{positive ? '+' : ''}{r.pct.toFixed(1)}%</span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
