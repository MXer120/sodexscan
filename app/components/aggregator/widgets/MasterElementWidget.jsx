'use client'

import React, { Suspense, useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { WIDGET_REGISTRY, WIDGET_CATEGORIES } from '../WidgetRegistry'
import AggSelect from '../AggSelect'
import WidgetSettingsPanel from '../WidgetSettingsPanel'

function SubWidgetSkeleton() {
  return (
    <div style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
      Loading...
    </div>
  )
}

// ── Column Resizer (horizontal, between columns) ─────────────────
function ColumnResizer({ colIndex, leftPct, containerRef, columnWidths, onColumnsChange }) {
  const dragState = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const containerWidth = containerRef.current?.getBoundingClientRect().width || 600
    const totalFr = columnWidths.reduce((a, b) => a + b, 0)
    dragState.current = { startX: e.clientX, startWidths: [...columnWidths], containerWidth, totalFr }
    setIsDragging(true)

    const handleMouseMove = (e) => {
      const ds = dragState.current
      if (!ds) return
      const delta = e.clientX - ds.startX
      const deltaFr = (delta / ds.containerWidth) * ds.totalFr
      const minFr = ds.totalFr * 0.08
      const newLeft = Math.max(minFr, ds.startWidths[colIndex] + deltaFr)
      const newRight = Math.max(minFr, ds.startWidths[colIndex + 1] - deltaFr)
      const newWidths = [...ds.startWidths]
      newWidths[colIndex] = newLeft
      newWidths[colIndex + 1] = newRight
      onColumnsChange(newWidths)
    }

    const handleMouseUp = () => {
      dragState.current = null
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [colIndex, containerRef, columnWidths, onColumnsChange])

  return (
    <div
      className={`master-element-col-resizer${isDragging ? ' dragging' : ''}`}
      style={{ left: `${leftPct}%` }}
      onMouseDown={handleMouseDown}
    >
      <div className="master-element-col-resizer-bar" />
    </div>
  )
}

// ── Resize Handle ────────────────────────────────────────────────
function ResizeHandle({ subId, height, onResize }) {
  const isDragging = useRef(false)
  const startY = useRef(0)
  const startH = useRef(0)

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    isDragging.current = true
    startY.current = e.clientY
    startH.current = height

    const handleMouseMove = (e) => {
      if (!isDragging.current) return
      const delta = e.clientY - startY.current
      onResize(subId, Math.max(60, startH.current + delta))
    }
    const handleMouseUp = () => {
      isDragging.current = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [subId, height, onResize])

  return (
    <div className="master-element-resize-handle" onMouseDown={handleMouseDown}>
      <div className="master-element-resize-grip" />
    </div>
  )
}

export default function MasterElementWidget({ config, onUpdateConfig, editMode = true, devicePreview = null, effectiveBP = 'lg', resolvedWalletAddress = '' }) {
  const [showAddDropdown, setShowAddDropdown] = useState(false)
  const [search, setSearch] = useState('')
  const [settingsPanel, setSettingsPanel] = useState(null)
  const settingsBtnRefs = useRef({})
  const settingsPanelRef = useRef(null)
  const dropdownRef = useRef(null)

  const [dragOverId, setDragOverId] = useState(null)
  const dragSrcId = useRef(null)

  const gridContainerRef = useRef(null)

  // Effective columns — per-device override first, then global
  const columns = config.columnsPerBP?.[effectiveBP] ?? config.columns ?? 2
  const subWidgets = config.subWidgets || []
  const subHeights = config.subHeights || {}

  // Column widths — per-device override first, then global
  const rawColWidths = config.columnWidthsPerBP?.[effectiveBP] || config.columnWidths || []
  const columnWidths = rawColWidths.length === columns ? rawColWidths : Array(columns).fill(1)
  const colTemplate = columnWidths.map(w => `${w}fr`).join(' ')

  // Hidden sub-widgets per device (always active — not just in preview)
  const hiddenSubIds = new Set(config.hiddenSubsPerBP?.[effectiveBP] || [])
  const visibleSubs = subWidgets.filter(s => !hiddenSubIds.has(s.id))
  const hiddenSubs = subWidgets.filter(s => hiddenSubIds.has(s.id))

  const deviceLabel = effectiveBP === 'lg' ? 'Desktop' : effectiveBP === 'md' ? 'Tablet' : 'Mobile'

  const handleColumnWidthsChange = useCallback((newWidths) => {
    if (devicePreview) {
      const perBP = { ...(config.columnWidthsPerBP || {}) }
      perBP[effectiveBP] = newWidths
      onUpdateConfig({ ...config, columnWidthsPerBP: perBP })
    } else {
      onUpdateConfig({ ...config, columnWidths: newWidths })
    }
  }, [config, onUpdateConfig, devicePreview, effectiveBP])

  // Column count change — per-device if in preview (unlimited), else global (capped 1-4)
  const applyColumnsChange = useCallback((newCols) => {
    newCols = Math.max(1, newCols)
    if (devicePreview) {
      const colsPerBP = { ...(config.columnsPerBP || {}) }
      colsPerBP[effectiveBP] = newCols
      const colWidthsPerBP = { ...(config.columnWidthsPerBP || {}) }
      colWidthsPerBP[effectiveBP] = Array(newCols).fill(1)
      onUpdateConfig({ ...config, columnsPerBP: colsPerBP, columnWidthsPerBP: colWidthsPerBP })
    } else {
      const safeCols = Math.min(4, newCols)
      onUpdateConfig({ ...config, columns: safeCols, columnWidths: Array(safeCols).fill(1) })
    }
  }, [config, onUpdateConfig, devicePreview, effectiveBP])

  // Hide sub-widget on current device
  const handleHideSub = useCallback((subId) => {
    const perBP = { ...(config.hiddenSubsPerBP || {}) }
    perBP[effectiveBP] = [...(perBP[effectiveBP] || []), subId]
    onUpdateConfig({ ...config, hiddenSubsPerBP: perBP })
  }, [config, onUpdateConfig, effectiveBP])

  // Restore hidden sub-widget on current device
  const handleShowSub = useCallback((subId) => {
    const perBP = { ...(config.hiddenSubsPerBP || {}) }
    perBP[effectiveBP] = (perBP[effectiveBP] || []).filter(id => id !== subId)
    onUpdateConfig({ ...config, hiddenSubsPerBP: perBP })
  }, [config, onUpdateConfig, effectiveBP])

  // Close dropdown on outside click / esc
  useEffect(() => {
    if (!showAddDropdown) return
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowAddDropdown(false); setSearch('')
      }
    }
    const handleEsc = (e) => { if (e.key === 'Escape') { setShowAddDropdown(false); setSearch('') } }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleEsc) }
  }, [showAddDropdown])

  // Close settings panel on outside click / esc
  useEffect(() => {
    if (!settingsPanel) return
    const handleClick = (e) => {
      if (settingsPanelRef.current && !settingsPanelRef.current.contains(e.target) &&
          settingsBtnRefs.current[settingsPanel.subId] && !settingsBtnRefs.current[settingsPanel.subId].contains(e.target)) {
        setSettingsPanel(null)
      }
    }
    const handleEsc = (e) => { if (e.key === 'Escape') setSettingsPanel(null) }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleEsc) }
  }, [settingsPanel])

  const openSettings = useCallback((subId) => {
    if (settingsPanel?.subId === subId) { setSettingsPanel(null); return }
    const btn = settingsBtnRefs.current[subId]
    if (btn) {
      const rect = btn.getBoundingClientRect()
      setSettingsPanel({ subId, top: rect.bottom + 4, right: window.innerWidth - rect.right })
    }
  }, [settingsPanel])

  const handleAdd = (typeId) => {
    const reg = WIDGET_REGISTRY[typeId]
    if (!reg || typeId === 'master-element') return
    const newSub = { id: `sub-${Date.now()}`, type: typeId, settings: { ...reg.defaultSettings } }
    onUpdateConfig({ ...config, subWidgets: [...subWidgets, newSub] })
    setShowAddDropdown(false); setSearch('')
  }

  const handleRemove = (subId) => {
    const newHeights = { ...subHeights }
    delete newHeights[subId]
    // Clean from hiddenSubsPerBP too
    const perBP = { ...(config.hiddenSubsPerBP || {}) }
    for (const bp of Object.keys(perBP)) {
      perBP[bp] = (perBP[bp] || []).filter(id => id !== subId)
    }
    onUpdateConfig({ ...config, subWidgets: subWidgets.filter(s => s.id !== subId), subHeights: newHeights, hiddenSubsPerBP: perBP })
    if (settingsPanel?.subId === subId) setSettingsPanel(null)
    delete settingsBtnRefs.current[subId]
  }

  const handleSubUpdate = (subId, newSettings) => {
    onUpdateConfig({ ...config, subWidgets: subWidgets.map(s => s.id === subId ? { ...s, settings: newSettings } : s) })
  }

  const handleResize = useCallback((subId, newHeight) => {
    onUpdateConfig({ ...config, subHeights: { ...subHeights, [subId]: newHeight } })
  }, [config, subHeights, onUpdateConfig])

  // ── Drag & Drop reorder ──────────────────────────────────────
  const handleDragStart = useCallback((e, subId) => {
    dragSrcId.current = subId
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', subId)
  }, [])

  const handleDragOver = useCallback((e, subId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(subId)
  }, [])

  const handleDrop = useCallback((e, targetId) => {
    e.preventDefault()
    setDragOverId(null)
    const srcId = dragSrcId.current
    if (!srcId || srcId === targetId) return
    const arr = [...subWidgets]
    const fromIdx = arr.findIndex(s => s.id === srcId)
    const toIdx = arr.findIndex(s => s.id === targetId)
    if (fromIdx < 0 || toIdx < 0) return
    const [removed] = arr.splice(fromIdx, 1)
    arr.splice(toIdx, 0, removed)
    onUpdateConfig({ ...config, subWidgets: arr })
  }, [subWidgets, config, onUpdateConfig])

  const handleDragEnd = useCallback(() => {
    dragSrcId.current = null
    setDragOverId(null)
  }, [])

  // Widget type search
  const availableTypes = Object.entries(WIDGET_REGISTRY).filter(([id]) => id !== 'master-element')
  const filtered = search
    ? availableTypes.filter(([id, reg]) =>
        reg.label.toLowerCase().includes(search.toLowerCase()) || id.toLowerCase().includes(search.toLowerCase()))
    : availableTypes
  const grouped = {}
  for (const [id, reg] of filtered) {
    const cat = reg.category || 'other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push([id, reg])
  }

  return (
    <div className="master-element">
      {/* Toolbar — hidden when edit mode off */}
      {editMode && (
      <div className="master-element-toolbar">
        <div className="master-element-cols">
          <label>Cols{devicePreview ? ` (${deviceLabel})` : ''}</label>
          {devicePreview ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button className="master-element-sub-remove" style={{ width: 20, height: 20, fontSize: 14, lineHeight: 1 }} onClick={() => applyColumnsChange(columns - 1)}>−</button>
              <span style={{ minWidth: 18, textAlign: 'center', fontSize: 12, fontWeight: 600 }}>{columns}</span>
              <button className="master-element-sub-remove" style={{ width: 20, height: 20, fontSize: 14, lineHeight: 1 }} onClick={() => applyColumnsChange(columns + 1)}>+</button>
            </div>
          ) : (
            <AggSelect
              value={columns}
              onChange={(val) => applyColumnsChange(parseInt(val) || 2)}
              options={[{ value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4' }]}
            />
          )}
        </div>

        {/* Hidden subs restore list — shown when in device preview */}
        {devicePreview && hiddenSubs.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Hidden:</span>
            {hiddenSubs.map(s => {
              const reg = WIDGET_REGISTRY[s.type]
              return (
                <button
                  key={s.id}
                  className="master-element-sub-remove"
                  style={{ fontSize: 10, padding: '2px 6px', height: 'auto', width: 'auto', borderRadius: 3 }}
                  title={`Show on ${deviceLabel}`}
                  onClick={() => handleShowSub(s.id)}
                >
                  + {reg?.label || s.type}
                </button>
              )
            })}
          </div>
        )}

        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button className="master-element-add-btn" onClick={() => setShowAddDropdown(!showAddDropdown)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Widget
          </button>

          {showAddDropdown && (
            <div className="master-element-dropdown">
              <input className="master-element-dropdown-search" placeholder="Search widgets..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
              <div className="master-element-dropdown-list">
                {Object.entries(grouped).map(([cat, items]) => (
                  <div key={cat}>
                    <div className="master-element-dropdown-cat">{WIDGET_CATEGORIES[cat]?.icon || ''} {WIDGET_CATEGORIES[cat]?.label || cat}</div>
                    {items.map(([id, reg]) => (
                      <button key={id} className="master-element-dropdown-item" onClick={() => handleAdd(id)}>
                        <span>{reg.label}</span>
                        <span className="master-element-dropdown-desc">{reg.description}</span>
                      </button>
                    ))}
                  </div>
                ))}
                {Object.keys(grouped).length === 0 && <div className="master-element-dropdown-empty">No widgets found</div>}
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Sub-widgets grid */}
      {subWidgets.length === 0 ? (
        <div className="master-element-empty">No widgets added yet. Click "Add Widget" above.</div>
      ) : (
        <div className="master-element-grid-wrapper" ref={gridContainerRef}>
        <div className="master-element-grid" style={{ gridTemplateColumns: colTemplate }}>
          {visibleSubs.map((sub) => {
            const reg = WIDGET_REGISTRY[sub.type]
            if (!reg) return null
            const SubComponent = reg.component
            const hasSettings = (reg.settingsSchema?.length > 0) || (reg.visibilitySchema?.length > 0)
            const isSettingsOpen = settingsPanel?.subId === sub.id
            const customHeight = subHeights[sub.id]
            const isDragTarget = dragOverId === sub.id

            return (
              <div
                key={sub.id}
                className={`master-element-sub${isDragTarget ? ' drag-over' : ''}`}
                style={customHeight ? { height: customHeight } : undefined}
                draggable={editMode}
                onDragStart={editMode ? (e) => handleDragStart(e, sub.id) : undefined}
                onDragOver={editMode ? (e) => handleDragOver(e, sub.id) : undefined}
                onDrop={editMode ? (e) => handleDrop(e, sub.id) : undefined}
                onDragEnd={editMode ? handleDragEnd : undefined}
                onDragLeave={editMode ? () => setDragOverId(null) : undefined}
              >
                <div className="master-element-sub-header" style={{ cursor: editMode ? 'grab' : 'default' }}>
                  <span className="master-element-sub-title">{reg.label}</span>
                  {editMode && (
                  <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {/* Hide on this device button */}
                    {devicePreview && (
                      <button
                        className="master-element-sub-remove"
                        onClick={(e) => { e.stopPropagation(); handleHideSub(sub.id) }}
                        title={`Hide on ${deviceLabel}`}
                        style={{ opacity: 0.7 }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      </button>
                    )}
                    {hasSettings && (
                      <button
                        ref={el => { settingsBtnRefs.current[sub.id] = el }}
                        className={`master-element-sub-settings${isSettingsOpen ? ' active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); openSettings(sub.id) }}
                        title="Settings"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                      </button>
                    )}
                    <button className="master-element-sub-remove" onClick={(e) => { e.stopPropagation(); handleRemove(sub.id) }} title="Remove">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                  )}
                </div>

                <div className="master-element-sub-body">
                  <Suspense fallback={<SubWidgetSkeleton />}>
                    <SubComponent
                      config={(!resolvedWalletAddress || sub.settings?.walletAddress) ? sub.settings : { ...sub.settings, walletAddress: resolvedWalletAddress }}
                      onUpdateConfig={(newSettings) => handleSubUpdate(sub.id, newSettings)}
                    />
                  </Suspense>
                </div>

                {editMode && <ResizeHandle subId={sub.id} height={customHeight || 200} onResize={handleResize} />}
              </div>
            )
          })}
        </div>
        {/* Column resizer handles between each column pair */}
        {editMode && columns > 1 && Array.from({ length: columns - 1 }, (_, i) => {
          const totalFr = columnWidths.reduce((a, b) => a + b, 0)
          const leftFrac = columnWidths.slice(0, i + 1).reduce((a, b) => a + b, 0)
          const leftPct = (leftFrac / totalFr) * 100
          return (
            <ColumnResizer
              key={i}
              colIndex={i}
              leftPct={leftPct}
              containerRef={gridContainerRef}
              columnWidths={columnWidths}
              onColumnsChange={handleColumnWidthsChange}
            />
          )
        })}
        </div>
      )}

      {/* Settings portal */}
      {settingsPanel && typeof document !== 'undefined' && createPortal(
        <div
          ref={settingsPanelRef}
          style={{
            position: 'fixed',
            top: settingsPanel.top,
            right: settingsPanel.right,
            zIndex: 100001,
            maxHeight: `calc(100vh - ${settingsPanel.top + 16}px)`,
            overflowY: 'auto',
            overflowX: 'visible',
          }}
        >
          {(() => {
            const sub = subWidgets.find(s => s.id === settingsPanel.subId)
            const reg = sub ? WIDGET_REGISTRY[sub.type] : null
            if (!sub || !reg) return null
            return (
              <WidgetSettingsPanel
                instanceId={sub.id}
                config={{ settings: sub.settings }}
                settingsSchema={reg.settingsSchema || []}
                visibilitySchema={reg.visibilitySchema || []}
                onUpdate={(id, newSettings) => { handleSubUpdate(id, newSettings); setSettingsPanel(null) }}
                onClose={() => setSettingsPanel(null)}
                recentColors={[]}
                onAddRecentColor={() => {}}
                resolvedWalletAddress={resolvedWalletAddress}
              />
            )
          })()}
        </div>,
        document.body
      )}
    </div>
  )
}
