'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { LAYOUT_PRESETS } from './WidgetRegistry'

const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
)

// Structural preview — renders layout as colored blocks showing zones
function StructurePreview({ layouts, bp = 'lg', size = 'normal' }) {
  const items = layouts?.[bp] || []
  const bpCols = bp === 'sm' ? 2 : bp === 'md' ? 6 : 12

  const W = size === 'small' ? 56 : 100
  const H = size === 'small' ? 40 : 70

  if (!items.length) {
    return (
      <div style={{
        width: W, height: H, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, color: 'var(--color-text-muted)',
        background: 'var(--color-overlay-faint)', borderRadius: 4, flexShrink: 0,
      }}>
        Empty
      </div>
    )
  }

  const maxY = Math.min(Math.max(...items.map(i => i.y + i.h), 1), 24)
  const gap = 1
  const cellW = (W - (bpCols - 1) * gap) / bpCols
  const cellH = (H - (maxY - 1) * gap) / maxY

  // Distinct zone colors
  const ZONE_COLORS = [
    'rgba(72, 203, 255, 0.35)',
    'rgba(99, 102, 241, 0.35)',
    'rgba(16, 185, 129, 0.35)',
    'rgba(245, 158, 11, 0.35)',
    'rgba(239, 68, 68, 0.35)',
  ]

  return (
    <div style={{
      width: W, height: H, position: 'relative', borderRadius: 4,
      overflow: 'hidden', background: 'var(--color-overlay-faint)', flexShrink: 0,
    }}>
      {items.map((item, idx) => (
        <div key={item.i} style={{
          position: 'absolute',
          left: item.x * (cellW + gap),
          top: Math.min(item.y, 23) * (cellH + gap),
          width: item.w * (cellW + gap) - gap,
          height: item.h * (cellH + gap) - gap,
          background: ZONE_COLORS[idx % ZONE_COLORS.length],
          borderRadius: 2,
          border: '1px solid var(--color-border-subtle)',
        }} />
      ))}
    </div>
  )
}

const EditIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

// Card for a preset or user layout
function LayoutCard({ layout, onApply, onDelete = undefined, onRename = undefined, isUser = false, isOwnerGlobal = false, onOwnerEdit = undefined }: { layout: any; onApply: any; onDelete?: any; onRename?: any; isUser?: boolean; isOwnerGlobal?: boolean; onOwnerEdit?: any }) {
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(layout.name)

  const finishRename = () => {
    if (name.trim() && name.trim() !== layout.name) onRename?.(layout.id, name.trim())
    setRenaming(false)
  }

  return (
    <div className="agg-tmpl-preview-card">
      <button className="agg-tmpl-preview-btn" onClick={onApply} style={{ cursor: 'pointer' }}>
        <StructurePreview layouts={layout.layouts} bp="lg" />
        <div className="agg-tmpl-preview-info">
          {renaming ? (
            <input
              className="agg-tmpl-input"
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={finishRename}
              onKeyDown={e => { if (e.key === 'Enter') finishRename(); if (e.key === 'Escape') { setName(layout.name); setRenaming(false) } }}
              autoFocus
              onClick={e => e.stopPropagation()}
              style={{ fontSize: 11, padding: '2px 4px', marginBottom: 2 }}
            />
          ) : (
            <span
              className="agg-tmpl-preview-name"
              onDoubleClick={isUser ? (e) => { e.stopPropagation(); setRenaming(true) } : undefined}
              title={isUser ? 'Double-click to rename' : undefined}
            >
              {layout.icon && <span style={{ marginRight: 4 }}>{layout.icon}</span>}
              {layout.name}
            </span>
          )}
          {isUser && (
            <span className="agg-tmpl-preview-count">{Object.keys(layout.widgets || {}).length} zones</span>
          )}
          {isOwnerGlobal && (
            <span className="agg-tmpl-preview-count">{Object.keys(layout.widgets || {}).length} zones</span>
          )}
        </div>
      </button>
      {isUser && (
        <div className="agg-tmpl-preview-actions">
          <button className="agg-tmpl-action-btn delete" onClick={onDelete} title="Delete">
            <TrashIcon />
          </button>
        </div>
      )}
      {isOwnerGlobal && (
        <div className="agg-tmpl-preview-actions">
          <button className="agg-tmpl-action-btn" onClick={e => { e.stopPropagation(); onOwnerEdit?.() }} title="Edit">
            <EditIcon />
          </button>
          <button className="agg-tmpl-action-btn delete" onClick={e => { e.stopPropagation(); onDelete?.() }} title="Delete">
            <TrashIcon />
          </button>
        </div>
      )}
    </div>
  )
}

// Inline edit form for global layout (owner only)
function GlobalLayoutEditForm({ layout, onSave, onCancel, onDelete, error }) {
  const [name, setName] = useState(layout?.name || '')

  const handleSave = () => {
    if (!name.trim()) return
    onSave({ id: layout.id, name: name.trim() })
  }

  return (
    <div style={{
      background: 'var(--color-overlay-faint)',
      border: '1px solid var(--color-border)',
      borderRadius: 6,
      padding: '10px 12px',
      marginBottom: 8,
    }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>
        Editing: <strong style={{ color: 'var(--color-text-main)' }}>{layout?.name}</strong>
      </div>
      <input
        className="agg-tmpl-input"
        placeholder="Layout name..."
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel() }}
        autoFocus
        style={{ marginBottom: 8, width: '100%', boxSizing: 'border-box' }}
      />
      {error && (
        <div style={{ fontSize: 11, color: 'var(--color-error, #ef4444)', marginBottom: 6 }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="agg-modal-add-btn" onClick={handleSave} style={{ fontSize: 11, padding: '3px 10px' }}>
          Save
        </button>
        <button
          className="agg-modal-add-btn"
          onClick={onCancel}
          style={{ fontSize: 11, padding: '3px 10px', background: 'var(--color-overlay)', color: 'var(--color-text-muted)' }}
        >
          Cancel
        </button>
        <button
          className="agg-tmpl-action-btn delete"
          onClick={onDelete}
          title="Delete layout"
          style={{ marginLeft: 'auto' }}
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  )
}

export default function LayoutManager({
  userLayouts = [],
  onApplyLayout,
  onSaveLayout,
  onDeleteLayout,
  onRenameLayout,
  onClose,
  isOwner = false,
  globalLayouts = [],
  onCreateGlobalLayout,
  onUpdateGlobalLayout,
  onDeleteGlobalLayout,
}) {
  const [newName, setNewName] = useState('')
  const [newGlobalName, setNewGlobalName] = useState('')
  const [globalError, setGlobalError] = useState('')
  const [editingGlobalId, setEditingGlobalId] = useState(null)
  const [editError, setEditError] = useState('')

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.body.style.overflow = 'unset'
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  const handleSave = () => {
    if (!newName.trim() || userLayouts.length >= 10) return
    onSaveLayout(newName.trim())
    setNewName('')
  }

  const handleSaveGlobal = () => {
    if (!newGlobalName.trim()) return
    setGlobalError('')
    try {
      onCreateGlobalLayout(newGlobalName.trim())
      setNewGlobalName('')
    } catch (err) {
      setGlobalError(err.message || 'Validation failed')
    }
  }

  const handleEditSave = ({ id, name }) => {
    setEditError('')
    try {
      onUpdateGlobalLayout(id, { name })
      setEditingGlobalId(null)
    } catch (err) {
      setEditError(err.message || 'Validation failed')
    }
  }

  const editingLayout = globalLayouts.find(l => l.id === editingGlobalId) || null

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="agg-modal-overlay" onClick={onClose}>
      <div className="agg-modal agg-tmpl-modal" onClick={e => e.stopPropagation()}>
        <div className="agg-modal-header">
          <h2>Layouts</h2>
          <button className="agg-modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div style={{ padding: '0 24px 24px', overflowY: 'auto', maxHeight: 'calc(80vh - 60px)' }}>

          {/* Hint */}
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 16, paddingTop: 16 }}>
            Layouts apply to <strong style={{ color: 'var(--color-text-main)' }}>all devices</strong> at once.
            Click a layout to replace the current page with that structure.
          </div>

          {/* ── Preset Layouts ──────────────────────────────── */}
          <div className="agg-tmpl-section">
            <div className="agg-tmpl-section-title">Structural Presets</div>
            <div className="agg-tmpl-preview-grid">
              {LAYOUT_PRESETS.map(preset => (
                <LayoutCard
                  key={preset.id}
                  layout={preset}
                  onApply={() => { onApplyLayout(preset.layouts, preset.widgets); onClose() }}
                />
              ))}
            </div>
          </div>

          {/* ── Global Layouts ───────────────────────────────── */}
          {(globalLayouts.length > 0 || isOwner) && (
            <div className="agg-tmpl-section">
              <div className="agg-tmpl-section-title">
                Global Layouts
                {isOwner && (
                  <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: 6 }}>
                    owner
                  </span>
                )}
              </div>

              {isOwner && (
                <>
                  <div style={{ display: 'flex', gap: 8, marginBottom: globalError ? 4 : 10 }}>
                    <input
                      type="text"
                      placeholder="Global layout name..."
                      value={newGlobalName}
                      onChange={e => { setNewGlobalName(e.target.value); setGlobalError('') }}
                      onKeyDown={e => e.key === 'Enter' && handleSaveGlobal()}
                      className="agg-tmpl-input"
                    />
                    <button className="agg-modal-add-btn" onClick={handleSaveGlobal}>Save Current as Global</button>
                  </div>
                  {globalError && (
                    <div style={{ fontSize: 11, color: 'var(--color-error, #ef4444)', marginBottom: 8 }}>
                      {globalError}
                    </div>
                  )}
                </>
              )}

              {editingLayout && isOwner && (
                <GlobalLayoutEditForm
                  layout={editingLayout}
                  onSave={handleEditSave}
                  onCancel={() => { setEditingGlobalId(null); setEditError('') }}
                  onDelete={() => { onDeleteGlobalLayout(editingLayout.id); setEditingGlobalId(null) }}
                  error={editError}
                />
              )}

              {globalLayouts.length === 0 ? (
                <div className="agg-tmpl-empty">No global layouts yet. Save the current structure above.</div>
              ) : (
                <div className="agg-tmpl-preview-grid">
                  {globalLayouts.map(layout => (
                    <LayoutCard
                      key={layout.id}
                      layout={layout}
                      isOwnerGlobal={isOwner}
                      onApply={() => { onApplyLayout(layout.layouts, layout.widgets); onClose() }}
                      onOwnerEdit={() => { setEditingGlobalId(layout.id); setEditError('') }}
                      onDelete={() => onDeleteGlobalLayout(layout.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── My Layouts ──────────────────────────────────── */}
          <div className="agg-tmpl-section">
            <div className="agg-tmpl-section-title">My Layouts</div>

            {userLayouts.length < 10 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input
                  type="text"
                  placeholder="Layout name..."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  className="agg-tmpl-input"
                />
                <button className="agg-modal-add-btn" onClick={handleSave}>Save Current</button>
              </div>
            )}

            {userLayouts.length === 0 ? (
              <div className="agg-tmpl-empty">No saved layouts. Save your current page structure above.</div>
            ) : (
              <div className="agg-tmpl-preview-grid">
                {userLayouts.map(layout => (
                  <LayoutCard
                    key={layout.id}
                    layout={layout}
                    isUser
                    onApply={() => { onApplyLayout(layout.layouts, layout.widgets); onClose() }}
                    onDelete={() => onDeleteLayout(layout.id)}
                    onRename={onRenameLayout}
                  />
                ))}
              </div>
            )}

            {userLayouts.length >= 10 && (
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center' }}>
                Maximum 10 layouts reached
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
