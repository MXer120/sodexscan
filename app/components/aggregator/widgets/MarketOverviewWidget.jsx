'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { perpsTickers, spotTickers } from '../../../lib/sodexApi'

const REFRESH_MS = 30_000

const normalizeTicker = (t) => {
  if (!t) return t
  return {
    ...t,
    lastPrice: t.lastPrice ?? t.last ?? t.price ?? t.markPrice ?? null,
    priceChangePercent: t.priceChangePercent ?? t.change24h ?? t.priceChange ?? null,
    volume: t.volume ?? t.quoteVolume ?? t.volume24h ?? t.turnover24h ?? null,
  }
}

const fmtPrice = (v) => {
  const n = parseFloat(v)
  if (!n && n !== 0) return '-'
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (n >= 1) return '$' + n.toFixed(4)
  return '$' + n.toPrecision(4)
}

const fmtVol = (v) => {
  const n = parseFloat(v)
  if (!n) return '-'
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K'
  return '$' + n.toFixed(2)
}

const fmtPct = (v) => {
  const n = parseFloat(v)
  if (!n && n !== 0) return '-'
  const sign = n > 0 ? '+' : ''
  return sign + n.toFixed(2) + '%'
}

export default function MarketOverviewWidget({ settings }) {
  const [tab, setTab] = useState('combined')
  const [data, setData] = useState({ perps: [], spot: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sortField, setSortField] = useState(null)
  const [sortDir, setSortDir] = useState('desc')

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const [perps, spot] = await Promise.all([
        perpsTickers().catch(() => []),
        spotTickers().catch(() => []),
      ])
      setData({
        perps: Array.isArray(perps) ? perps.map(normalizeTicker) : [],
        spot: Array.isArray(spot) ? spot.map(normalizeTicker) : [],
      })
    } catch (err) {
      console.error('MarketOverviewWidget fetch error', err)
      setError('Failed to load market data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const iv = setInterval(fetchData, REFRESH_MS)
    return () => clearInterval(iv)
  }, [fetchData])

  const rows = tab === 'combined' ? [...data.perps, ...data.spot] : tab === 'perps' ? data.perps : data.spot

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const sortedRows = useMemo(() => {
    if (!sortField) return rows
    return [...rows].sort((a, b) => {
      let av, bv
      if (sortField === 'symbol') {
        av = (a.symbol || a.pair || a.name || '').toLowerCase()
        bv = (b.symbol || b.pair || b.name || '').toLowerCase()
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      if (sortField === 'price') {
        av = parseFloat(a.lastPrice ?? 0)
        bv = parseFloat(b.lastPrice ?? 0)
      } else if (sortField === 'change') {
        av = parseFloat(a.priceChangePercent ?? 0)
        bv = parseFloat(b.priceChangePercent ?? 0)
      } else if (sortField === 'volume') {
        av = parseFloat(a.volume ?? 0)
        bv = parseFloat(b.volume ?? 0)
      }
      return sortDir === 'asc' ? av - bv : bv - av
    })
  }, [rows, sortField, sortDir])

  const tabBtn = (key, label) => (
    <button
      key={key}
      onClick={() => setTab(key)}
      style={{
        padding: '4px 12px',
        borderRadius: 6,
        border: '1px solid var(--color-border-subtle)',
        background: tab === key ? 'var(--color-primary)' : 'transparent',
        color: tab === key ? '#fff' : 'var(--color-text-secondary)',
        fontSize: 12,
        cursor: 'pointer',
        fontWeight: tab === key ? 600 : 400,
      }}
    >
      {label}
    </button>
  )

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', fontSize: 13 }}>
        Loading market data...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-danger)', fontSize: 13 }}>
        {error}
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '8px 12px', boxSizing: 'border-box' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {tabBtn('combined', 'Combined')}
        {tabBtn('perps', 'Perps')}
        {tabBtn('spot', 'Spot')}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--color-text-muted)', alignSelf: 'center' }}>
          {sortedRows.length} pairs
        </span>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ position: 'sticky', top: 0, background: 'var(--color-bg-card)', zIndex: 1 }}>
              <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => handleSort('symbol')}>
                Symbol {sortField === 'symbol' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th style={{ ...thStyle, textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('price')}>
                Last Price {sortField === 'price' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th style={{ ...thStyle, textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('change')}>
                24h Change {sortField === 'change' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th style={{ ...thStyle, textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('volume')}>
                24h Volume {sortField === 'volume' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: 16, color: 'var(--color-text-muted)', fontSize: 12 }}>
                  No data available
                </td>
              </tr>
            )}
            {sortedRows.map((t, i) => {
              const sym = t.symbol || t.pair || t.name || '-'
              const change = parseFloat(t.priceChangePercent ?? 0)
              return (
                <tr key={sym + '-' + i} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <td style={tdStyle}>{sym}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtPrice(t.lastPrice)}</td>
                  <td style={{
                    ...tdStyle,
                    textAlign: 'right',
                    color: change > 0 ? 'var(--color-success)' : change < 0 ? 'var(--color-danger)' : 'var(--color-text-secondary)',
                  }}>
                    {fmtPct(change)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtVol(t.volume)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const thStyle = {
  textAlign: 'left',
  padding: '6px 8px',
  color: 'var(--color-text-secondary)',
  fontWeight: 600,
  fontSize: 11,
  borderBottom: '1px solid var(--color-border-subtle)',
}

const tdStyle = {
  padding: '5px 8px',
  color: 'var(--color-text-main)',
}
