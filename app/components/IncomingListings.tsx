'use client'

import { useEffect, useState } from 'react'
import { TimeSelector } from './ui/TimeSelector'
import { globalCache } from '../lib/globalCache'
import { SkeletonIncomingListings } from './Skeleton'
import { THEME_COLORS } from '../lib/themeColors'

// Set document title
if (typeof document !== 'undefined') {
  document.title = 'Incoming Listings | CommunityScan SoDEX'
}

const LOGO_BASE_URL = 'https://yifkydhsbflzfprteots.supabase.co/storage/v1/object/public/coin-logos/'

const LOGO_EXTENSIONS = {
  hype: 'jpg', pump: 'jpg', trump: 'jpg', wld: 'jpg', xlm: 'jpg', ton: 'jpg',
  mag7: 'png', soso: 'png', silver: 'svg', wif: 'jpeg'
}

const LOGO_ALIASES = {
  mag7ssi: 'mag7', pepe: '1000pepe', shib: '1000shib', bonk: '1000bonk',
  arbitrum: 'arb'
}

const getCoinLogoUrl = (symbol) => {
  if (!symbol) return null
  let lower = symbol.toLowerCase()
  if (LOGO_ALIASES[lower]) lower = LOGO_ALIASES[lower]
  const ext = LOGO_EXTENSIONS[lower] || 'png'
  return `${LOGO_BASE_URL}${lower}.${ext}`
}

const getBaseCoin = (symbol) => {
  if (!symbol) return null
  const parts = symbol.split(/[\/\-\.]/)
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

export default function IncomingListings() {
  const [filter, setFilter] = useState('All')
  const [futures, setFutures] = useState([])
  const [spot, setSpot] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchListings = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch('https://alpha-biz.sodex.dev/biz/config/symbol')
        const json = await res.json()

        if (json.code === 0 && json.data) {
          setFutures(json.data.futures || [])
          setSpot(json.data.spot || [])
        } else {
          throw new Error(json.msg || 'Failed to fetch listings')
        }
      } catch (err) {
        console.error('Failed to load incoming listings:', err)
        setError(err.message || 'Error loading listings')
      } finally {
        setIsLoading(false)
      }
    }

    fetchListings()
  }, [])

  const getFilteredListings = () => {
    if (filter === 'Spot') {
      return spot.map(s => ({ symbol: s, type: 'spot' }))
    }
    if (filter === 'Futures') {
      return futures.map(f => ({ symbol: f, type: 'futures' }))
    }
    // All - combine both
    return [
      ...spot.map(s => ({ symbol: s, type: 'spot' })),
      ...futures.map(f => ({ symbol: f, type: 'futures' }))
    ]
  }

  const getHeading = () => {
    if (filter === 'All') return 'Upcoming Listings'
    if (filter === 'Spot') return 'Upcoming Spot Listings'
    return 'Upcoming Futures Listings'
  }

  const listings = getFilteredListings()

  return (
    <div className="incoming-container">
      <div className="incoming-content">
        <div className="incoming-header">
          <h1>{getHeading()}</h1>
          <TimeSelector
            value={filter}
            onValueChange={setFilter}
            options={['All', 'Spot', 'Futures']}
          />
        </div>

        {isLoading ? (
          <div className="incoming-table-wrapper">
            <SkeletonIncomingListings rows={10} />
          </div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: THEME_COLORS.error }}>
            {error}
          </div>
        ) : listings.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: THEME_COLORS.textDark }}>
            No upcoming listings
          </div>
        ) : (
          <div className="incoming-table-wrapper">
            <table className="incoming-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Symbol</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((item, idx) => {
                  const baseCoin = getBaseCoin(item.symbol)
                  const isSpot = item.type === 'spot'

                  return (
                    <tr key={`${item.symbol}-${item.type}`}>
                      <td className="rank">{idx + 1}</td>
                      <td className="symbol-cell">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CoinLogo symbol={baseCoin} />
                          <span>{item.symbol}</span>
                        </div>
                      </td>
                      <td className="type-cell">
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          background: isSpot ? 'var(--color-spot-bg)' : 'color-mix(in oklch, var(--color-blue) 15%, transparent)',
                          color: isSpot ? 'var(--color-spot)' : THEME_COLORS.blue
                        }}>
                          {isSpot ? 'Spot' : 'Futures'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
