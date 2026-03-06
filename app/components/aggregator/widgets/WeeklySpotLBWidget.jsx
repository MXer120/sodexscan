import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabaseClient'
import { useLeaderboardMeta } from '../../../hooks/useLeaderboardMeta'
import CopyableAddress from '../../ui/CopyableAddress'

const PAGE_SIZE = 20

const formatNum = (num) => {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(2)}K`
  return num.toFixed(2)
}

export default function WeeklySpotLBWidget({ config }) {
  const weekOffset = parseInt(config?.weekOffset ?? 0)
  const { data: meta } = useLeaderboardMeta()
  const [page, setPage] = useState(1)

  const weekNum = meta?.current_week_number || 0
  const targetWeek = weekOffset === 0 ? 0 : weekNum - weekOffset

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['weekly-spot-lb', targetWeek],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_weekly_leaderboard', {
        p_week: targetWeek,
        p_sort: 'volume',
        p_limit: 500,
        p_offset: 0,
        p_exclude_sodex: true
      })
      if (error) throw error
      return (data || [])
        .map(r => ({
          wallet: r.wallet_address,
          volume: parseFloat(r.weekly_spot_volume) || 0
        }))
        .filter(r => r.volume > 0)
        .sort((a, b) => b.volume - a.volume)
    },
    enabled: !!weekNum,
    staleTime: 5 * 60 * 1000,
  })

  const totalPages = Math.ceil(rows.length / PAGE_SIZE)
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const weekLabel = weekOffset === 0 ? `Week ${weekNum} (Live)` : `Week ${weekNum - weekOffset}`

  if (isLoading) return <div style={{ padding: 12, color: 'var(--color-text-muted)' }}>Loading...</div>

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>
        {weekLabel}
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Wallet</th>
            <th className="text-right">Weekly Spot Vol</th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map((u, idx) => (
            <tr key={u.wallet}>
              <td className="rank">#{(page - 1) * PAGE_SIZE + idx + 1}</td>
              <td><CopyableAddress address={u.wallet} /></td>
              <td className="text-right">${formatNum(u.volume)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="agg-pagination">
          <button className="agg-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>&lt; Prev</button>
          <span className="agg-page-info">Page {page} / {totalPages}</span>
          <button className="agg-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next &gt;</button>
        </div>
      )}
    </div>
  )
}
