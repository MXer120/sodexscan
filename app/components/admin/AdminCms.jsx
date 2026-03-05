'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function AdminCms() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newContent, setNewContent] = useState('')
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('cms_content')
      .select('key, content, updated_at')
      .order('key')
    if (error) setError(error.message)
    else setRows(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function expand(row) {
    if (expanded === row.key) {
      setExpanded(null)
      return
    }
    setExpanded(row.key)
    setEditContent(row.content)
  }

  async function saveEdit(key) {
    setSaving(true)
    const { error } = await supabase
      .from('cms_content')
      .update({ content: editContent, updated_at: new Date().toISOString() })
      .eq('key', key)
    setSaving(false)
    if (error) { setError(error.message); return }
    setRows(prev => prev.map(r => r.key === key ? { ...r, content: editContent } : r))
    setExpanded(null)
  }

  async function deleteRow(key) {
    setRows(prev => prev.filter(r => r.key !== key))
    const { error } = await supabase
      .from('cms_content')
      .delete()
      .eq('key', key)
    if (error) { setError(error.message); load() }
  }

  async function create() {
    if (!newKey.trim() || !newContent.trim()) return
    setCreating(true)
    const { error } = await supabase
      .from('cms_content')
      .insert({
        key: newKey.trim(),
        content: newContent.trim(),
        updated_at: new Date().toISOString(),
      })
    setCreating(false)
    if (error) { setError(error.message); return }
    setNewKey('')
    setNewContent('')
    load()
  }

  return (
    <>
      <h2>CMS Content</h2>

      <div className="admin-create-form">
        <h3>New Entry</h3>
        <div className="admin-form-group">
          <label>Key</label>
          <input
            className="admin-input"
            value={newKey}
            onChange={e => setNewKey(e.target.value)}
            placeholder="e.g. home.hero.title"
          />
        </div>
        <div className="admin-form-group">
          <label>Content</label>
          <textarea
            className="admin-textarea"
            rows={3}
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder="Content..."
          />
        </div>
        <button
          className="admin-btn"
          onClick={create}
          disabled={creating || !newKey.trim() || !newContent.trim()}
        >
          {creating ? 'Creating...' : 'Create'}
        </button>
      </div>

      {error && <p className="admin-status-err">{error}</p>}

      {loading ? (
        <p className="admin-loading">Loading...</p>
      ) : !rows.length ? (
        <p className="admin-empty">No CMS entries.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Preview</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <React.Fragment key={row.key}>
                <tr>
                  <td><span className="admin-path">{row.key}</span></td>
                  <td style={{ color: 'var(--color-text-secondary)', maxWidth: 300 }}>
                    {row.content?.slice(0, 80)}{row.content?.length > 80 ? '...' : ''}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="admin-btn-secondary"
                        onClick={() => expand(row)}
                      >
                        {expanded === row.key ? 'Close' : 'Edit'}
                      </button>
                      <button
                        className="admin-btn-danger"
                        onClick={() => deleteRow(row.key)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
                {expanded === row.key && (
                  <tr>
                    <td colSpan={3} style={{ padding: '0 0.75rem 0.75rem' }}>
                      <div className="admin-cms-expanded">
                        <textarea
                          className="admin-textarea"
                          rows={6}
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="admin-btn"
                            onClick={() => saveEdit(row.key)}
                            disabled={saving}
                          >
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            className="admin-btn-secondary"
                            onClick={() => setExpanded(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
