'use client'
import { useQuery } from '@tanstack/react-query'
import { useRef } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import CoinLogo, { getBaseCoin } from '../../ui/CoinLogo'

const PAGE_SIZE = 50 // Fetch more at once for caching

const formatNumber = (num) => {
  if (!num && num !== 0) return '0.00'
  const n = parseFloat(num)
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(2)}M`
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(2)}K`
  return n.toFixed(2)
}

const formatSymbol = (symbol, marketType) => {
  if (!symbol) return 'N/A'
  let formatted = symbol.replace(/^WSOSO/g, 'SOSO')
  formatted = formatted.replace(/v([A-Z0-9]+)/g, '$1')
  formatted = formatted.replace(/_/g, marketType === 'spot' ? '/' : '-')
  return formatted
}

export default function TopPairsWidget({ config }) {
  const filter = config?.filter || 'All'
  const showCoinLogos = config?.showCoinLogos !== false
  const showRank = config?.showRank !== false
  const showVolume = config?.showVolume !== false
  const scrollRef = useRef(null)

  const { data: tickers = [], isLoading } = useQuery({
    queryKey: ['top-pairs', filter],
    queryFn: async () => {
      let query = supabase
        .from('tickers')
        .select('symbol, market_type, volume_24h')
        .order('volume_24h', { ascending: false })
        .range(0, PAGE_SIZE - 1)

      if (filter === 'Spot') query = query.eq('market_type', 'spot')
      else if (filter === 'Futures') query = query.eq('market_type', 'futures')

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,   // 30 minutes
  })

  if (isLoading && tickers.length === 0) return <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading...</div>

  return (
    <div ref={scrollRef} style={{ maxHeight: '100%', overflowY: 'auto' }}>
      <table>
        <thead>
          <tr>
            {showRank && <th>#</th>}
            <th>Pair</th>
            {showVolume && <th className="text-right">24h Vol</th>}
          </tr>
        </thead>
        <tbody>
          {tickers.map((t, idx) => {
            const formatted = formatSymbol(t.symbol, t.market_type)
            return (
              <tr key={`${t.symbol}-${t.market_type}-${idx}`}>
                {showRank && <td className="rank">{idx + 1}</td>}
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {showCoinLogos && <CoinLogo symbol={getBaseCoin(formatted)} />}
                    <span>{formatted}</span>
                    {t.market_type === 'spot' && (
                      <span style={{ padding: '1px 4px', background: 'rgba(49,179,218,0.15)', color: 'var(--color-spot, #31b3da)', fontSize: '9px', borderRadius: '3px', fontWeight: 600 }}>SPOT</span>
                    )}
                  </div>
                </td>
                {showVolume && <td className="text-right">${formatNumber(t.volume_24h || 0)}</td>}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
