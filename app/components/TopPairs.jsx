'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { TimeSelector } from './ui/TimeSelector'
import { SkeletonTopPairsTable, SkeletonNewTradersTable } from './Skeleton'
import { globalCache } from '../lib/globalCache'

const LOGO_BASE_URL = 'https://yifkydhsbflzfprteots.supabase.co/storage/v1/object/public/coin-logos/'
const PAGE_SIZE = 10

const LOGO_EXTENSIONS = {
  hype: 'jpg', pump: 'jpg', trump: 'jpg', wld: 'jpg', xlm: 'jpg', ton: 'jpg',
  mag7: 'png', soso: 'png', silver: 'svg', wif: 'jpeg'
}

// Map symbol aliases to their logo file names
const LOGO_ALIASES = {
  mag7ssi: 'mag7', pepe: '1000pepe', shib: '1000shib', bonk: '1000bonk',
  arbitrum: 'arb'
}

const getCoinLogoUrl = (symbol) => {
  if (!symbol) return null
  let lower = symbol.toLowerCase()
  // Apply aliases
  if (LOGO_ALIASES[lower]) lower = LOGO_ALIASES[lower]
  const ext = LOGO_EXTENSIONS[lower] || 'png'
  return `${LOGO_BASE_URL}${lower}.${ext}`
}

const getBaseCoin = (formattedSymbol) => {
  if (!formattedSymbol) return null
  const parts = formattedSymbol.split(/[\/\-\.]/)
  return parts[0] || null
}

function CoinLogo({ symbol }) {
  const logoUrl = getCoinLogoUrl(symbol)
  const [show, setShow] = useState(() => {
    if (!logoUrl) return false
    const cached = globalCache.getCoinLogoStatus(logoUrl)
    return cached === null ? true : cached
  })

  if (!logoUrl || !show) return null

  return (
    <img
      src={logoUrl}
      alt={symbol}
      style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }}
      onLoad={() => globalCache.setCoinLogoStatus(logoUrl, true)}
      onError={() => { globalCache.setCoinLogoStatus(logoUrl, false); setShow(false) }}
    />
  )
}

export default function TopPairs() {
  const [filter, setFilter] = useState('All')
  const [tickers, setTickers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const scrollRef = useRef(null)

  const [newestTraders, setNewestTraders] = useState([])
  const [newestTradersLoading, setNewestTradersLoading] = useState(true)
  const [newestTradersError, setNewestTradersError] = useState(null)

  // Fetch tickers page
  const loadTickers = useCallback(async (offset = 0, append = false, attempt = 0) => {
    if (offset === 0) {
      setIsLoading(true)
      if (!append) setTickers([])
    } else {
      setIsLoadingMore(true)
    }
    setError(null)

    try {
      let query = supabase
        .from('tickers')
        .select('symbol, market_type, volume_24h')
        .order('volume_24h', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)

      if (filter === 'Spot') query = query.eq('market_type', 'spot')
      else if (filter === 'Futures') query = query.eq('market_type', 'futures')

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      const results = data || []
      setHasMore(results.length === PAGE_SIZE)

      if (append) {
        setTickers(prev => [...prev, ...results])
      } else {
        setTickers(results)
      }
    } catch (err) {
      if (err?.name === 'AbortError') return
      if (attempt < 2) {
        // Retry up to 2 times with backoff
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
        return loadTickers(offset, append, attempt + 1)
      }
      console.error('Failed to load tickers:', err)
      setError('Error loading market data')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [filter])

  // Reset and load when filter changes
  useEffect(() => {
    setHasMore(true)
    loadTickers(0, false)
  }, [filter, loadTickers])

  const loadNewestTraders = async () => {
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
        .select('wallet_address, first_trade_ts_ms')
        .not('first_trade_ts_ms', 'is', null)
        .order('first_trade_ts_ms', { ascending: false })
        .limit(10)

      if (error) throw error

      const results = data || []
      globalCache.setNewestTraders(results)
      setNewestTraders(results)
    } catch (err) {
      if (err?.name === 'AbortError') return
      console.error('Failed to load newest traders:', err)
      setNewestTradersError('Could not load')
    } finally {
      setNewestTradersLoading(false)
    }
  }

  useEffect(() => {
    loadNewestTraders()
  }, [])

  const handleScroll = useCallback((e) => {
    if (isLoadingMore || !hasMore) return
    const { scrollTop, scrollHeight, clientHeight } = e.target
    if (scrollHeight - scrollTop - clientHeight < 50) {
      loadTickers(tickers.length, true)
    }
  }, [isLoadingMore, hasMore, tickers.length, loadTickers])

  const formatNumber = (num) => {
    if (!num && num !== 0) return '0.00'
    const n = parseFloat(num)
    if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(2)}M`
    if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(2)}K`
    return n.toFixed(2)
  }

  const formatSymbol = (symbol, marketType) => {
    if (!symbol) return 'N/A'
    // Only remove W prefix for WSOSO specifically
    let formatted = symbol.replace(/^WSOSO/g, 'SOSO')
    // Remove 'v' prefix from each token (vTON_vUSDC -> TON_USDC)
    formatted = formatted.replace(/v([A-Z0-9]+)/g, '$1')
    // Replace '_' with '/' for spot or '-' for futures
    formatted = formatted.replace(/_/g, marketType === 'spot' ? '/' : '-')
    return formatted
  }

  const getHeading = () => {
    if (filter === 'All') return 'Top Pairs'
    if (filter === 'Spot') return 'Top Spot Pairs'
    return 'Top Futures Pairs'
  }

  const timeAgo = (ms) => {
    if (!ms) return 'Unknown'
    const seconds = Math.floor((Date.now() - ms) / 1000)
    if (seconds < 60) return 'Just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    return `${Math.floor(minutes / 60)}h ago`
  }

  const formatWallet = (address) => address || 'N/A'

  const formatWalletTruncated = (address) => {
    if (!address) return 'N/A'
    if (address.startsWith('0x')) {
      const withoutPrefix = address.slice(2)
      if (withoutPrefix.length <= 8) return address
      return `0x${withoutPrefix.slice(0, 4)}...${withoutPrefix.slice(-4)}`
    }
    if (address.length <= 12) return address
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  const renderTable = () => (
    <div
      ref={scrollRef}
      className="top-pairs-table-wrapper"
      style={{ maxHeight: '480px', overflowY: 'auto' }}
      onScroll={handleScroll}
    >
      <table className="top-pairs-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Pair</th>
            <th className="text-right">24h Volume</th>
          </tr>
        </thead>
        <tbody>
          {tickers.length === 0 && !isLoading ? (
            <tr>
              <td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                No pairs found
              </td>
            </tr>
          ) : (
            tickers.map((ticker, idx) => {
              const isSpot = ticker.market_type === 'spot'
              const formattedSymbol = formatSymbol(ticker.symbol, ticker.market_type)
              const baseCoin = getBaseCoin(formattedSymbol)

              return (
                <tr key={`${ticker.symbol}-${ticker.market_type}-${idx}`}>
                  <td className="rank">{idx + 1}</td>
                  <td className="pair-symbol">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CoinLogo symbol={baseCoin} />
                      <span>{formattedSymbol}</span>
                      {isSpot && (
                        <span
                          className="spot-tag"
                          style={{
                            marginLeft: '4px',
                            padding: '2px 6px',
                            background: 'var(--color-spot-bg)',
                            color: 'var(--color-spot)',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            border: '1px solid rgba(var(--color-primary-rgb), 0.2)'
                          }}
                        >
                          spot
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-right volume">${formatNumber(ticker.volume_24h || 0)}</td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
      {isLoadingMore && (
        <SkeletonTopPairsTable rows={5} />
      )}
      {hasMore && !isLoadingMore && tickers.length > 0 && (
        <div style={{ textAlign: 'center', padding: '10px', color: '#666', fontSize: '12px' }}>
          Scroll for more...
        </div>
      )}
    </div>
  )

  const renderNewTradersTable = () => (
    <div className="top-pairs-table-wrapper">
      {newestTradersLoading ? (
        <SkeletonNewTradersTable rows={10} />
      ) : (
      <table className="top-pairs-table">
        <thead>
          <tr>
            <th>Wallet</th>
            <th className="text-right">First Trade</th>
          </tr>
        </thead>
        <tbody>
          {newestTradersError ? (
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
      )}
    </div>
  )

  return (
    <div className="top-pairs-grid">
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
          <SkeletonTopPairsTable rows={10} />
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#f44336' }}>
            Error loading market data
          </div>
        ) : (
          renderTable()
        )}
      </div>

      <div className="top-pairs-card">
        <div className="top-pairs-header">
          <h2>New Traders</h2>
        </div>
        {renderNewTradersTable()}
      </div>
    </div>
  )
}
