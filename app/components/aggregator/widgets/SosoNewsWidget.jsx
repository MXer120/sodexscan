'use client'
import { useState, useEffect, useCallback } from 'react'

const CURRENCIES = ['BTC', 'ETH', 'SOL']

const fmtAge = (str) => {
  if (!str) return ''
  const diff = Date.now() - new Date(str).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function SosoNewsWidget() {
  const [currency, setCurrency] = useState('BTC')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/sosovalue?module=news&key=trending')
      if (!res.ok) throw new Error('No news data')
      const json = await res.json()
      const list = Array.isArray(json.data) ? json.data : (json.data?.items ?? json.data?.list ?? [])
      setItems(list)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = items.filter(item => {
    const tags = item.tags ?? item.currencies ?? item.symbols ?? []
    if (!tags.length) return true
    return tags.some(t => (typeof t === 'string' ? t : t.code ?? t.symbol ?? '').toUpperCase() === currency)
  })

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingInline: 4 }}>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Market News</div>
        <div style={{ display: 'flex', gap: 3 }}>
          {CURRENCIES.map(c => (
            <button key={c} onClick={() => setCurrency(c)} style={{
              fontSize: 10, padding: '2px 7px', borderRadius: 4, cursor: 'pointer', border: 'none',
              background: currency === c ? 'var(--accent)' : 'var(--bg-hover)',
              color: currency === c ? '#fff' : 'var(--text-secondary)',
            }}>{c}</button>
          ))}
        </div>
      </div>

      {loading && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>Loading…</div>}
      {error && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: 12 }}>{error}</div>}

      {!loading && !error && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1, paddingInline: 4 }}>
          {(filtered.length ? filtered : items).slice(0, 20).map((item, i) => (
            <a
              key={i}
              href={item.url ?? item.link ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none', padding: '7px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-start' }}
            >
              {item.imageUrl && (
                <img src={item.imageUrl} alt="" width={36} height={36} style={{ borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--text-primary, var(--text))', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {item.title ?? item.headline ?? 'News'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {item.source ?? item.sourceName ?? ''}{' · '}{fmtAge(item.publishedAt ?? item.date ?? item.publishTime)}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      <div style={{ fontSize: 10, color: 'var(--text-tertiary, var(--text-secondary))', textAlign: 'right', paddingInline: 4 }}>
        Data: <a href="https://sosovalue.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>SoSoValue</a>
      </div>
    </div>
  )
}
