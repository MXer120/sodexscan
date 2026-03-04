import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabaseClient'
import { useLeaderboardMeta } from '../../../hooks/useLeaderboardMeta'
import { useSoPointsConfig } from '../../../hooks/useSoPointsConfig'
import CopyableAddress from '../../ui/CopyableAddress'

const SPOT_MULTIPLIER = 2
const TOTAL_POOL = 1_000_000
const SPOT_DATA_URL = 'https://raw.githubusercontent.com/Eliasdegemu61/sodex-spot-volume-data/main/spot_vol_data.json'
const SODEX_SPOT_WALLETS = new Set([
  '0xc50e42e7f49881127e8183755be3f281bb687f7b',
  '0x1f446dfa225d5c9e8a80cd227bf57444fc141332',
  '0x4b16ce4edb6bfea22aa087fb5cb3cfd654ca99f5'
])
const PAGE_SIZE = 20

const formatVol = (num) => {
  const abs = Math.abs(num)
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1000) return `${(abs / 1000).toFixed(1)}K`
  return abs.toFixed(0)
}

export default function PointsLeaderboardWidget() {
  const { data: meta } = useLeaderboardMeta()
  const weekNum = meta?.current_week_number || 0
  const { getWeekConfig } = useSoPointsConfig()
  const weekConfig = weekNum ? getWeekConfig(weekNum) : { include_spot: true, include_futures: true }
  const [page, setPage] = useState(1)

  const { data: spotAllTime = null, isLoading: isLoadingSpot } = useQuery({
    queryKey: ['spot-all-time-data'],
    queryFn: async () => {
      const res = await fetch(SPOT_DATA_URL)
      return await res.json()
    },
    staleTime: 30 * 60 * 1000,
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
    staleTime: 60 * 60 * 1000,
  })

  const { data: futuresMap = {}, isLoading: isLoadingFutures } = useQuery({
    queryKey: ['futures-volume-map', weekNum],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_futures_volume_map', {
        p_week: 0, p_exclude_sodex: true
      })
      if (error) throw error
      return data || {}
    },
    enabled: !!weekNum,
    staleTime: 5 * 60 * 1000,
  })

  const isLoading = isLoadingSpot || (weekNum > 1 && isLoadingSnapshot) || isLoadingFutures

  const leaderboard = useMemo(() => {
    if (!spotAllTime || !futuresMap) return []

    const spotWeeklyMap = {}
    for (const [addr, d] of Object.entries(spotAllTime)) {
      if (SODEX_SPOT_WALLETS.has(addr.toLowerCase())) continue
      const vol = d.vol || 0
      const baseVol = prevSnapshot?.[addr]?.vol || prevSnapshot?.[addr.toLowerCase()]?.vol || 0
      const weeklySpot = Math.max(0, vol - baseVol)
      spotWeeklyMap[addr.toLowerCase()] = { weeklySpot, originalAddr: addr }
    }

    const allAddrs = new Set([...Object.keys(spotWeeklyMap), ...Object.keys(futuresMap)])
    for (const sw of SODEX_SPOT_WALLETS) allAddrs.delete(sw)

    const entries = []
    for (const addr of allAddrs) {
      const spot = spotWeeklyMap[addr]
      const futuresVol = futuresMap[addr] || 0
      const weeklySpot = spot?.weeklySpot || 0
      if (weeklySpot === 0 && futuresVol === 0) continue
      entries.push({
        wallet: spot?.originalAddr || addr,
        weeklySpot, futuresVol,
        weighted: weeklySpot * SPOT_MULTIPLIER + futuresVol
      })
    }

    entries.sort((a, b) => b.weighted - a.weighted)
    const totalW = entries.reduce((s, e) => s + e.weighted, 0)
    const qualified = entries.filter(e => totalW > 0 && (e.weighted / totalW) * TOTAL_POOL >= 1)
    const qualW = qualified.reduce((s, e) => s + e.weighted, 0)
    qualified.forEach((e, i) => {
      e.rank = i + 1
      e.points = qualW > 0 ? Math.round((e.weighted / qualW) * TOTAL_POOL) : 0
    })
    return qualified
  }, [spotAllTime, prevSnapshot, futuresMap])

  const totalPages = Math.ceil(leaderboard.length / PAGE_SIZE)
  const pageRows = leaderboard.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (isLoading) return <div style={{ padding: 12, color: 'var(--color-text-muted)' }}>Loading...</div>

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>
        Week {weekNum} · {leaderboard.length} qualified
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Wallet</th>
            {weekConfig.include_spot && <th className="text-right">Spot</th>}
            {weekConfig.include_futures && <th className="text-right">Futures</th>}
            <th className="text-right">Points</th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map(e => (
            <tr key={e.wallet}>
              <td className="rank">#{e.rank}</td>
              <td><CopyableAddress address={e.wallet} /></td>
              {weekConfig.include_spot && <td className="text-right">${formatVol(e.weeklySpot)}</td>}
              {weekConfig.include_futures && <td className="text-right">${formatVol(e.futuresVol)}</td>}
              <td className="text-right" style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                {e.points.toLocaleString()}
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
