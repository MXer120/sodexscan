import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabaseClient'
import { useLeaderboardMeta } from '../../../hooks/useLeaderboardMeta'
import CopyableAddress from '../../ui/CopyableAddress'

const PAGE_SIZE = 20

const formatNum = (num) => {
  const abs = Math.abs(num)
  if (abs >= 1_000_000) return `${(num < 0 ? '-' : '')}${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1000) return `${(num < 0 ? '-' : '')}${(abs / 1000).toFixed(2)}K`
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function WeeklyPerpsLBWidget({ config }) {
  const sortBy = config?.sortBy || 'volume'
  const weekOffset = parseInt(config?.weekOffset ?? 0)
  const { data: meta } = useLeaderboardMeta()
  const [page, setPage] = useState(1)

  const weekNum = meta?.current_week_number || 0
  const p_week = weekOffset === 0 ? 0 : weekNum - weekOffset

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['weekly-perps-lb', weekNum, weekOffset, sortBy, page],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_weekly_leaderboard', {
        p_week,
        p_sort: sortBy,
        p_limit: PAGE_SIZE,
        p_offset: (page - 1) * PAGE_SIZE,
        p_exclude_sodex: true
      })
      if (error) throw error
      return data || []
    },
    enabled: !!weekNum,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const weekLabel = weekOffset === 0 ? `Week ${weekNum} (Live)` : `Week ${weekNum - weekOffset}`

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>
        {weekLabel}
      </div>
      <div style={{ opacity: isLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Wallet</th>
              <th className="text-right">PnL</th>
              <th className="text-right">Volume</th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((row, idx) => (
              <tr key={row.wallet_address}>
                <td className="rank">#{(page - 1) * PAGE_SIZE + idx + 1}</td>
                <td><CopyableAddress address={row.wallet_address} /></td>
                <td className={`text-right ${parseFloat(row.weekly_pnl) > 0 ? 'positive' : parseFloat(row.weekly_pnl) < 0 ? 'negative' : ''}`}>
                  ${formatNum(parseFloat(row.weekly_pnl) || 0)}
                </td>
                <td className="text-right">${formatNum(parseFloat(row.weekly_volume) || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="agg-pagination">
        <button className="agg-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>&lt; Prev</button>
        <span className="agg-page-info">Page {page}</span>
        <button className="agg-page-btn" onClick={() => setPage(p => p + 1)} disabled={(rows || []).length < PAGE_SIZE}>Next &gt;</button>
      </div>
    </div>
  )
}
