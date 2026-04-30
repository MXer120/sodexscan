'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'

const fmt = (n) => {
  if (n == null) return '-'
  const abs = Math.abs(n)
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  return n.toFixed(0)
}

const fmtUSD = (n) => n == null ? '-' : '$' + fmt(n)

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          <span>{p.name}</span>
          <span>{fmtUSD(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

async function fetchFlows(asset) {
  const res = await fetch(`/api/sosovalue?module=etf&key=${asset.toLowerCase()}_flows`)
  if (!res.ok) return null
  const json = await res.json()
  return json.data
}

export default function SosoEtfFlowsWidget() {
  const [asset, setAsset] = useState('BTC')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const raw = await fetchFlows(asset)
      if (!raw) throw new Error('No data')
      // Normalise: expect array of {date, netFlow} or similar
      const rows = Array.isArray(raw) ? raw : (raw.items ?? raw.list ?? [])
      let cumulative = 0
      const processed = rows.slice(-30).map(r => {
        const netFlow = r.netFlow ?? r.net_flow ?? r.inflow ?? 0
        cumulative += netFlow
        return {
          date: r.date ?? r.day ?? r.timestamp ?? '',
          netFlow,
          cumulative,
        }
      })
      setData(processed)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [asset])

  useEffect(() => { load() }, [load])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingInline: 4 }}>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          Spot-ETF Net Flows (30d)
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['BTC', 'ETH'].map(a => (
            <button
              key={a}
              onClick={() => setAsset(a)}
              style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 4, cursor: 'pointer',
                background: asset === a ? 'var(--accent)' : 'var(--bg-hover)',
                color: asset === a ? '#fff' : 'var(--text-secondary)',
                border: 'none'
              }}
            >{a}</button>
          ))}
        </div>
      </div>

      {loading && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>Loading…</div>}
      {error && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: 12 }}>{error}</div>}

      {!loading && !error && (
        <div style={{ flex: 1, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis yAxisId="left" tickFormatter={v => fmtUSD(v)} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} width={55} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={v => fmtUSD(v)} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} width={55} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine yAxisId="left" y={0} stroke="var(--border)" />
              <Bar yAxisId="left" dataKey="netFlow" name="Net Flow" fill="#3b82f6" radius={[2, 2, 0, 0]}
                label={false}
              />
              <Line yAxisId="right" type="monotone" dataKey="cumulative" name="Cumulative" stroke="#f59e0b" dot={false} strokeWidth={1.5} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ fontSize: 10, color: 'var(--text-tertiary, var(--text-secondary))', textAlign: 'right', paddingInline: 4 }}>
        Data: <a href="https://sosovalue.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>SoSoValue</a>
      </div>
    </div>
  )
}
