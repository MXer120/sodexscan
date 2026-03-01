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

// Mini layout preview - renders widget positions as colored blocks on a 12-col grid
// Fixed container size — content scales to fit
function LayoutPreview({ layouts, widgets, size = 'normal' }) {
  const lg = layouts?.lg || []
  if (lg.length === 0) return null

  // Fixed container dimensions
  const containerW = size === 'small' ? 56 : 100
  const containerH = size === 'small' ? 40 : 70

  // Determine grid bounds for scaling
  const maxY = Math.max(...lg.map(item => item.y + item.h), 1)
  const cols = 12
  const clampedY = Math.min(maxY, 16)

  // Cell size to fill the container
  const gap = 1
  const cellW = (containerW - (cols - 1) * gap) / cols
  const cellH = (containerH - (clampedY - 1) * gap) / clampedY

  return (
    <div style={{
      width: containerW,
      height: containerH,
      position: 'relative',
      borderRadius: 4,
      overflow: 'hidden',
      background: 'var(--color-overlay-faint)',
      flexShrink: 0,
    }}>
      {lg.map((item) => {
        const widgetConfig = widgets[item.i]
        const reg = widgetConfig ? WIDGET_REGISTRY[widgetConfig.type] : null
        const cat = reg?.category || 'tools'
        const color = CATEGORY_COLORS[cat] || CATEGORY_COLORS.tools

        return (
          <div
            key={item.i}
            style={{
              position: 'absolute',
              left: item.x * (cellW + gap),
              top: Math.min(item.y, 15) * (cellH + gap),
              width: item.w * (cellW + gap) - gap,
              height: item.h * (cellH + gap) - gap,
              background: color,
              borderRadius: 2,
            }}
            title={reg?.label || item.i}
          />
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
            fontSize: 9,
            padding: '1px 5px',
            borderRadius: 4,
            background: CATEGORY_COLORS[cat] || 'var(--color-overlay-subtle)',
            color: 'var(--color-text-main)',
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}>
            {catInfo?.label || cat} {count}
          </span>
        )
      })}
    </div>
  )
}

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
  const [hoveredTemplate, setHoveredTemplate] = useState(null)

  // Owner: edit global template
  const [editingGlobalId, setEditingGlobalId] = useState(null)
  const [editGlobalName, setEditGlobalName] = useState('')

  // Owner: save current as global
  const [newGlobalName, setNewGlobalName] = useState('')

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
      icon: '',
      description: '',
      layouts: activePage.layouts,
      widgets: activePage.widgets,
      sort_order: globalTemplates.length,
    })
    setNewGlobalName('')
  }

  const handleUpdateGlobal = (t) => {
    onUpdateGlobal({
      id: t.id,
      name: editGlobalName.trim() || t.name,
      icon: t.icon,
      layouts: activePage.layouts,
      widgets: activePage.widgets,
    })
    setEditingGlobalId(null)
  }

  const handleStartEditGlobal = (t) => {
    setEditingGlobalId(t.id)
    setEditGlobalName(t.name)
  }

  // Fallback: show hardcoded presets if no global templates in DB
  const showBuiltinFallback = globalTemplates.length === 0

  // Template card renderer (used for both global and preset)
  const renderTemplateCard = (t, onClick, isGlobal = false) => {
    const isHovered = hoveredTemplate === (t.id || t.name)

    return (
      <div
        key={t.id || t.name}
        className="agg-tmpl-preview-card"
        onMouseEnter={() => setHoveredTemplate(t.id || t.name)}
        onMouseLeave={() => setHoveredTemplate(null)}
      >
        {editingGlobalId === t.id ? (
          <div className="agg-tmpl-global-edit">
            <input
              className="agg-tmpl-input"
              value={editGlobalName}
              onChange={e => setEditGlobalName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUpdateGlobal(t)}
              autoFocus
              style={{ flex: 1 }}
              placeholder="Template name"
            />
            <button className="agg-modal-add-btn" onClick={() => handleUpdateGlobal(t)}>Save</button>
            <button className="agg-tmpl-cancel-btn" onClick={() => setEditingGlobalId(null)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        ) : (
          <button className="agg-tmpl-preview-btn" onClick={onClick}>
            <LayoutPreview layouts={t.layouts} widgets={t.widgets} />
            <div className="agg-tmpl-preview-info">
              <span className="agg-tmpl-preview-name">{t.name}</span>
              <span className="agg-tmpl-preview-count">{Object.keys(t.widgets).length} widgets</span>
              <WidgetBadges widgets={t.widgets} />
            </div>
          </button>
        )}
        {isGlobal && isOwner && editingGlobalId !== t.id && (
          <div className="agg-tmpl-preview-actions">
            <button className="agg-tmpl-action-btn" onClick={() => handleStartEditGlobal(t)} title="Edit"><EditIcon /></button>
            <button className="agg-tmpl-action-btn delete" onClick={() => onDeleteGlobal(t.id)} title="Delete"><TrashIcon /></button>
          </div>
        )}
      </div>
    )
  }

  if (typeof document === 'undefined') return null

  return createPortal(
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
                  {isImportingPresets ? 'Importing...' : 'Import Built-ins'}
                </button>
              )}
            </div>

            {globalTemplates.length > 0 ? (
              <>
                <div className="agg-tmpl-preview-grid">
                  {globalTemplates.map(t =>
                    renderTemplateCard(
                      t,
                      () => { onApplyLayoutPreset(t.layouts, t.widgets); onClose() },
                      true
                    )
                  )}
                </div>

                {/* Owner: save current page as new global template */}
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
              /* Fallback: show hardcoded presets if DB is empty */
              <div className="agg-tmpl-preview-grid">
                {PRESET_TEMPLATES.map(preset =>
                  renderTemplateCard(
                    preset,
                    () => { onLoadPresetTemplate(preset.id); onClose() },
                    false
                  )
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
