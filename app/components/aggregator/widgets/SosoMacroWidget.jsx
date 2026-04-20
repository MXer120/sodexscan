'use client'
import { useState, useEffect, useCallback } from 'react'

const IMPACT_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' }

const fmtDate = (str) => {
  if (!str) return ''
  try {
    return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return str }
}

const isPast = (str) => str ? new Date(str) < new Date() : false

export default function SosoMacroWidget() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showPast, setShowPast] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/sosovalue?module=macro&key=events')
      if (!res.ok) throw new Error('No macro data')
      const json = await res.json()
      const list = Array.isArray(json.data) ? json.data : (json.data?.items ?? json.data?.events ?? [])
      setEvents(list)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const visible = events.filter(e => showPast || !isPast(e.date ?? e.time ?? e.eventTime))

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingInline: 4 }}>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Macro Calendar</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" checked={showPast} onChange={e => setShowPast(e.target.checked)} style={{ margin: 0 }} />
          Past
        </label>
      </div>

      {loading && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>Loading…</div>}
      {error && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: 12 }}>{error}</div>}

      {!loading && !error && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingInline: 4 }}>
          {visible.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 20 }}>No upcoming events</div>}
          {visible.map((ev, i) => {
            const impact = (ev.impact ?? ev.importance ?? '').toLowerCase()
            const past = isPast(ev.date ?? ev.time ?? ev.eventTime)
            return (
              <div key={i} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start', padding: '7px 8px',
                borderRadius: 6, background: 'var(--bg-hover)',
                opacity: past ? 0.55 : 1,
                borderLeft: `3px solid ${IMPACT_COLOR[impact] ?? 'var(--border)'}`,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-primary, var(--text))', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ev.name ?? ev.title ?? ev.event ?? 'Event'}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 1 }}>
                    {ev.country ?? ''}{ev.country ? ' · ' : ''}{fmtDate(ev.date ?? ev.time ?? ev.eventTime)}
                  </div>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  {ev.actual != null && <div style={{ fontSize: 11, color: '#22c55e' }}>Act: {ev.actual}</div>}
                  {ev.forecast != null && <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Fcst: {ev.forecast}</div>}
                  {ev.previous != null && <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Prev: {ev.previous}</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ fontSize: 10, color: 'var(--text-tertiary, var(--text-secondary))', textAlign: 'right', paddingInline: 4 }}>
        Data: <a href="https://sosovalue.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>SoSoValue</a>
      </div>
    </div>
  )
}
