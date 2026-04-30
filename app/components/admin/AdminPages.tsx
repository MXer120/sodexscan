'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'

const PERMISSIONS = ['anon', 'auth', 'mod']

function Toggle({ checked, onChange }) {
  return (
    <label className="admin-toggle">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="admin-toggle-track">
        <span className="admin-toggle-thumb" />
      </span>
    </label>
  )
}

function PermBadge({ perm }) {
  return <span className={`admin-badge admin-badge-${perm}`}>{perm}</span>
}

export default function AdminPages() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('page_config')
        .select('path, label, visible, permission, updated_at')
        .order('path')
      if (error) setError(error.message)
      else setRows(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const updateRow = useCallback(async (path, patch) => {
    setRows(prev => prev.map(r => r.path === path ? { ...r, ...patch } : r))
    setSaving(prev => ({ ...prev, [path]: true }))

    const row = rows.find(r => r.path === path)
    const updated = { ...row, ...patch, updated_at: new Date().toISOString() }

    const { error } = await supabase
      .from('page_config')
      .upsert(updated, { onConflict: 'path' })

    setSaving(prev => ({ ...prev, [path]: false }))
    if (error) setError(error.message)
  }, [rows])

  if (loading) return <p className="admin-loading">Loading pages...</p>
  if (error) return <p className="admin-status-err">{error}</p>
  if (!rows.length) return <p className="admin-empty">No page configs found.</p>

  return (
    <>
      <h2>Page Config</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Path</th>
            <th>Label</th>
            <th>Visible</th>
            <th>Permission</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.path}>
              <td><span className="admin-path">{row.path}</span></td>
              <td>{row.label}</td>
              <td>
                <Toggle
                  checked={!!row.visible}
                  onChange={val => updateRow(row.path, { visible: val })}
                />
              </td>
              <td>
                <select
                  className="admin-select"
                  value={row.permission}
                  onChange={e => updateRow(row.path, { permission: e.target.value })}
                >
                  {PERMISSIONS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </td>
              <td>
                {saving[row.path]
                  ? <span className="admin-status-ok">Saving...</span>
                  : <PermBadge perm={row.permission} />
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
