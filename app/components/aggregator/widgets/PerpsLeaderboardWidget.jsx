import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabaseClient'
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
  const excludeSodex = config?.excludeSodex !== false
  const showRank = config?.showRank !== false
  const showWallet = config?.showWallet !== false
  const showPnl = config?.showPnl !== false
  const showVolume = config?.showVolume !== false
  const [page, setPage] = useState(1)

  const { data: leaderboardData = { rows: [], total: 0 }, isLoading } = useQuery({
    queryKey: ['perps-leaderboard', sortBy, excludeSodex, page],
    queryFn: async () => {
      const orderCol = sortBy === 'volume' ? 'volume_rank' : 'pnl_rank'

      let countQ = supabase.from('leaderboard_smart').select('*', { count: 'exact', head: true })
      if (excludeSodex) countQ = countQ.not('is_sodex_owned', 'is', true)
      countQ = countQ.or('cumulative_volume.gt.0,cumulative_pnl.neq.0')
      const { count } = await countQ

      let q = supabase.from('leaderboard_smart')
        .select('wallet_address, cumulative_pnl, cumulative_volume, pnl_rank, volume_rank')
        .order(orderCol, { ascending: true, nullsFirst: false })
        .or('cumulative_volume.gt.0,cumulative_pnl.neq.0')

      if (excludeSodex) q = q.not('is_sodex_owned', 'is', true)

      const { data: rows, error } = await q.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
      if (error) throw error

      return {
        rows: (rows || []).map(r => ({
          wallet: r.wallet_address,
          pnl: parseFloat(r.cumulative_pnl) || 0,
          volume: parseFloat(r.cumulative_volume) || 0,
        })),
        total: count || 0
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,   // 30 minutes
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
            {data.map((u, idx) => (
              <tr key={u.wallet}>
                {showRank && <td className="rank">#{(page - 1) * PAGE_SIZE + idx + 1}</td>}
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
