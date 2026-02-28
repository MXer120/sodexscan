import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import CopyableAddress from '../../ui/CopyableAddress'

const SPOT_DATA_URL = 'https://raw.githubusercontent.com/Eliasdegemu61/sodex-spot-volume-data/main/spot_vol_data.json'
const SODEX_SPOT_WALLETS = new Set([
  '0xc50e42e7f49881127e8183755be3f281bb687f7b',
  '0x1f446dfa225d5c9e8a80cd227bf57444fc141332',
  '0x4b16ce4edb6bfea22aa087fb5cb3cfd654ca99f5'
])
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
    queryKey: ['spot-leaderboard'],
    queryFn: async () => {
      const res = await fetch(SPOT_DATA_URL)
      const json = await res.json()
      return Object.entries(json)
        .filter(([addr]) => !SODEX_SPOT_WALLETS.has(addr.toLowerCase()))
        .map(([addr, d]) => ({ wallet: addr, volume: d.vol || 0, userId: d.userId || '' }))
        .filter(e => e.volume > 0)
        .sort((a, b) => b.volume - a.volume)
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000,    // 60 minutes
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
            <th className="text-right">Volume</th>
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
