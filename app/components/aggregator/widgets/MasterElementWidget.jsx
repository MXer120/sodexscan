'use client'

import React, { Suspense, useState, useRef, useEffect } from 'react'
import { WIDGET_REGISTRY, WIDGET_CATEGORIES } from '../WidgetRegistry'
import AggSelect from '../AggSelect'

function SubWidgetSkeleton() {
  return (
    <div style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
      Loading...
    </div>
  )
}

export default function MasterElementWidget({ config, onUpdateConfig }) {
  const [showAddDropdown, setShowAddDropdown] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef(null)

  const columns = config.columns || 2
  const subWidgets = config.subWidgets || []

  // Close dropdown on outside click / esc
  useEffect(() => {
    if (!showAddDropdown) return
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowAddDropdown(false)
        setSearch('')
      }
    }
    const handleEsc = (e) => { if (e.key === 'Escape') { setShowAddDropdown(false); setSearch('') } }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [showAddDropdown])

  // Add sub-widget
  const handleAdd = (typeId) => {
    const reg = WIDGET_REGISTRY[typeId]
    if (!reg || typeId === 'master-element') return
    const newSub = { id: `sub-${Date.now()}`, type: typeId, settings: { ...reg.defaultSettings } }
    onUpdateConfig({ ...config, subWidgets: [...subWidgets, newSub] })
    setShowAddDropdown(false)
    setSearch('')
  }

  // Remove sub-widget
  const handleRemove = (subId) => {
    onUpdateConfig({ ...config, subWidgets: subWidgets.filter(s => s.id !== subId) })
  }

  // Update sub-widget settings
  const handleSubUpdate = (subId, newSettings) => {
    onUpdateConfig({
      ...config,
      subWidgets: subWidgets.map(s => s.id === subId ? { ...s, settings: newSettings } : s)
    })
  }

  // Column change
  const handleColumnsChange = (val) => {
    const n = Math.max(1, Math.min(4, parseInt(val) || 2))
    onUpdateConfig({ ...config, columns: n })
  }

  // Available widget types for dropdown (exclude master-element)
  const availableTypes = Object.entries(WIDGET_REGISTRY).filter(([id]) => id !== 'master-element')
  const filtered = search
    ? availableTypes.filter(([id, reg]) =>
        reg.label.toLowerCase().includes(search.toLowerCase()) ||
        id.toLowerCase().includes(search.toLowerCase())
      )
    : availableTypes

  // Group by category
  const grouped = {}
  for (const [id, reg] of filtered) {
    const cat = reg.category || 'other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push([id, reg])
  }

  return (
    <div className="master-element">
      {/* Toolbar */}
      <div className="master-element-toolbar">
        <div className="master-element-cols">
          <label>Cols</label>
          <AggSelect
            value={columns}
            onChange={(val) => handleColumnsChange(val)}
            options={[
              { value: 1, label: '1' },
              { value: 2, label: '2' },
              { value: 3, label: '3' },
              { value: 4, label: '4' },
            ]}
          />
        </div>

        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            className="master-element-add-btn"
            onClick={() => setShowAddDropdown(!showAddDropdown)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Widget
          </button>

          {showAddDropdown && (
            <div className="master-element-dropdown">
              <input
                className="master-element-dropdown-search"
                placeholder="Search widgets..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
              <div className="master-element-dropdown-list">
                {Object.entries(grouped).map(([cat, items]) => (
                  <div key={cat}>
                    <div className="master-element-dropdown-cat">
                      {WIDGET_CATEGORIES[cat]?.icon || ''} {WIDGET_CATEGORIES[cat]?.label || cat}
                    </div>
                    {items.map(([id, reg]) => (
                      <button
                        key={id}
                        className="master-element-dropdown-item"
                        onClick={() => handleAdd(id)}
                      >
                        <span>{reg.label}</span>
                        <span className="master-element-dropdown-desc">{reg.description}</span>
                      </button>
                    ))}
                  </div>
                ))}
                {Object.keys(grouped).length === 0 && (
                  <div className="master-element-dropdown-empty">No widgets found</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sub-widgets grid */}
      {subWidgets.length === 0 ? (
        <div className="master-element-empty">
          No widgets added yet. Click "Add Widget" above.
        </div>
      ) : (
        <div
          className="master-element-grid"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {subWidgets.map((sub) => {
            const reg = WIDGET_REGISTRY[sub.type]
            if (!reg) return null
            const SubComponent = reg.component

            return (
              <div key={sub.id} className="master-element-sub">
                <div className="master-element-sub-header">
                  <span className="master-element-sub-title">{reg.label}</span>
                  <button
                    className="master-element-sub-remove"
                    onClick={() => handleRemove(sub.id)}
                    title="Remove"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div className="master-element-sub-body">
                  <Suspense fallback={<SubWidgetSkeleton />}>
                    <SubComponent
                      config={sub.settings}
                      onUpdateConfig={(newSettings) => handleSubUpdate(sub.id, newSettings)}
                    />
                  </Suspense>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
