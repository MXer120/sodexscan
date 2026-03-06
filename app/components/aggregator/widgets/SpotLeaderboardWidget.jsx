import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabaseClient'
import CopyableAddress from '../../ui/CopyableAddress'

const PAGE_SIZE = 20

const formatNum = (num) => {
  const abs = Math.abs(num)
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1000) return `${(abs / 1000).toFixed(2)}K`
  return abs.toFixed(2)
}

export default function SpotLeaderboardWidget() {
  const [page, setPage] = useState(1)

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['spot-leaderboard-db'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leaderboard_smart')
        .select('wallet_address, spot_volume')
        .gt('spot_volume', 0)
        .not('is_sodex_owned', 'is', true)
        .order('spot_volume', { ascending: false })
        .limit(1000)
      if (error) throw error
      return (data || []).map(r => ({
        wallet: r.wallet_address,
        volume: parseFloat(r.spot_volume) || 0
      }))
    },
    staleTime: 5 * 60 * 1000,
  })

  const totalPages = Math.ceil(rows.length / PAGE_SIZE)
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (isLoading) return <div style={{ padding: 12, color: 'var(--color-text-muted)' }}>Loading...</div>

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Wallet</th>
            <th className="text-right">Spot Volume</th>
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
