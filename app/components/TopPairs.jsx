'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { TimeSelector } from './ui/TimeSelector'
import { globalCache } from '../lib/globalCache'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function TopPairs() {
  const [filter, setFilter] = useState('All') // 'All', 'Spot', 'Futures'
  const [data, setData] = useState({ spot: [], futures: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // New Traders data for second box
  const [newestTraders, setNewestTraders] = useState([])
  const [newestTradersLoading, setNewestTradersLoading] = useState(true)
  const [newestTradersError, setNewestTradersError] = useState(null)

  // Fetch all Spot and Futures tickers (we'll sort and limit after combining)
  const loadTickers = async () => {
    // Check global cache first
    const cached = globalCache.getTickers()
    if (cached) {
      setData(cached)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const [spotResult, futuresResult] = await Promise.all([
        supabase
          .from('tickers')
          .select('*')
          .eq('market_type', 'spot')
          .order('volume_24h', { ascending: false }),
        supabase
          .from('tickers')
          .select('*')
          .eq('market_type', 'futures')
          .order('volume_24h', { ascending: false })
      ])

      if (spotResult.error) throw spotResult.error
      if (futuresResult.error) throw futuresResult.error

      const spotData = spotResult.data || []
      const futuresData = futuresResult.data || []

      const newData = {
        spot: spotData,
        futures: futuresData
      }

      // Store in global cache
      globalCache.setTickers(spotData, futuresData)

      setData(newData)
    } catch (err) {
      console.error('Failed to load tickers:', err)
      setError(err.message || 'Error loading market data')
    } finally {
      setIsLoading(false)
    }
  }

  // Load newest traders (only once on mount)
  const loadNewestTraders = async () => {
    // Check global cache first
    const cached = globalCache.getNewestTraders()
    if (cached) {
      setNewestTraders(cached)
      setNewestTradersLoading(false)
      return
    }

    setNewestTradersLoading(true)
    setNewestTradersError(null)

    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('first_trade_ts_ms', { ascending: false, nullsFirst: false })
        .limit(10)

      if (error) throw error

      // Sort manually to ensure nulls go to the end
      const sorted = (data || []).sort((a, b) => {
        if (!a.first_trade_ts_ms && !b.first_trade_ts_ms) return 0
        if (!a.first_trade_ts_ms) return 1 // nulls go to end
        if (!b.first_trade_ts_ms) return -1
        return (b.first_trade_ts_ms || 0) - (a.first_trade_ts_ms || 0) // newest first
      })

      // Store in global cache
      globalCache.setNewestTraders(sorted)

      setNewestTraders(sorted)
    } catch (err) {
      console.error('Failed to load newest traders:', err)
      setNewestTradersError(err.message || 'Error loading newest traders')
    } finally {
      setNewestTradersLoading(false)
    }
  }

  useEffect(() => {
    // Initial load only
    loadTickers()
    loadNewestTraders()
  }, [])

  const formatNumber = (num) => {
    if (!num && num !== 0) return '0.00'
    const n = parseFloat(num)
    if (Math.abs(n) >= 1000000) {
      return `${(n / 1000000).toFixed(2)}M`
    }
    if (Math.abs(n) >= 1000) {
      return `${(n / 1000).toFixed(2)}K`
    }
    return n.toFixed(2)
  }

  // Format symbol name: vTON_vUSDC -> TON/USDC (spot) or TON-USDC (futures)
  // Also handles WSOSO -> SOSO (remove W prefix)
  const formatSymbol = (symbol, marketType) => {
    if (!symbol) return 'N/A'
    
    // Remove 'W' prefix if present (WSOSO -> SOSO)
    let formatted = symbol.replace(/^W/g, '')
    
    // Remove 'v' prefix from each token (vTON_vUSDC -> TON_USDC)
    formatted = formatted.replace(/v([A-Z0-9]+)/g, '$1')
    
    // Replace '_' with '/' for spot or '-' for futures
    if (marketType === 'spot') {
      formatted = formatted.replace(/_/g, '/')
    } else {
      formatted = formatted.replace(/_/g, '-')
    }
    
    return formatted
  }

  // Get combined and sorted data based on filter
  const getDisplayTickers = () => {
    if (filter === 'All') {
      // Combine spot and futures, sort by volume, take top 10
      const combined = [
        ...data.spot.map(t => ({ ...t, market_type: 'spot' })),
        ...data.futures.map(t => ({ ...t, market_type: 'futures' }))
      ]
        .sort((a, b) => (b.volume_24h || 0) - (a.volume_24h || 0))
        .slice(0, 10)
      return combined
    } else if (filter === 'Spot') {
      return data.spot.slice(0, 10).map(t => ({ ...t, market_type: 'spot' }))
    } else {
      return data.futures.slice(0, 10).map(t => ({ ...t, market_type: 'futures' }))
    }
  }

  const displayTickers = getDisplayTickers()

  const renderTable = () => (
    <div className="top-pairs-table-wrapper">
      <table className="top-pairs-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Pair</th>
            <th className="text-right">24h Volume</th>
          </tr>
        </thead>
        <tbody>
          {displayTickers.length === 0 ? (
            <tr>
              <td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                No pairs found
              </td>
            </tr>
          ) : (
            displayTickers.map((ticker, idx) => {
              const isSpot = ticker.market_type === 'spot'
              const formattedSymbol = formatSymbol(ticker.symbol, ticker.market_type)
              
              return (
                <tr key={`${ticker.symbol}-${ticker.market_type}-${idx}`}>
                  <td className="rank">{idx + 1}</td>
                  <td className="pair-symbol">
                    <span>{formattedSymbol}</span>
                    {isSpot && (
                      <span 
                        className="spot-tag"
                        style={{
                          marginLeft: '8px',
                          padding: '2px 6px',
                          background: 'var(--color-spot-bg)',
                          color: 'var(--color-spot)',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          border: 'none'
                        }}
                      >
                        spot
                      </span>
                    )}
                  </td>
                  <td className="text-right volume">${formatNumber(ticker.volume_24h || 0)}</td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )

  // Get heading text based on filter
  const getHeading = () => {
    if (filter === 'All') return 'Top 10 pairs'
    if (filter === 'Spot') return 'Top 10 Spot Pairs'
    return 'Top 10 Futures Pairs'
  }

  // Time ago function
  const timeAgo = (ms) => {
    if (!ms || ms === null || ms === undefined) return 'Unknown'
    const seconds = Math.floor((Date.now() - ms) / 1000)
    if (seconds < 60) return 'Just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    return `${Math.floor(minutes / 60)}h ago`
  }

  // Format wallet address - full by default, truncate only on small screens
  const formatWallet = (address) => {
    if (!address) return 'N/A'
    return address // Show full address by default
  }

  // Truncated wallet format for small screens: 0x + 4 chars + ... + 4 chars
  const formatWalletTruncated = (address) => {
    if (!address) return 'N/A'
    if (address.startsWith('0x')) {
      const withoutPrefix = address.slice(2)
      if (withoutPrefix.length <= 8) return address
      return `0x${withoutPrefix.slice(0, 4)}...${withoutPrefix.slice(-4)}`
    }
    // If no 0x prefix, just truncate normally
    if (address.length <= 12) return address
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  // Render New Traders table
  const renderNewTradersTable = () => (
    <div className="top-pairs-table-wrapper">
      <table className="top-pairs-table">
        <thead>
          <tr>
            <th>Wallet</th>
            <th className="text-right">First Trade</th>
          </tr>
        </thead>
        <tbody>
          {newestTradersLoading ? (
            <tr>
              <td colSpan="2" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                Loading...
              </td>
            </tr>
          ) : newestTradersError ? (
            <tr>
              <td colSpan="2" style={{ textAlign: 'center', padding: '20px', color: '#f44336' }}>
                {newestTradersError}
              </td>
            </tr>
          ) : newestTraders.length === 0 ? (
            <tr>
              <td colSpan="2" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                No traders found
              </td>
            </tr>
          ) : (
            newestTraders.map((trader, idx) => (
              <tr key={trader.wallet_address || idx}>
                <td className="pair-symbol" style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                  <span className="wallet-full">{formatWallet(trader.wallet_address)}</span>
                  <span className="wallet-truncated">{formatWalletTruncated(trader.wallet_address)}</span>
                </td>
                <td className="text-right" style={{ color: '#888', fontSize: '13px' }}>
                  {timeAgo(trader.first_trade_ts_ms)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
      {/* First box - with data */}
      <div className="top-pairs-card">
        <div className="top-pairs-header">
          <h2>{getHeading()}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <TimeSelector
              value={filter}
              onValueChange={setFilter}
              options={['All', 'Spot', 'Futures']}
            />
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            Loading pairs...
          </div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#f44336' }}>
            Error loading market data
          </div>
        ) : (
          renderTable()
        )}
      </div>

      {/* Second box - New Traders */}
      <div className="top-pairs-card">
        <div className="top-pairs-header">
          <h2>New Traders</h2>
        </div>
        {renderNewTradersTable()}
      </div>
    </div>
  )
}
