'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'

// Canonical list — source of truth for paths that should exist in nav_config.
// If a path is missing from the DB, the admin table shows it with an "Add" button.
const CANONICAL_NAV = [
  { path: '/tracker',        label: 'Scan',           enabled: true, tag: null,  sort_order: 10,  in_more: false },
  { path: '/mainnet',        label: 'Leaderboard',    enabled: true, tag: null,  sort_order: 20,  in_more: false },
  { path: '/sopoints',       label: 'SoPoints',       enabled: true, tag: 'V1',  sort_order: 30,  in_more: false },
  { path: '/watchlist',      label: 'Watchlist',      enabled: true, tag: null,  sort_order: 50,  in_more: false },
  { path: '/aggregator',     label: 'Aggregator',     enabled: true, tag: 'V1',  sort_order: 60,  in_more: false },
  { path: '/larp',           label: 'LARP',           enabled: false, tag: 'New', sort_order: 75, in_more: false },
  { path: '/design-system',  label: 'Design System',  enabled: true, tag: null,  sort_order: 78,  in_more: true  },
  { path: '/admin',          label: 'Admin',          enabled: true, tag: null,  sort_order: 80,  in_more: false },
  { path: '/platform',       label: 'Platform',       enabled: true, tag: null,  sort_order: 90,  in_more: true  },
  { path: '/incoming',       label: 'Incoming',       enabled: true, tag: null,  sort_order: 100, in_more: true  },
  { path: '/reverse-search', label: 'Reverse Search', enabled: true, tag: null,  sort_order: 110, in_more: true  },
]

const TAGS = ['', 'V1', 'V2', 'V3', 'Beta', 'Alpha', 'New']

const TAG_COLORS = {
  V1: 'var(--color-primary)',
  V2: '#10b981',
  V3: '#6366f1',
  Beta: '#f59e0b',
  Alpha: '#ef4444',
  New: '#10b981',
}

function TagBadge({ tag }) {
  if (!tag) return <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>—</span>
  const color = TAG_COLORS[tag] || 'var(--color-primary)'
  return (
    <span style={{
      fontSize: '9px', fontWeight: 800, color,
      background: `color-mix(in srgb, ${color} 15%, transparent)`,
      border: `1px solid ${color}`,
      borderRadius: '4px', padding: '2px 5px',
      textTransform: 'uppercase', letterSpacing: '0.5px'
    }}>{tag}</span>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <label className="admin-toggle">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="admin-toggle-track"><span className="admin-toggle-thumb" /></span>
    </label>
  )
}

export default function AdminNavbar() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('nav_config')
        .select('path, label, enabled, tag, sort_order, in_more, updated_at')
        .order('sort_order')
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      const dbRows = data || []
      const dbPaths = new Set(dbRows.map(r => r.path))
      // Append canonical items missing from DB as ghost rows (no updated_at)
      const missing = CANONICAL_NAV
        .filter(c => !dbPaths.has(c.path))
        .map(c => ({ ...c, _missing: true }))
      const merged = [...dbRows, ...missing].sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
      setRows(merged)
      setLoading(false)
    }
    load()
  }, [])

  const addRow = useCallback(async (canonical) => {
    const row = { ...canonical, updated_at: new Date().toISOString() }
    setSaving(prev => ({ ...prev, [canonical.path]: true }))
    const { error } = await supabase.from('nav_config').upsert(row, { onConflict: 'path' })
    setSaving(prev => ({ ...prev, [canonical.path]: false }))
    if (error) { setError(error.message); return }
    setRows(prev => prev.map(r => r.path === canonical.path ? { ...row } : r))
  }, [])

  const updateRow = useCallback(async (path, patch) => {
    setRows(prev => prev.map(r => r.path === path ? { ...r, ...patch } : r))
    setSaving(prev => ({ ...prev, [path]: true }))
    const row = rows.find(r => r.path === path)
    const updated = { ...row, ...patch, updated_at: new Date().toISOString() }
    const { error } = await supabase
      .from('nav_config')
      .upsert(updated, { onConflict: 'path' })
    setSaving(prev => ({ ...prev, [path]: false }))
    if (error) setError(error.message)
  }, [rows])

  const moveRow = useCallback(async (path, dir) => {
    const idx = rows.findIndex(r => r.path === path)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= rows.length) return
    const a = rows[idx]
    const b = rows[swapIdx]
    const aOrder = a.sort_order
    const bOrder = b.sort_order

    setRows(prev => {
      const next = prev.map(r => {
        if (r.path === a.path) return { ...r, sort_order: bOrder }
        if (r.path === b.path) return { ...r, sort_order: aOrder }
        return r
      })
      return next.sort((x, y) => x.sort_order - y.sort_order)
    })

    setSaving(prev => ({ ...prev, [a.path]: true, [b.path]: true }))
    await Promise.all([
      supabase.from('nav_config').update({ sort_order: bOrder, updated_at: new Date().toISOString() }).eq('path', a.path),
      supabase.from('nav_config').update({ sort_order: aOrder, updated_at: new Date().toISOString() }).eq('path', b.path),
    ])
    setSaving(prev => ({ ...prev, [a.path]: false, [b.path]: false }))
  }, [rows])

  if (loading) return <p className="admin-loading">Loading navbar config...</p>
  if (error) return <p className="admin-status-err">{error}</p>

  return (
    <>
      <h2>Navbar Config</h2>
      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '1rem', marginTop: '-0.5rem' }}>
        Changes apply on next page load. Admin page still requires mod role.
      </p>
      <table className="admin-table">
        <thead>
          <tr>
            <th></th>
            <th>Path</th>
            <th>Label</th>
            <th>Enabled</th>
            <th>Tag</th>
            <th>In More</th>
            <th>Order</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isMissing = !!row._missing
            return (
              <tr key={row.path} style={isMissing ? { opacity: 0.5 } : undefined}>
                <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', width: '2rem' }}>
                  {idx + 1}
                </td>
                <td><span className="admin-path">{row.path}</span></td>
                <td style={{ color: 'var(--color-text-main)', fontSize: '0.85rem' }}>{row.label}</td>
                {isMissing ? (
                  <>
                    <td colSpan={4} style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                      Not in database
                    </td>
                    <td>
                      <button
                        className="admin-icon-btn"
                        onClick={() => addRow(row)}
                        disabled={saving[row.path]}
                        title="Add to nav_config"
                        style={{ fontSize: '0.7rem', padding: '2px 8px', width: 'auto' }}
                      >
                        {saving[row.path] ? 'Adding…' : '+ Add'}
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>
                      <Toggle
                        checked={!!row.enabled}
                        onChange={val => updateRow(row.path, { enabled: val })}
                      />
                    </td>
                    <td>
                      <select
                        className="admin-select"
                        value={row.tag || ''}
                        onChange={e => updateRow(row.path, { tag: e.target.value || null })}
                      >
                        {TAGS.map(t => (
                          <option key={t} value={t}>{t || 'None'}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <Toggle
                        checked={!!row.in_more}
                        onChange={val => updateRow(row.path, { in_more: val })}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="admin-icon-btn"
                          onClick={() => moveRow(row.path, -1)}
                          disabled={idx === 0}
                          title="Move up"
                        >▲</button>
                        <button
                          className="admin-icon-btn"
                          onClick={() => moveRow(row.path, 1)}
                          disabled={idx === rows.length - 1}
                          title="Move down"
                        >▼</button>
                      </div>
                    </td>
                    <td>
                      {saving[row.path]
                        ? <span className="admin-status-ok" style={{ fontSize: '0.75rem' }}>Saving…</span>
                        : <TagBadge tag={row.tag} />
                      }
                    </td>
                  </>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </>
  )
}
