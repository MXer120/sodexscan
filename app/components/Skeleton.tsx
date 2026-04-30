'use client'

import React from 'react'

const S: React.CSSProperties = {
  borderRadius: 4,
  // Uses --color-overlay-* tokens which automatically swap with theme
  background: 'linear-gradient(90deg, var(--color-overlay-subtle) 25%, var(--color-overlay-light) 50%, var(--color-overlay-subtle) 75%)',
  backgroundSize: '200px 100%',
  animation: 'skeleton-shimmer 1.4s ease infinite',
}

export function SkeletonBar({ width = '100%', height = 14, style }: { width?: number | string; height?: number; style?: React.CSSProperties }) {
  return <div style={{ ...S, width, height, ...style }} />
}

export function SkeletonCircle({ size = 32, style }: { size?: number; style?: React.CSSProperties }) {
  return <div style={{ ...S, width: size, height: size, borderRadius: '50%', ...style }} />
}

/* ── Generic fallbacks (kept for non-specific uses) ── */

export function SkeletonTable({ rows = 10, cols = 4, colWidths }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} style={{ padding: '14px 12px' }}>
              <SkeletonBar width={colWidths?.[c] || '100%'} height={14} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}

export function SkeletonWidget({ lines = 3, style }: { lines?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, ...style }}>
      <SkeletonBar width="40%" height={16} />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBar key={i} width={i === lines - 1 ? '70%' : '100%'} />
      ))}
    </div>
  )
}

export function SkeletonList({ items = 5, style }: { items?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...style }}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
          <SkeletonCircle size={28} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <SkeletonBar width="60%" height={12} />
            <SkeletonBar width="35%" height={10} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonChart({ height = 200, style }: { height?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ padding: 12, ...style }}>
      <div style={{ ...S, width: '100%', height, borderRadius: 8 }} />
    </div>
  )
}

export function SkeletonCard({ count = 3, style }: { count?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0', ...style }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ padding: 12, borderRadius: 8, background: 'var(--color-overlay-faint)' }}>
          <SkeletonBar width="50%" height={14} style={{ marginBottom: 10 }} />
          <SkeletonBar width="100%" height={12} style={{ marginBottom: 6 }} />
          <SkeletonBar width="75%" height={12} />
        </div>
      ))}
    </div>
  )
}

export function SkeletonText({ lines = 3, style }: { lines?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBar key={i} width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   COMPONENT-SPECIFIC SKELETONS — exact CSS match
   ════════════════════════════════════════════════════════════════ */

/*
 * Top Pairs table: .top-pairs-table
 * CSS: th padding 12px 16px, td padding 14px 16px, font-size 14px
 * Cols: rank(60px) | pair(logo+symbol) | volume(right-aligned)
 */
export function SkeletonTopPairsTable({ rows = 10 }) {
  return (
    <table className="top-pairs-table" style={{ width: '100%' }}>
      <thead>
        <tr>
          <th className="rank" style={{ width: 60 }}>&nbsp;</th>
          <th className="pair-symbol">&nbsp;</th>
          <th className="text-right volume">&nbsp;</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i}>
            <td className="rank" style={{ width: 60 }}>
              <SkeletonBar width={18} height={14} />
            </td>
            <td className="pair-symbol">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SkeletonCircle size={20} />
                <SkeletonBar width={75} height={14} />
              </div>
            </td>
            <td className="text-right volume">
              <SkeletonBar width={85} height={14} style={{ marginLeft: 'auto' }} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/*
 * New Traders table: .top-pairs-table
 * CSS: same as top-pairs — th 12px 16px, td 14px 16px, font-size 14px
 * Cols: wallet | first trade (right)
 */
export function SkeletonNewTradersTable({ rows = 10 }) {
  return (
    <table className="top-pairs-table" style={{ width: '100%' }}>
      <thead>
        <tr>
          <th>&nbsp;</th>
          <th className="text-right">&nbsp;</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i}>
            <td>
              <SkeletonBar width={130} height={14} />
            </td>
            <td className="text-right">
              <SkeletonBar width={55} height={14} style={{ marginLeft: 'auto' }} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/*
 * Top 10 Gainers/Losers: .top-10-table
 * CSS: th padding 10px 8px, td padding 8px, font-size 13px
 * th:first-child width 50px
 * Cols: rank(50px) | address | PnL(right)
 */
export function SkeletonTop10({ rows = 10 }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          <td className="rank" style={{ width: 50 }}>
            <SkeletonBar width={18} height={13} />
          </td>
          <td>
            <SkeletonBar width={120} height={13} />
          </td>
          <td className="text-right pnl">
            <SkeletonBar width={75} height={13} style={{ marginLeft: 'auto' }} />
          </td>
        </tr>
      ))}
    </tbody>
  )
}

/*
 * Main Leaderboard: .leaderboard-table
 * CSS: th padding 14px 12px, td padding 14px 12px, font-size 14px
 * Cols vary: [rank, wallet, pnl, volume] or [rank, wallet, pnl, volume, unrealized]
 */
export function SkeletonLeaderboard({ rows = 20, cols = 4 }) {
  const widths = cols === 5
    ? [30, 140, 85, 85, 75]
    : cols === 3
      ? [30, 140, 85]
      : [30, 140, 85, 85]
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {widths.map((w, c) => (
            <td key={c}>
              <SkeletonBar width={w} height={14} style={c >= 2 ? { marginLeft: 'auto' } : undefined} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}

/*
 * Social Leaderboard: .leaderboard-table (reuses MainnetPage CSS)
 * CSS: td padding 14px 12px, font-size 14px
 * Cols: rank | user | value(right)
 */
export function SkeletonSocialLB({ rows = 20 }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          <td className="rank-cell" style={{ width: 50 }}>
            <SkeletonBar width={26} height={14} />
          </td>
          <td className="user-cell">
            <SkeletonBar width={110} height={14} />
          </td>
          <td className="value-cell text-right">
            <SkeletonBar width={65} height={14} style={{ marginLeft: 'auto' }} />
          </td>
        </tr>
      ))}
    </tbody>
  )
}

/*
 * Referral cards: .referral-grid > .referral-card
 * CSS: card padding 20px, code font-size 20px mb 16px,
 * link-row padding 10px 12px mb 16px, badges gap 10px, badge padding 6px 12px
 */
export function SkeletonReferralGrid({ count = 6 }) {
  return (
    <div className="referral-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="referral-card">
          {/* header: code + optional featured tag */}
          <div className="referral-card-header">
            <SkeletonBar width={100} height={20} />
          </div>
          {/* link row */}
          <div className="referral-link-row" style={{ cursor: 'default' }}>
            <SkeletonBar width="80%" height={13} />
            <SkeletonBar width={14} height={14} style={{ flexShrink: 0 }} />
          </div>
          {/* social badges */}
          <div className="social-badges">
            {[0, 1, 2].map(j => (
              <div key={j} className="social-badge" style={{ cursor: 'default' }}>
                <SkeletonCircle size={16} />
                <SkeletonBar width={55} height={13} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/*
 * Watchlist: .watchlist-table
 * CSS: th padding 12px 16px, td padding 16px, font-size 14px
 * Cols: wallet/tag | position | PnL rank | vol rank | actions
 */
export function SkeletonWatchlistTable({ rows = 8 }) {
  return (
    <table className="watchlist-table" style={{ width: '100%' }}>
      <thead>
        <tr>
          <th>Wallet / Tag</th>
          <th>Position</th>
          <th>PnL Rank</th>
          <th>Vol Rank</th>
          <th style={{ textAlign: 'right' }}>&nbsp;</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i}>
            <td>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <SkeletonBar width={130} height={14} />
                <SkeletonBar width={50} height={12} style={{ borderRadius: 10 }} />
              </div>
            </td>
            <td><SkeletonBar width={75} height={13} /></td>
            <td><SkeletonBar width={35} height={13} /></td>
            <td><SkeletonBar width={35} height={13} /></td>
            <td style={{ textAlign: 'right' }}>
              <SkeletonBar width={60} height={28} style={{ borderRadius: 6, marginLeft: 'auto' }} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/*
 * Incoming Listings: .incoming-table
 * CSS: th padding 12px 16px, td padding 16px, rank width 50px
 * Cols: # | symbol(logo+text) | type(badge, right-aligned)
 */
export function SkeletonIncomingListings({ rows = 10 }) {
  return (
    <table className="incoming-table" style={{ width: '100%' }}>
      <thead>
        <tr>
          <th className="rank" style={{ width: 50 }}>#</th>
          <th>Symbol</th>
          <th className="type-cell">Type</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i}>
            <td className="rank" style={{ width: 50 }}>
              <SkeletonBar width={18} height={14} />
            </td>
            <td className="symbol-cell">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SkeletonCircle size={20} />
                <SkeletonBar width={70} height={14} />
              </div>
            </td>
            <td className="type-cell">
              <SkeletonBar width={55} height={22} style={{ borderRadius: 6, marginLeft: 'auto' }} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* ── Week Table (widget): compact rows ── */
export function SkeletonWeekTable({ rows = 5 }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {['Week', 'Users', 'Traders', 'Active', 'Avg Reward'].map((h, i) => (
            <th key={i} style={{ padding: '6px 8px', textAlign: i > 0 ? 'right' : 'left', fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500 }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r}>
            <td style={{ padding: '6px 8px' }}><SkeletonBar width={50} height={12} /></td>
            <td style={{ padding: '6px 8px', textAlign: 'right' }}><SkeletonBar width={45} height={12} style={{ marginLeft: 'auto' }} /></td>
            <td style={{ padding: '6px 8px', textAlign: 'right' }}><SkeletonBar width={45} height={12} style={{ marginLeft: 'auto' }} /></td>
            <td style={{ padding: '6px 8px', textAlign: 'right' }}><SkeletonBar width={45} height={12} style={{ marginLeft: 'auto' }} /></td>
            <td style={{ padding: '6px 8px', textAlign: 'right' }}><SkeletonBar width={55} height={12} style={{ marginLeft: 'auto' }} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* ── SoPoints chart: single shimmer block, no vertical bars ── */
export function SkeletonSoPointsChart({ height = 300 }) {
  return (
    <div style={{ width: '100%', height, position: 'relative' }}>
      <div style={{ ...S, width: '100%', height: '100%', borderRadius: 8 }} />
    </div>
  )
}

/* ── SkeletonPage kept for auth-gate pages (tickets, tracker) ── */
export function SkeletonPage({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100vh', paddingTop: 120, ...style }}>
      <div style={{ width: '100%', maxWidth: 900, padding: '0 24px' }}>
        <SkeletonBar width="30%" height={24} style={{ marginBottom: 24 }} />
        <SkeletonBar width="100%" height={40} style={{ marginBottom: 16 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonBar key={i} height={16} width={i % 3 === 0 ? '80%' : '100%'} />
          ))}
        </div>
      </div>
    </div>
  )
}
