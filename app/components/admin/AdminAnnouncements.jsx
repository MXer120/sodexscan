'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const TYPES = ['info', 'warning', 'success']

function TypeBadge({ type }) {
  return <span className={`admin-badge admin-badge-${type}`}>{type}</span>
}

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

export default function AdminAnnouncements() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newContent, setNewContent] = useState('')
  const [newType, setNewType] = useState('info')
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('announcement_status')
      .select('id, content, type, enabled, created_at')
      .order('enabled', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setRows(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleEnabled(id, val) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, enabled: val } : r))
    const { error } = await supabase
      .from('announcement_status')
      .update({ enabled: val })
      .eq('id', id)
    if (error) { setError(error.message); load() }
  }

  async function deleteRow(id) {
    setRows(prev => prev.filter(r => r.id !== id))
    const { error } = await supabase
      .from('announcement_status')
      .delete()
      .eq('id', id)
    if (error) { setError(error.message); load() }
  }

  async function create() {
    if (!newContent.trim()) return
    setCreating(true)
    const { error } = await supabase
      .from('announcement_status')
      .insert({ content: newContent.trim(), type: newType, enabled: true })
    setCreating(false)
    if (error) { setError(error.message); return }
    setNewContent('')
    setNewType('info')
    load()
  }

  return (
    <>
      <h2>Announcements</h2>

      <div className="admin-create-form">
        <h3>New Announcement</h3>
        <div className="admin-form-group">
          <label>Content</label>
          <input
            className="admin-input"
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder="Announcement text..."
            onKeyDown={e => e.key === 'Enter' && create()}
          />
        </div>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>Type</label>
            <select
              className="admin-select"
              value={newType}
              onChange={e => setNewType(e.target.value)}
            >
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button
            className="admin-btn"
            onClick={create}
            disabled={creating || !newContent.trim()}
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>

      {error && <p className="admin-status-err">{error}</p>}

      {loading ? (
        <p className="admin-loading">Loading...</p>
      ) : !rows.length ? (
        <p className="admin-empty">No announcements.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Content</th>
              <th>Type</th>
              <th>Enabled</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td style={{ maxWidth: 380 }}>{row.content}</td>
                <td><TypeBadge type={row.type} /></td>
                <td>
                  <Toggle
                    checked={!!row.enabled}
                    onChange={val => toggleEnabled(row.id, val)}
                  />
                </td>
                <td>
                  <button
                    className="admin-btn-danger"
                    onClick={() => deleteRow(row.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
