import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabaseClient'
import { useLeaderboardMeta } from '../../../hooks/useLeaderboardMeta'
import CopyableAddress from '../../ui/CopyableAddress'

const SPOT_DATA_URL = 'https://raw.githubusercontent.com/Eliasdegemu61/sodex-spot-volume-data/main/spot_vol_data.json'
const SODEX_SPOT_WALLETS = new Set([
  '0xc50e42e7f49881127e8183755be3f281bb687f7b',
  '0x1f446dfa225d5c9e8a80cd227bf57444fc141332',
  '0x4b16ce4edb6bfea22aa087fb5cb3cfd654ca99f5'
])
const PAGE_SIZE = 20

const formatNum = (num) => {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(2)}K`
  return num.toFixed(2)
}

export default function WeeklySpotLBWidget() {
  const { data: meta } = useLeaderboardMeta()
  const [page, setPage] = useState(1)

  const weekNum = meta?.current_week_number || 0

  const { data: spotAllTime = null, isLoading: isLoadingAllTime } = useQuery({
    queryKey: ['spot-all-time-data'],
    queryFn: async () => {
      const res = await fetch(SPOT_DATA_URL)
      return await res.json()
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  })

  const { data: prevSnapshot = null, isLoading: isLoadingSnapshot } = useQuery({
    queryKey: ['spot-snapshot', weekNum - 1],
    queryFn: async () => {
      if (weekNum <= 1) return null
      const { data, error } = await supabase.rpc('get_spot_snapshot', { p_week: weekNum - 1 })
      if (error) throw error
      return data
    },
    enabled: !!weekNum && weekNum > 1,
    staleTime: 60 * 60 * 1000, // Snapshots don't change
    gcTime: 24 * 60 * 60 * 1000,
  })

  const isLoading = isLoadingAllTime || (weekNum > 1 && isLoadingSnapshot)

  const rows = useMemo(() => {
    if (!spotAllTime) return []
    const entries = []
    for (const [addr, d] of Object.entries(spotAllTime)) {
      if (SODEX_SPOT_WALLETS.has(addr.toLowerCase())) continue
      const vol = d.vol || 0
      const baseVol = prevSnapshot?.[addr]?.vol || prevSnapshot?.[addr.toLowerCase()]?.vol || 0
      const weeklyVol = Math.max(0, vol - baseVol)
      if (weeklyVol > 0) entries.push({ wallet: addr, volume: weeklyVol })
    }
    return entries.sort((a, b) => b.volume - a.volume)
  }, [spotAllTime, prevSnapshot])

  const totalPages = Math.ceil(rows.length / PAGE_SIZE)
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (isLoading) return <div style={{ padding: 12, color: 'var(--color-text-muted)' }}>Loading...</div>

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>
        Week {weekNum} (Live)
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Wallet</th>
            <th className="text-right">Weekly Vol</th>
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
