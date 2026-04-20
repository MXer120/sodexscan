'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import WalletDisplay from '../WalletDisplay'
import FollowModal from './FollowModal'

const DISCLAIMER = 'Rankings are based on hypothetical simulated trades and do not represent real money returns. Past simulated performance is not indicative of future results. Not financial advice.'

const fmt = (n, prefix = '') => {
  if (n == null) return '—'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : '+'
  if (abs >= 1e6) return prefix + sign + (abs / 1e6).toFixed(2) + 'M'
  if (abs >= 1e3) return prefix + sign + (abs / 1e3).toFixed(1) + 'K'
  return prefix + sign + abs.toFixed(2)
}

const fmtUSD = (n) => fmt(n, '$')

export default function CopyLeaderboard() {
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)
  const [followTarget, setFollowTarget] = useState(null)
  const [sortBy, setSortBy] = useState('total_follower_pnl')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('copy_leaderboard')
        .select('*')
        .order(sortBy, { ascending: false })
        .limit(50)
      setLeaders(data ?? [])
      setLoading(false)
    }
    load()
  }, [sortBy])

  const COLS = [
    { key: 'rank', label: '#', width: 36 },
    { key: 'leader_wallet', label: 'Wallet', width: 160 },
    { key: 'follower_count', label: 'Followers', width: 80 },
    { key: 'total_trades', label: 'Trades', width: 72 },
    { key: 'win_rate_pct', label: 'Win %', width: 72 },
    { key: 'avg_pnl_per_trade', label: 'Avg PnL', width: 90 },
    { key: 'total_follower_pnl', label: 'Total PnL', width: 100 },
    { key: 'action', label: '', width: 80 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ padding: '10px 16px', borderRadius: 8, background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', fontSize: 11, color: '#ca8a04', lineHeight: 1.5 }}>
        ⚠ {DISCLAIMER}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Sort by:</span>
        {[
          { key: 'total_follower_pnl', label: 'Total PnL' },
          { key: 'win_rate_pct', label: 'Win rate' },
          { key: 'follower_count', label: 'Followers' },
        ].map(o => (
          <button key={o.key} onClick={() => setSortBy(o.key)} style={{
            fontSize: 12, padding: '4px 12px', borderRadius: 6, cursor: 'pointer', border: 'none',
            background: sortBy === o.key ? 'var(--accent)' : 'var(--bg-hover)',
            color: sortBy === o.key ? '#fff' : 'var(--text-secondary)',
          }}>{o.label}</button>
        ))}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {COLS.map(c => (
                <th key={c.key} style={{ width: c.width, textAlign: c.key === 'leader_wallet' ? 'left' : 'right', padding: '8px 10px', fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={COLS.length} style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)', fontSize: 12 }}>Loading…</td></tr>
            )}
            {!loading && leaders.length === 0 && (
              <tr><td colSpan={COLS.length} style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)', fontSize: 12 }}>No data yet — followers will appear once traders close positions.</td></tr>
            )}
            {leaders.map((row, i) => (
              <tr key={row.leader_wallet} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <td style={{ padding: '10px', textAlign: 'right', color: 'var(--text-secondary)', fontSize: 12 }}>{i + 1}</td>
                <td style={{ padding: '10px' }}>
                  <WalletDisplay address={row.leader_wallet} truncate />
                </td>
                <td style={{ padding: '10px', textAlign: 'right' }}>{row.follower_count ?? '—'}</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>{row.total_trades ?? '—'}</td>
                <td style={{ padding: '10px', textAlign: 'right', color: (row.win_rate_pct ?? 0) >= 50 ? '#22c55e' : '#ef4444' }}>
                  {row.win_rate_pct != null ? row.win_rate_pct + '%' : '—'}
                </td>
                <td style={{ padding: '10px', textAlign: 'right', color: (row.avg_pnl_per_trade ?? 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                  {fmtUSD(row.avg_pnl_per_trade)}
                </td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600, color: (row.total_follower_pnl ?? 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                  {fmtUSD(row.total_follower_pnl)}
                </td>
                <td style={{ padding: '10px', textAlign: 'right' }}>
                  <button onClick={() => setFollowTarget(row.leader_wallet)} style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                    background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 500,
                  }}>Follow</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {followTarget && (
        <FollowModal
          leaderWallet={followTarget}
          onClose={() => setFollowTarget(null)}
          onSuccess={() => setFollowTarget(null)}
        />
      )}
    </div>
  )
}
