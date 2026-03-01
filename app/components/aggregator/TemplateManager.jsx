'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { PRESET_TEMPLATES, WIDGET_REGISTRY, WIDGET_CATEGORIES } from './WidgetRegistry'

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

// Category colors for widget blocks in preview
const CATEGORY_COLORS = {
  market: 'rgba(99, 102, 241, 0.5)',
  leaderboard: 'rgba(234, 179, 8, 0.5)',
  sopoints: 'rgba(245, 158, 11, 0.5)',
  social: 'rgba(168, 85, 247, 0.5)',
  platform: 'rgba(59, 130, 246, 0.5)',
  tools: 'rgba(107, 114, 128, 0.5)',
  scanner: 'rgba(16, 185, 129, 0.5)',
  containers: 'rgba(156, 163, 175, 0.5)',
}

// Mini layout preview — renders widget positions as colored blocks
// bp: which breakpoint to render ('lg'|'md'|'sm'), size: 'normal'|'small'|'device'
function LayoutPreview({ layouts, widgets, size = 'normal', bp = 'lg' }) {
  const items = layouts?.[bp] || []
  const bpCols = bp === 'sm' ? 2 : bp === 'md' ? 6 : 12

  if (items.length === 0) {
    const h = size === 'small' ? 40 : 70
    return (
      <div style={{
        height: h,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, color: 'var(--color-text-muted)',
        background: 'var(--color-overlay-faint)', borderRadius: 4,
      }}>
        No layout
      </div>
    )
  }

  const containerW = size === 'small' ? 56 : 100
  const containerH = size === 'small' ? 40 : 70
  const maxY = Math.max(...items.map(item => item.y + item.h), 1)
  const cols = bpCols
  const clampedY = Math.min(maxY, 16)
  const gap = 1
  const cellW = (containerW - (cols - 1) * gap) / cols
  const cellH = (containerH - (clampedY - 1) * gap) / clampedY

  return (
    <div style={{
      width: containerW, height: containerH,
      position: 'relative', borderRadius: 4, overflow: 'hidden',
      background: 'var(--color-overlay-faint)', flexShrink: 0,
    }}>
      {items.map((item) => {
        const widgetConfig = widgets[item.i]
        const reg = widgetConfig ? WIDGET_REGISTRY[widgetConfig.type] : null
        const cat = reg?.category || 'tools'
        const color = CATEGORY_COLORS[cat] || CATEGORY_COLORS.tools
        return (
          <div key={item.i} style={{
            position: 'absolute',
            left: item.x * (cellW + gap),
            top: Math.min(item.y, 15) * (cellH + gap),
            width: item.w * (cellW + gap) - gap,
            height: item.h * (cellH + gap) - gap,
            background: color, borderRadius: 2,
          }} title={reg?.label || item.i} />
        )
      })}
    </div>
  )
}

// Widget type summary badges
function WidgetBadges({ widgets }) {
  const categoryCounts = {}
  for (const w of Object.values(widgets)) {
    const reg = WIDGET_REGISTRY[w.type]
    const cat = reg?.category || 'other'
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
  }
  return (
    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
      {Object.entries(categoryCounts).map(([cat, count]) => {
        const catInfo = WIDGET_CATEGORIES[cat]
        return (
          <span key={cat} style={{
            fontSize: 9, padding: '1px 5px', borderRadius: 4,
            background: CATEGORY_COLORS[cat] || 'var(--color-overlay-subtle)',
            color: 'var(--color-text-main)', fontWeight: 500, whiteSpace: 'nowrap',
          }}>
            {catInfo?.label || cat} {count}
          </span>
        )
      })}
    </div>
  )
}

// ── Template Edit Modal ────────────────────────────────────────────────────────
function TemplateEditModal({ template, activePage, isGlobal, onSave, onClose }) {
  const [name, setName] = useState(template.name)
  const [bps, setBps] = useState({ lg: true, md: true, sm: true })

  const toggleBP = (bp) => setBps(prev => ({ ...prev, [bp]: !prev[bp] }))
  const anySelected = Object.values(bps).some(Boolean)

  const handleSave = () => {
    if (!anySelected) return
    const selectedBPs = Object.entries(bps).filter(([, v]) => v).map(([k]) => k)
    onSave({ name: name.trim() || template.name, bps: selectedBPs })
  }

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  if (typeof document === 'undefined') return null

  const DEVICES = [
    { bp: 'lg', label: 'Desktop', hint: '≥1200px' },
    { bp: 'md', label: 'Tablet', hint: '768–1199px' },
    { bp: 'sm', label: 'Mobile', hint: '<768px' },
  ]

  return createPortal(
    <div
      className="agg-modal-overlay"
      style={{ zIndex: 100010 }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          width: '92%',
          maxWidth: 820,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="agg-modal-header">
          <h2 style={{ margin: 0, fontSize: 16 }}>
            Edit {isGlobal ? 'Global ' : ''}Template
          </h2>
          <button className="agg-modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 24px 20px', overflowY: 'auto', flex: 1 }}>

          {/* Name */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
              Template Name
            </label>
            <input
              className="agg-tmpl-input"
              style={{ width: '100%' }}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              autoFocus
            />
          </div>

          {/* Widget overview */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
              Current Template Contents
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <LayoutPreview layouts={template.layouts} widgets={template.widgets} bp="lg" />
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-main)', marginBottom: 4 }}>{template.name}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>{Object.keys(template.widgets).length} widgets</div>
                <WidgetBadges widgets={template.widgets} />
              </div>
            </div>
          </div>

          {/* Device layout selection */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
              Select device layouts to update from current page
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {DEVICES.map(({ bp, label, hint }) => (
                <div
                  key={bp}
                  style={{
                    border: `1px solid ${bps[bp] ? 'var(--color-primary, #6366f1)' : 'var(--color-border)'}`,
                    borderRadius: 8,
                    padding: 12,
                    cursor: 'pointer',
                    background: bps[bp] ? 'var(--color-primary-faint, rgba(99,102,241,0.07))' : 'var(--color-overlay-faint)',
                    transition: 'border-color 0.15s, background 0.15s',
                    userSelect: 'none',
                  }}
                  onClick={() => toggleBP(bp)}
                >
                  {/* Device header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <input
                      type="checkbox"
                      checked={bps[bp]}
                      onChange={() => toggleBP(bp)}
                      onClick={e => e.stopPropagation()}
                      style={{ cursor: 'pointer', flexShrink: 0 }}
                    />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{label}</span>
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>{hint}</span>
                  </div>

                  {/* Side-by-side previews */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 4 }}>Current page</div>
                      <LayoutPreview layouts={activePage.layouts} widgets={activePage.widgets} bp={bp} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 4 }}>In template</div>
                      <LayoutPreview layouts={template.layouts} widgets={template.widgets} bp={bp} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid var(--color-border)',
          display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', fontSize: 13, border: '1px solid var(--color-border)',
              borderRadius: 6, cursor: 'pointer', background: 'transparent', color: 'var(--color-text-main)',
            }}
          >
            Cancel
          </button>
          <button
            className="agg-modal-add-btn"
            onClick={handleSave}
            disabled={!anySelected}
          >
            Update Template
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function TemplateManager({
  templates, onSaveAsTemplate, onLoadTemplate, onLoadPresetTemplate, onApplyLayoutPreset,
  onDeleteTemplate, onRenameTemplate, onUpdateTemplate, activePage, onClose,
  globalTemplates = [], isOwner = false,
  onCreateGlobal, onUpdateGlobal, onDeleteGlobal, onImportPresets,
  isImportingPresets = false,
}) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [hoveredTemplate, setHoveredTemplate] = useState(null)
  const [newGlobalName, setNewGlobalName] = useState('')

  // Edit modal — shared for both private and global templates
  const [editingTemplate, setEditingTemplate] = useState(null) // { template, isGlobal }

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const handleEsc = (e) => { if (e.key === 'Escape' && !editingTemplate) onClose() }
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.body.style.overflow = 'unset'
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose, editingTemplate])

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
      icon: '', description: '',
      layouts: activePage.layouts,
      widgets: activePage.widgets,
      sort_order: globalTemplates.length,
    })
    setNewGlobalName('')
  }

  // Called by TemplateEditModal when the user confirms
  const handleEditSave = ({ name, bps }) => {
    const { template, isGlobal } = editingTemplate

    if (isGlobal) {
      const mergedLayouts = { ...(template.layouts || {}) }
      for (const bp of bps) mergedLayouts[bp] = activePage.layouts?.[bp] || []
      onUpdateGlobal({
        id: template.id,
        name,
        icon: template.icon || '',
        layouts: mergedLayouts,
        widgets: activePage.widgets,
      })
    } else {
      // Rename if name changed
      if (name !== template.name) onRenameTemplate(template.id, name)
      onUpdateTemplate(template.id, bps)
    }
    setEditingTemplate(null)
  }

  // Fallback: show hardcoded presets if no global templates in DB
  const showBuiltinFallback = globalTemplates.length === 0

  // Template card renderer (used for global + preset)
  const renderTemplateCard = (t, onClick, isGlobal = false) => {
    return (
      <div
        key={t.id || t.name}
        className="agg-tmpl-preview-card"
        onMouseEnter={() => setHoveredTemplate(t.id || t.name)}
        onMouseLeave={() => setHoveredTemplate(null)}
      >
        <button className="agg-tmpl-preview-btn" onClick={onClick}>
          <LayoutPreview layouts={t.layouts} widgets={t.widgets} />
          <div className="agg-tmpl-preview-info">
            <span className="agg-tmpl-preview-name">{t.name}</span>
            <span className="agg-tmpl-preview-count">{Object.keys(t.widgets).length} widgets</span>
            <WidgetBadges widgets={t.widgets} />
          </div>
        </button>
        {isGlobal && isOwner && (
          <div className="agg-tmpl-preview-actions">
            <button
              className="agg-tmpl-action-btn"
              onClick={() => setEditingTemplate({ template: t, isGlobal: true })}
              title="Edit"
            >
              <EditIcon />
            </button>
            <button className="agg-tmpl-action-btn delete" onClick={() => onDeleteGlobal(t.id)} title="Delete">
              <TrashIcon />
            </button>
          </div>
        )}
      </div>
    )
  }

  if (typeof document === 'undefined') return null

  return (
    <>
    {createPortal(
    <div className="agg-modal-overlay" onClick={onClose}>
      <div className="agg-modal agg-tmpl-modal" onClick={e => e.stopPropagation()}>
        <div className="agg-modal-header">
          <h2>Templates</h2>
          <button className="agg-modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ padding: '0 24px 24px', overflowY: 'auto', maxHeight: 'calc(80vh - 60px)' }}>

          {/* ── Global Templates ──────────────────────────────────── */}
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
                  {isImportingPresets ? 'Importing...' : 'Import Built-ins'}
                </button>
              )}
            </div>

            {globalTemplates.length > 0 ? (
              <>
                <div className="agg-tmpl-preview-grid">
                  {globalTemplates.map(t =>
                    renderTemplateCard(t, () => { onApplyLayoutPreset(t.layouts, t.widgets); onClose() }, true)
                  )}
                </div>
                {isOwner && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="New global template name..."
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
              <div className="agg-tmpl-preview-grid">
                {PRESET_TEMPLATES.map(preset =>
                  renderTemplateCard(preset, () => { onLoadPresetTemplate(preset.id); onClose() }, false)
                )}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <LayoutPreview layouts={t.layouts} widgets={t.widgets} size="small" />
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
                  </div>
                  <span className="agg-template-meta">{Object.keys(t.widgets).length}w</span>
                  <div className="agg-template-actions">
                    <button onClick={() => onLoadTemplate(t.id)}>Load</button>
                    {activePage.templateId === t.id && (
                      <button onClick={() => setEditingTemplate({ template: t, isGlobal: false })}>
                        Edit & Update
                      </button>
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
    )}
    {editingTemplate && (
      <TemplateEditModal
        template={editingTemplate.template}
        activePage={activePage}
        isGlobal={editingTemplate.isGlobal}
        onSave={handleEditSave}
        onClose={() => setEditingTemplate(null)}
      />
    )}
    </>
  )
}
