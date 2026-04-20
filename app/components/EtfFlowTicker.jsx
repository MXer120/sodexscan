'use client'
import { useState, useEffect } from 'react'

const fmtUSD = (n) => {
  if (n == null || isNaN(n)) return '—'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : '+'
  if (abs >= 1e9) return sign + '$' + (abs / 1e9).toFixed(2) + 'B'
  if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(1) + 'M'
  return sign + '$' + abs.toFixed(0)
}

function Chip({ label, value, loading }) {
  const positive = value > 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label} ETF</span>
      {loading
        ? <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>…</span>
        : <span style={{ fontSize: 12, fontWeight: 600, color: value == null ? 'var(--text-secondary)' : positive ? '#22c55e' : '#ef4444' }}>
            {fmtUSD(value)}
          </span>
      }
      {!loading && value != null && (
        <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>today</span>
      )}
    </div>
  )
}

export default function EtfFlowTicker() {
  const [btc, setBtc] = useState(null)
  const [eth, setEth] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [rBtc, rEth] = await Promise.all([
          fetch('/api/sosovalue?module=etf&key=btc_snapshot').then(r => r.ok ? r.json() : null),
          fetch('/api/sosovalue?module=etf&key=eth_snapshot').then(r => r.ok ? r.json() : null),
        ])
        if (cancelled) return
        const extractFlow = (json) => {
          if (!json?.data) return null
          const d = json.data
          return d.todayNetFlow ?? d.netFlow ?? d.todayNetInflow ?? d.netInflow ?? null
        }
        setBtc(extractFlow(rBtc))
        setEth(extractFlow(rEth))
      } catch {}
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap', margin: '-24px 0 24px' }}>
      <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Spot-ETF net flows:</span>
      <Chip label="BTC" value={btc} loading={loading} />
      <Chip label="ETH" value={eth} loading={loading} />
      <a href="https://sosovalue.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>via SoSoValue ↗</a>
    </div>
  )
}
