'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { PRESET_TEMPLATES } from './WidgetRegistry'

const EditIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
)

export default function TemplateManager({
  templates, onSaveAsTemplate, onLoadTemplate, onLoadPresetTemplate, onApplyLayoutPreset,
  onDeleteTemplate, onRenameTemplate, onUpdateTemplate, activePage, onClose,
  // Global templates
  globalTemplates = [], isOwner = false,
  onCreateGlobal, onUpdateGlobal, onDeleteGlobal, onImportPresets,
  isImportingPresets = false,
}) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  // Owner: edit global template
  const [editingGlobalId, setEditingGlobalId] = useState(null)
  const [editGlobalName, setEditGlobalName] = useState('')
  const [editGlobalIcon, setEditGlobalIcon] = useState('')

  // Owner: save current as global
  const [newGlobalName, setNewGlobalName] = useState('')
  const [newGlobalIcon, setNewGlobalIcon] = useState('📋')

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.body.style.overflow = 'unset'
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  const handleCreate = () => {
    if (!newName.trim() || templates.length >= 5) return
    onSaveAsTemplate(newName.trim())
    setNewName('')
  }

  const handleRename = (id) => {
    if (editName.trim()) onRenameTemplate(id, editName.trim())
    setEditingId(null)
  }

  const handleSaveAsGlobal = () => {
    if (!newGlobalName.trim()) return
    onCreateGlobal({
      name: newGlobalName.trim(),
      icon: newGlobalIcon || '📋',
      description: '',
      layouts: activePage.layouts,
      widgets: activePage.widgets,
      sort_order: globalTemplates.length,
    })
    setNewGlobalName('')
    setNewGlobalIcon('📋')
  }

  const handleUpdateGlobal = (t) => {
    onUpdateGlobal({
      id: t.id,
      name: editGlobalName.trim() || t.name,
      icon: editGlobalIcon || t.icon,
      layouts: activePage.layouts,
      widgets: activePage.widgets,
    })
    setEditingGlobalId(null)
  }

  const handleStartEditGlobal = (t) => {
    setEditingGlobalId(t.id)
    setEditGlobalName(t.name)
    setEditGlobalIcon(t.icon)
  }

  // Fallback: show hardcoded presets if no global templates in DB
  const showBuiltinFallback = globalTemplates.length === 0

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="agg-modal-overlay" onClick={onClose}>
      <div className="agg-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="agg-modal-header">
          <h2>Templates</h2>
          <button className="agg-modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ padding: '0 24px 24px', overflowY: 'auto', maxHeight: 'calc(80vh - 60px)' }}>

          {/* ── Global Templates (DB-backed) ──────────────────────── */}
          <div className="agg-tmpl-section">
            <div className="agg-tmpl-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Global</span>
              {isOwner && globalTemplates.length === 0 && (
                <button
                  className="agg-tmpl-import-btn"
                  onClick={onImportPresets}
                  disabled={isImportingPresets}
                  title="Import built-in presets into database for editing"
                >
                  {isImportingPresets ? 'Importing…' : '⬇ Import Built-ins'}
                </button>
              )}
            </div>

            {globalTemplates.length > 0 ? (
              <>
                <div className="agg-tmpl-preset-grid">
                  {globalTemplates.map(t => (
                    <div key={t.id} className="agg-tmpl-global-card">
                      {editingGlobalId === t.id ? (
                        <div className="agg-tmpl-global-edit">
                          <input
                            className="agg-tmpl-icon-input"
                            value={editGlobalIcon}
                            onChange={e => setEditGlobalIcon(e.target.value)}
                            maxLength={2}
                            style={{ width: 36, textAlign: 'center' }}
                          />
                          <input
                            className="agg-tmpl-input"
                            value={editGlobalName}
                            onChange={e => setEditGlobalName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleUpdateGlobal(t)}
                            autoFocus
                            style={{ flex: 1 }}
                          />
                          <button className="agg-modal-add-btn" onClick={() => handleUpdateGlobal(t)}>Save</button>
                          <button className="agg-tmpl-cancel-btn" onClick={() => setEditingGlobalId(null)}>✕</button>
                        </div>
                      ) : (
                        <button
                          className="agg-tmpl-preset-card"
                          onClick={() => { onApplyLayoutPreset(t.layouts, t.widgets); onClose() }}
                          title={t.description || t.name}
                          style={{ flex: 1 }}
                        >
                          <span className="agg-tmpl-preset-icon">{t.icon}</span>
                          <span className="agg-tmpl-preset-name">{t.name}</span>
                          <span className="agg-tmpl-preset-count">{Object.keys(t.widgets).length}w</span>
                        </button>
                      )}
                      {isOwner && editingGlobalId !== t.id && (
                        <div className="agg-tmpl-global-actions">
                          <button className="agg-tmpl-action-btn" onClick={() => handleStartEditGlobal(t)} title="Edit (updates with current page layout)"><EditIcon /></button>
                          <button className="agg-tmpl-action-btn delete" onClick={() => onDeleteGlobal(t.id)} title="Delete"><TrashIcon /></button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Owner: save current page as new global template */}
                {isOwner && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center' }}>
                    <input
                      className="agg-tmpl-icon-input"
                      value={newGlobalIcon}
                      onChange={e => setNewGlobalIcon(e.target.value)}
                      maxLength={2}
                      style={{ width: 36, textAlign: 'center', flexShrink: 0 }}
                      placeholder="📋"
                    />
                    <input
                      type="text"
                      placeholder="New global template name…"
                      value={newGlobalName}
                      onChange={e => setNewGlobalName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveAsGlobal()}
                      className="agg-tmpl-input"
                    />
                    <button className="agg-modal-add-btn" onClick={handleSaveAsGlobal}>Add Global</button>
                  </div>
                )}
              </>
            ) : showBuiltinFallback ? (
              /* Fallback: show hardcoded presets if DB is empty */
              <div className="agg-tmpl-preset-grid">
                {PRESET_TEMPLATES.map(preset => (
                  <button
                    key={preset.id}
                    className="agg-tmpl-preset-card"
                    onClick={() => { onLoadPresetTemplate(preset.id); onClose() }}
                    title={preset.description}
                  >
                    <span className="agg-tmpl-preset-icon">{preset.icon}</span>
                    <span className="agg-tmpl-preset-name">{preset.name}</span>
                    <span className="agg-tmpl-preset-count">{Object.keys(preset.widgets).length}w</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* ── My Templates ─────────────────────────────────────── */}
          <div className="agg-tmpl-section">
            <div className="agg-tmpl-section-title">My Templates</div>

            {templates.length < 5 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input
                  type="text"
                  placeholder="Template name..."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  className="agg-tmpl-input"
                />
                <button className="agg-modal-add-btn" onClick={handleCreate}>Save Current</button>
              </div>
            )}

            <div className="agg-template-list">
              {templates.length === 0 && (
                <div className="agg-tmpl-empty">No templates yet. Save your current layout above.</div>
              )}
              {templates.map(t => (
                <div key={t.id} className="agg-template-item">
                  {editingId === t.id ? (
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onBlur={() => handleRename(t.id)}
                      onKeyDown={e => e.key === 'Enter' && handleRename(t.id)}
                      autoFocus
                      style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--color-text-main)', fontSize: 14, outline: 'none' }}
                    />
                  ) : (
                    <span className="agg-template-name" onDoubleClick={() => { setEditingId(t.id); setEditName(t.name) }}>
                      {t.name}
                      {activePage.templateId === t.id && (
                        <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--color-primary)' }}>active</span>
                      )}
                    </span>
                  )}
                  <span className="agg-template-meta">{Object.keys(t.widgets).length} widgets</span>
                  <div className="agg-template-actions">
                    <button onClick={() => onLoadTemplate(t.id)}>Load</button>
                    {activePage.templateId === t.id && (
                      <button onClick={() => onUpdateTemplate(t.id)}>Update</button>
                    )}
                    <button className="delete" onClick={() => onDeleteTemplate(t.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>

            {templates.length >= 5 && (
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center' }}>
                Maximum 5 templates reached
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
