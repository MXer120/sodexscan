'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { globalCache } from '../../../lib/globalCache'
import { SkeletonNewTradersTable } from '../../Skeleton'

const timeAgo = (ms) => {
  if (!ms) return 'Unknown'
  const seconds = Math.floor((Date.now() - ms) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}

const truncAddr = (addr) => {
  if (!addr) return 'N/A'
  if (addr.startsWith('0x')) {
    const w = addr.slice(2)
    if (w.length <= 8) return addr
    return `0x${w.slice(0, 4)}...${w.slice(-4)}`
  }
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`
}

export default function NewTradersWidget() {
  const [traders, setTraders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const cached = globalCache.getNewestTraders()
      if (cached) { setTraders(cached); setLoading(false); return }
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('leaderboard')
          .select('wallet_address, first_trade_ts_ms')
          .not('first_trade_ts_ms', 'is', null)
          .order('first_trade_ts_ms', { ascending: false })
          .limit(10)
        if (error) throw error
        const results = data || []
        globalCache.setNewestTraders(results)
        setTraders(results)
      } catch (err) {
        if (err?.name !== 'AbortError') console.error(err)
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <SkeletonNewTradersTable rows={10} />

  return (
    <table>
      <thead>
        <tr>
          <th>Wallet</th>
          <th className="text-right">First Trade</th>
        </tr>
      </thead>
      <tbody>
        {traders.map((t, idx) => (
          <tr key={t.wallet_address || idx}>
            <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{truncAddr(t.wallet_address)}</td>
            <td className="text-right" style={{ color: '#888', fontSize: '12px' }}>{timeAgo(t.first_trade_ts_ms)}</td>
          </tr>
        ))}
        {traders.length === 0 && (
          <tr><td colSpan="2" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No traders found</td></tr>
        )}
      </tbody>
    </table>
  )
}
