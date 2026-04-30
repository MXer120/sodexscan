'use client'
import { useState, useEffect, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899']

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          <span>{p.name}</span>
          <span>{p.value?.toFixed ? p.value.toFixed(2) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function SosoIndexWidget() {
  type IndexEntry = { id?: string; indexId?: string; code?: string; name?: string; indexName?: string; priceHistory?: Array<{ date?: string; day?: string; time?: string; price?: number; value?: number; close?: number }>; history?: Array<{ date?: string; day?: string; time?: string; price?: number; value?: number; close?: number }> }
  const [indices, setIndices] = useState<IndexEntry[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [chartData, setChartData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/sosovalue?module=index&key=list')
      if (!res.ok) throw new Error('No index data')
      const json = await res.json()
      const list = Array.isArray(json.data) ? json.data : (json.data?.list ?? json.data?.items ?? [])
      setIndices(list.slice(0, 5))
      if (list.length > 0) setSelected([list[0].id ?? list[0].indexId ?? list[0].code])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Build chart data from index snapshots embedded in list
  useEffect(() => {
    if (!indices.length || !selected.length) return
    const activeIndices = indices.filter(idx => {
      const id = idx.id ?? idx.indexId ?? idx.code
      return selected.includes(id)
    })
    // Use priceHistory if available, else create a single-point dataset
    const allDates = new Set<string>()
    const seriesMap: Record<string, { name: string; data: Record<string, number | null> }> = {}
    activeIndices.forEach(idx => {
      const id = idx.id ?? idx.indexId ?? idx.code
      const name = idx.name ?? idx.indexName ?? id
      const history = idx.priceHistory ?? idx.history ?? []
      seriesMap[id] = { name, data: {} }
      history.forEach(h => {
        const date = h.date ?? h.day ?? h.time ?? ''
        allDates.add(date)
        seriesMap[id].data[date] = h.price ?? h.value ?? h.close ?? null
      })
    })
    const sorted = [...allDates].sort()
    const rows = sorted.map(date => {
      const row = { date }
      Object.entries(seriesMap).forEach(([id, { name, data }]) => {
        row[id] = data[date] ?? null
      })
      return row
    })
    setChartData(rows.slice(-60))
  }, [indices, selected])

  const toggleIndex = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id].slice(0, 4)
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0' }}>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', paddingInline: 4 }}>SoSoValue Crypto Indices</div>

      {loading && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>Loading…</div>}
      {error && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: 12 }}>{error}</div>}

      {!loading && !error && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingInline: 4 }}>
            {indices.map((idx, i) => {
              const id = idx.id ?? idx.indexId ?? idx.code
              const name = idx.name ?? idx.indexName ?? id
              const isOn = selected.includes(id)
              return (
                <button key={id} onClick={() => toggleIndex(id)} style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 4, cursor: 'pointer',
                  background: isOn ? COLORS[i % COLORS.length] + '33' : 'var(--bg-hover)',
                  color: isOn ? COLORS[i % COLORS.length] : 'var(--text-secondary)',
                  border: `1px solid ${isOn ? COLORS[i % COLORS.length] : 'transparent'}`,
                }}>{name}</button>
              )
            })}
          </div>

          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} width={45} />
                <Tooltip content={<CustomTooltip />} />
                {indices.map((idx, i) => {
                  const id = idx.id ?? idx.indexId ?? idx.code
                  const name = idx.name ?? idx.indexName ?? id
                  return selected.includes(id) ? (
                    <Line key={id} type="monotone" dataKey={id} name={name}
                      stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={1.5} connectNulls />
                  ) : null
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <div style={{ fontSize: 10, color: 'var(--text-tertiary, var(--text-secondary))', textAlign: 'right', paddingInline: 4 }}>
        Data: <a href="https://sosovalue.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>SoSoValue</a>
      </div>
    </div>
  )
}
