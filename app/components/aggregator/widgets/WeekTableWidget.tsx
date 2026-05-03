'use client'
import { useState, useEffect } from 'react'
import { SkeletonWeekTable } from '../../Skeleton'

const TOTAL_POOL = 1_000_000

const formatNumber = (num) => num.toLocaleString('en-US')

export default function WeekTableWidget() {
  const [weeklyItems, setWeeklyItems] = useState<{ rank: number; wallet_address: string; pnl_usd: number; volume_usd: number }[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/sodex-leaderboard?window_type=WEEKLY&sort_by=volume&page_size=5')
        if (res.ok) {
          const json = await res.json()
          setWeeklyItems(json?.data?.items || [])
          setTotal(json?.data?.total || 0)
        }
      } catch (err) { console.error(err) }
      setLoading(false)
    })()
  }, [])

  if (loading) return <SkeletonWeekTable rows={5} />

  const truncAddr = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ''

  return (
    <div>
      <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>
        Weekly top traders by volume &mdash; {total > 0 ? `${formatNumber(total)} participants` : ''}
      </div>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Wallet</th>
            <th className="text-right">Volume</th>
            <th className="text-right">PnL</th>
          </tr>
        </thead>
        <tbody>
          {weeklyItems.map((item) => (
            <tr key={item.wallet_address}>
              <td style={{ fontWeight: 600 }}>#{item.rank}</td>
              <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{truncAddr(item.wallet_address)}</td>
              <td className="text-right">${formatNumber(Math.round(item.volume_usd))}</td>
              <td className="text-right" style={{ color: item.pnl_usd >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
                {item.pnl_usd >= 0 ? '+' : ''}${formatNumber(Math.round(item.pnl_usd))}
              </td>
            </tr>
          ))}
          {weeklyItems.length === 0 && (
            <tr><td colSpan={4} style={{ textAlign: 'center', padding: 12, color: 'var(--color-text-muted)' }}>No weekly data available</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
