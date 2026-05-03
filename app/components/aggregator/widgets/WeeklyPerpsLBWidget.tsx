import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import CopyableAddress from '../../ui/CopyableAddress'

const PAGE_SIZE = 20

const formatNum = (num) => {
  const abs = Math.abs(num)
  if (abs >= 1_000_000) return `${(num < 0 ? '-' : '')}${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1000) return `${(num < 0 ? '-' : '')}${(abs / 1000).toFixed(2)}K`
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function WeeklyPerpsLBWidget({ config }) {
  const sortBy = config?.sortBy || 'pnl'
  const weekOffset = parseInt(config?.weekOffset ?? 0)
  const [page, setPage] = useState(1)

  // Historical weekly data is unavailable; always show current week
  const isHistorical = weekOffset !== 0

  const { data: leaderboardData = { items: [], total: 0 }, isLoading } = useQuery({
    queryKey: ['weekly-perps-lb', sortBy, page],
    queryFn: async () => {
      if (isHistorical) return { items: [], total: 0 }
      const apiSortBy = sortBy === 'pnl' ? 'pnl' : 'volume'
      const res = await fetch(
        `/api/sodex-leaderboard?page=${page}&page_size=${PAGE_SIZE}&sort_by=${apiSortBy}&sort_order=desc&window_type=WEEKLY`
      )
      if (!res.ok) throw new Error('Failed to fetch weekly leaderboard')
      const json = await res.json()
      if (json.code !== 0) throw new Error('Leaderboard API error')
      return {
        items: (json.data?.items || []).map(r => ({
          wallet: r.wallet_address,
          pnl: parseFloat(r.pnl_usd) || 0,
          volume: parseFloat(r.volume_usd) || 0,
          rank: r.rank,
        })),
        total: json.data?.total || 0
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const { items: rows, total } = leaderboardData
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>
        {isHistorical ? 'Historical weekly data unavailable' : 'This week (Live)'}
      </div>
      {isHistorical ? null : (
        <>
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
                {rows.map((row) => (
                  <tr key={row.wallet}>
                    <td className="rank">#{row.rank}</td>
                    <td><CopyableAddress address={row.wallet} /></td>
                    <td className={`text-right ${row.pnl > 0 ? 'positive' : row.pnl < 0 ? 'negative' : ''}`}>
                      ${formatNum(row.pnl)}
                    </td>
                    <td className="text-right">${formatNum(row.volume)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="agg-pagination">
              <button className="agg-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>&lt; Prev</button>
              <span className="agg-page-info">Page {page} / {totalPages}</span>
              <button className="agg-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next &gt;</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
