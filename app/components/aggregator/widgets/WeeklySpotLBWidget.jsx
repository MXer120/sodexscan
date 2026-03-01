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

export default function WeeklySpotLBWidget({ config }) {
  const weekOffset = parseInt(config?.weekOffset ?? 0)
  const { data: meta } = useLeaderboardMeta()
  const [page, setPage] = useState(1)

  const weekNum = meta?.current_week_number || 0
  const targetWeek = weekNum - weekOffset
  const prevWeek = weekOffset === 0 ? weekNum - 1 : targetWeek - 1

  // All-time data (only for live week)
  const { data: spotAllTime = null, isLoading: isLoadingAllTime } = useQuery({
    queryKey: ['spot-all-time-data'],
    queryFn: async () => {
      const res = await fetch(SPOT_DATA_URL)
      return await res.json()
    },
    enabled: weekOffset === 0,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  })

  // Current snapshot (for historical weeks)
  const { data: currSnapshot = null, isLoading: isLoadingCurr } = useQuery({
    queryKey: ['spot-snapshot', targetWeek],
    queryFn: async () => {
      if (targetWeek <= 0) return null
      const { data, error } = await supabase.rpc('get_spot_snapshot', { p_week: targetWeek })
      if (error) throw error
      return data
    },
    enabled: !!weekNum && weekOffset > 0 && targetWeek > 0,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })

  // Previous snapshot (baseline)
  const { data: prevSnapshot = null, isLoading: isLoadingSnapshot } = useQuery({
    queryKey: ['spot-snapshot', prevWeek],
    queryFn: async () => {
      if (prevWeek <= 0) return null
      const { data, error } = await supabase.rpc('get_spot_snapshot', { p_week: prevWeek })
      if (error) throw error
      return data
    },
    enabled: !!weekNum && prevWeek > 0,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })

  const isLoading = weekOffset === 0
    ? (isLoadingAllTime || (weekNum > 1 && isLoadingSnapshot))
    : (isLoadingCurr || isLoadingSnapshot)

  const rows = useMemo(() => {
    const source = weekOffset === 0 ? spotAllTime : currSnapshot
    if (!source) return []
    const entries = []
    for (const [addr, d] of Object.entries(source)) {
      if (SODEX_SPOT_WALLETS.has(addr.toLowerCase())) continue
      const vol = d.vol || 0
      const baseVol = prevSnapshot?.[addr]?.vol || prevSnapshot?.[addr.toLowerCase()]?.vol || 0
      const weeklyVol = Math.max(0, vol - baseVol)
      if (weeklyVol > 0) entries.push({ wallet: addr, volume: weeklyVol })
    }
    return entries.sort((a, b) => b.volume - a.volume)
  }, [spotAllTime, currSnapshot, prevSnapshot, weekOffset])

  const totalPages = Math.ceil(rows.length / PAGE_SIZE)
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const weekLabel = weekOffset === 0 ? `Week ${weekNum} (Live)` : `Week ${targetWeek}`

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
