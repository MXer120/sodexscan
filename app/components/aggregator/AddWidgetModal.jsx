'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { WIDGET_REGISTRY, WIDGET_CATEGORIES } from './WidgetRegistry'

export default function AddWidgetModal({ onAdd, onClose, existingWidgetTypes }) {
  const [search, setSearch] = useState('')

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.body.style.overflow = 'unset'
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  const filteredWidgets = Object.entries(WIDGET_REGISTRY).filter(([_, reg]) => {
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return reg.label.toLowerCase().includes(term) || reg.description.toLowerCase().includes(term)
  })

  const grouped = {}
  for (const [typeId, reg] of filteredWidgets) {
    const cat = reg.category || 'other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push({ typeId, ...reg })
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="agg-modal-overlay" onClick={onClose}>
      <div className="agg-modal" onClick={(e) => e.stopPropagation()}>
        <div className="agg-modal-header">
          <h2>Add Widget</h2>
          <button className="agg-modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="agg-modal-search">
          <input
            type="text"
            placeholder="Search widgets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="agg-modal-body">
          {Object.entries(grouped).map(([catKey, widgets]) => {
            const cat = WIDGET_CATEGORIES[catKey] || { label: catKey, icon: '📦' }
            return (
              <div key={catKey} className="agg-modal-category">
                <h3 className="agg-modal-cat-title">
                  <span>{cat.icon}</span> {cat.label}
                </h3>
                <div className="agg-modal-widgets-grid">
                  {widgets.map((widget) => (
                    <div key={widget.typeId} className="agg-modal-widget-card">
                      <div>
                        <div className="agg-modal-widget-name">{widget.label}</div>
                        <div className="agg-modal-widget-desc">{widget.description}</div>
                      </div>
                      <button
                        className="agg-modal-add-btn"
                        onClick={() => { onAdd(widget.typeId); onClose() }}
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {filteredWidgets.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
              No widgets match your search
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
