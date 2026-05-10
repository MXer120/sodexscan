'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ToolDetailModal from './ToolDetailModal'
import '../../styles/ToolsPage.css'

function SearchIcon() {
  return (
    <svg className="tp-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function groupByCategory(list) {
  const map = new Map()
  for (const t of list) {
    const cats = (t.categories?.length) ? t.categories : [t.category]
    for (const cat of cats) {
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat).push(t)
    }
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
}

function categorySlug(name) {
  return 'cat-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function ToolCard({ tool, onOpen }) {
  return (
    <button
      type="button"
      className={`tp-card${tool.status === 'planned' ? ' planned' : ''}`}
      onClick={() => onOpen(tool.id)}
    >
      <div className="tp-card-head">
        <div style={{ minWidth: 0 }}>
          <h3 className="tp-card-name">{tool.name}</h3>
          <div className="tp-card-id">{tool.id}</div>
        </div>
        {tool.verified && (
          <div className="tp-verified" title="Data verified — all token prices confirmed correct">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>
      <div className="tp-card-desc">{tool.shortDescription || tool.longDescription || '—'}</div>
      <div className="tp-card-chips">
        <span className={`tp-chip tp-chip--${tool.status}`}>{tool.status === 'available' ? 'Available' : 'Planned'}</span>
        <span className={`tp-chip tp-chip--${tool.tier ?? 'public'}`}>{tool.tier ?? 'public'}</span>
        <span className={`tp-chip tp-chip--${tool.mutates ? 'write' : 'read'}`}>{tool.mutates ? 'Write' : 'Read'}</span>
        {tool.destructive && <span className="tp-chip tp-chip--destructive">destructive</span>}
      </div>
    </button>
  )
}

export default function ToolsPage({
  categoryFilter = null,
  onCategoriesLoaded = null,
  basePath = '/tools',
  extraParams = {},
  onOpenTool: onOpenToolProp,
  onCloseTool: onCloseToolProp,
}: {
  categoryFilter?: string | null;
  onCategoriesLoaded?: ((cats: { name: string; count: number }[]) => void) | null;
  basePath?: string;
  extraParams?: Record<string, string>;
  onOpenTool?: (id: string) => void;
  onCloseTool?: () => void;
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [tools, setTools] = useState([])
  const [loadErr, setLoadErr] = useState(null)
  const [tab, setTab] = useState('available')
  const [query, setQuery] = useState('')
  const [tierFilter, setTierFilter] = useState('all')
  const [kindFilter, setKindFilter] = useState('all')
  const [category, setCategory] = useState('all')
  const [openId, setOpenId] = useState(null)

  // Use external filter when provided
  const effectiveCategory = categoryFilter ?? category

  // Load manifest
  useEffect(() => {
    let abort = false
    fetch('/api/tools', { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(json => {
        if (abort) return
        if (Array.isArray(json?.tools)) setTools(json.tools)
        else setLoadErr('Manifest response malformed')
      })
      .catch(err => { if (!abort) setLoadErr(err?.message ?? 'Failed to load manifest') })
    return () => { abort = true }
  }, [])

  const toolById = useMemo(() => Object.fromEntries(tools.map(t => [t.id, t])), [tools])

  // Deep-link: ?tool=<id> opens modal
  useEffect(() => {
    const id = searchParams.get('tool')
    if (id && toolById[id]) setOpenId(id)
    else setOpenId(null)
  }, [searchParams, toolById])

  const openTool = useCallback((id: string) => {
    if (onOpenToolProp) { onOpenToolProp(id); return }
    const sp = new URLSearchParams(searchParams?.toString() ?? '')
    Object.entries(extraParams).forEach(([k, v]) => sp.set(k, v))
    sp.set('tool', id)
    router.replace(`${basePath}?${sp.toString()}`, { scroll: false })
  }, [router, searchParams, basePath, extraParams, onOpenToolProp])

  const closeTool = useCallback(() => {
    if (onCloseToolProp) { onCloseToolProp(); return }
    const sp = new URLSearchParams(searchParams?.toString() ?? '')
    sp.delete('tool')
    router.replace(`${basePath}${sp.toString() ? `?${sp.toString()}` : ''}`, { scroll: false })
  }, [router, searchParams, basePath, onCloseToolProp])

  const counts = useMemo(() => {
    let available = 0, planned = 0
    for (const t of tools) {
      if (t.status === 'available') available++
      else planned++
    }
    return { available, planned }
  }, [tools])

  // Notify parent of available categories when tools load
  useEffect(() => {
    if (!onCategoriesLoaded || tools.length === 0) return
    const seen = new Map<string, number>()
    for (const t of tools) {
      const cats = (t.categories?.length) ? t.categories : [t.category]
      for (const c of cats) seen.set(c, (seen.get(c) ?? 0) + 1)
    }
    onCategoriesLoaded([...seen.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([name, count]) => ({ name, count })))
  }, [tools, onCategoriesLoaded])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tools.filter(t => {
      if (tab === 'available' && t.status !== 'available') return false
      if (tab === 'planned' && t.status !== 'planned') return false
      if (effectiveCategory !== 'all' && t.category !== effectiveCategory) return false
      if (tierFilter !== 'all' && (t.tier ?? 'public') !== tierFilter) return false
      if (tab === 'available') {
        if (kindFilter === 'read' && t.mutates) return false
        if (kindFilter === 'write' && !t.mutates) return false
      }
      if (!q) return true
      return (
        t.id.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.shortDescription ?? '').toLowerCase().includes(q) ||
        (t.longDescription ?? '').toLowerCase().includes(q)
      )
    })
  }, [tools, tab, query, tierFilter, kindFilter, category])

  const sections = useMemo(() => groupByCategory(filtered), [filtered])
  const allCategories = useMemo(() => {
    const seen = new Set(tools.map(t => t.category))
    return ['all', ...[...seen].sort()]
  }, [tools])

  const openedTool = openId ? toolById[openId] : null

  return (
    <div className="tp-root">
      <h1 className="tp-hero-title">AI Tools &amp; Intelligence Library</h1>
      <p className="tp-hero-sub">
        Every widget, read, and mutation exposed as an AI-callable tool. Use the <code>/api/tools</code> manifest
        to discover them and <code>/api/tools/&lt;id&gt;</code> to invoke them from your own agent.
      </p>

      {loadErr && <div className="tp-empty" style={{ color: 'var(--ds-danger-red)' }}>Failed to load manifest: {loadErr}</div>}

      <div className="tp-tabs" role="tablist">
        <button className={`tp-tab${tab === 'available' ? ' active' : ''}`} onClick={() => setTab('available')}>
          Available<span className="tp-tab-count">{counts.available}</span>
        </button>
        <button className={`tp-tab${tab === 'planned' ? ' active' : ''}`} onClick={() => setTab('planned')}>
          Planned<span className="tp-tab-count">{counts.planned}</span>
        </button>
      </div>

      <div className="tp-filters">
        <div className="tp-search">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search tools by id, name or description…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <select className="tp-select" value={category} onChange={e => setCategory(e.target.value)}>
          {allCategories.map(c => <option key={c} value={c}>{c === 'all' ? 'All categories' : c}</option>)}
        </select>
        <select className="tp-select" value={tierFilter} onChange={e => setTierFilter(e.target.value)}>
          <option value="all">All tiers</option>
          <option value="public">Public</option>
          <option value="user">User</option>
          <option value="owner">Owner</option>
        </select>
        {tab === 'available' && (
          <select className="tp-select" value={kindFilter} onChange={e => setKindFilter(e.target.value)}>
            <option value="all">Read + Write</option>
            <option value="read">Read only</option>
            <option value="write">Write only</option>
          </select>
        )}
      </div>

      <div className="tp-count">
        {filtered.length} tool{filtered.length !== 1 ? 's' : ''}{category !== 'all' ? ` in ${category}` : ''}
        {query ? ` matching "${query}"` : ''}
      </div>

      <div className="tp-layout">
        <div>
          {tools.length > 0 && filtered.length === 0 && (
            <div className="tp-empty">No tools match your filters.</div>
          )}
          {sections.map(([cat, list]) => (
            <section key={cat} className="tp-section">
              <header id={categorySlug(cat)} className="tp-section-header">
                <h2 className="tp-section-title">{cat}</h2>
                <span className="tp-section-count">{list.length}</span>
              </header>
              <div className="tp-grid">
                {list.map(t => <ToolCard key={t.id} tool={t} onOpen={openTool} />)}
              </div>
            </section>
          ))}
        </div>
      </div>

      {openedTool && (
        <ToolDetailModal
          tool={openedTool}
          onClose={closeTool}
          onSwitchTool={openTool}
        />
      )}
    </div>
  )
}
