import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import CopyableAddress from '../../ui/CopyableAddress'
import { SkeletonLeaderboard } from '../../Skeleton'

const PAGE_SIZE = 20

const formatVol = (num) => {
  const abs = Math.abs(num)
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1000) return `${(abs / 1000).toFixed(1)}K`
  return abs.toFixed(0)
}

export default function PointsLeaderboardWidget() {
  const [page, setPage] = useState(1)

  const { data: leaderboardData = { items: [], total: 0 }, isLoading } = useQuery({
    queryKey: ['points-lb', page],
    queryFn: async () => {
      const res = await fetch(
        `/api/sodex-leaderboard?page=${page}&page_size=${PAGE_SIZE}&sort_by=volume&sort_order=desc&window_type=ALL_TIME`
      )
      if (!res.ok) throw new Error('Failed to fetch leaderboard')
      const json = await res.json()
      if (json.code !== 0) throw new Error('Leaderboard API error')
      return {
        items: (json.data?.items || []).map(r => ({
          wallet: r.wallet_address,
          volume: parseFloat(r.volume_usd) || 0,
          rank: r.rank,
        })),
        total: json.data?.total || 0
      }
    },
    staleTime: 5 * 60 * 1000,
  })

  const { items: pageRows, total } = leaderboardData
  const totalPages = Math.ceil(total / PAGE_SIZE)

  if (isLoading) return <table style={{width:'100%'}}><SkeletonLeaderboard rows={10} cols={3} /></table>

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>
        All-time volume · {total.toLocaleString()} traders
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Wallet</th>
            <th className="text-right">Volume</th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map(e => (
            <tr key={e.wallet}>
              <td className="rank">#{e.rank}</td>
              <td><CopyableAddress address={e.wallet} /></td>
              <td className="text-right" style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                ${formatVol(e.volume)}
              </td>
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
