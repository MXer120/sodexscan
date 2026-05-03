import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import CopyableAddress from '../../ui/CopyableAddress'

const PAGE_SIZE = 20

const formatNum = (num) => {
  const abs = Math.abs(num)
  const sign = num < 0 ? '-' : ''
  if (abs >= 1000000) return `${sign}${(abs / 1000000).toFixed(2)}M`
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(2)}K`
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function PerpsLeaderboardWidget({ config }) {
  const sortBy = config?.sortBy || 'volume'
  const showRank = config?.showRank !== false
  const showWallet = config?.showWallet !== false
  const showPnl = config?.showPnl !== false
  const showVolume = config?.showVolume !== false
  const [page, setPage] = useState(1)

  const { data: leaderboardData = { rows: [], total: 0 }, isLoading } = useQuery({
    queryKey: ['perps-leaderboard', sortBy, page],
    queryFn: async () => {
      const apiSortBy = sortBy === 'pnl' ? 'pnl' : 'volume'
      const res = await fetch(
        `/api/sodex-leaderboard?page=${page}&page_size=${PAGE_SIZE}&sort_by=${apiSortBy}&sort_order=desc&window_type=ALL_TIME`
      )
      if (!res.ok) throw new Error('Failed to fetch leaderboard')
      const json = await res.json()
      if (json.code !== 0) throw new Error('Leaderboard API error')
      return {
        rows: (json.data?.items || []).map(r => ({
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

  const { rows: data, total } = leaderboardData

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <div style={{ opacity: isLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
        <table>
          <thead>
            <tr>
              {showRank && <th>#</th>}
              {showWallet && <th>Wallet</th>}
              {showPnl && <th className="text-right">PnL</th>}
              {showVolume && <th className="text-right">Volume</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((u) => (
              <tr key={u.wallet}>
                {showRank && <td className="rank">#{u.rank}</td>}
                {showWallet && <td><CopyableAddress address={u.wallet} /></td>}
                {showPnl && <td className={`text-right ${u.pnl > 0 ? 'positive' : u.pnl < 0 ? 'negative' : ''}`}>
                  ${u.pnl > 0 ? '+' : ''}{formatNum(u.pnl)}
                </td>}
                {showVolume && <td className="text-right">${formatNum(u.volume)}</td>}
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
    </div>
  )
}
