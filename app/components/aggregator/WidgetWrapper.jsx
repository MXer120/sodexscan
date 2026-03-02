'use client'

import React, { Suspense, useState, useRef, useEffect, useMemo, useCallback, memo } from 'react'
import { createPortal } from 'react-dom'
import { WIDGET_REGISTRY } from './WidgetRegistry'
import WidgetSettingsPanel from './WidgetSettingsPanel'

function WidgetSkeleton() {
  return (
    <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
      Loading...
    </div>
  )
}

function WidgetWrapper({ instanceId, config, onRemove, onUpdateConfig, recentColors, onAddRecentColor, resolvedWalletAddress = '', editMode = true, layoutItem, onResizeWidget, rowHeight = 80, devicePreview = null, onHideOnBP = null, effectiveBP = 'lg' }) {
  const [showSettings, setShowSettings] = useState(false)
  const [showSizePanel, setShowSizePanel] = useState(false)
  const [panelPos, setPanelPos] = useState(null)
  const [sizePanelPos, setSizePanelPos] = useState(null)
  const settingsRef = useRef(null)
  const sizePanelRef = useRef(null)
  const sizeBtnRef = useRef(null)
  const btnRef = useRef(null)

  const reg = WIDGET_REGISTRY[config.type]
  if (!reg) return null

  const Component = reg.component

  // Inject resolved wallet if widget has no explicit address
  const effectiveSettings = useMemo(() => {
    if (!resolvedWalletAddress || config.settings?.walletAddress) return config.settings
    return { ...config.settings, walletAddress: resolvedWalletAddress }
  }, [config.settings, resolvedWalletAddress])

  // Calculate panel position when settings opens
  const openSettings = useCallback((e) => {
    e.stopPropagation()
    if (showSettings) {
      setShowSettings(false)
      return
    }
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPanelPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    }
    setShowSettings(true)
  }, [showSettings])

  useEffect(() => {
    if (!showSettings) return
    const handleClick = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target) &&
          btnRef.current && !btnRef.current.contains(e.target)) {
        setShowSettings(false)
      }
    }
    const handleEsc = (e) => { if (e.key === 'Escape') setShowSettings(false) }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [showSettings])

  useEffect(() => {
    if (!showSizePanel) return
    const handleClick = (e) => {
      if (sizePanelRef.current && !sizePanelRef.current.contains(e.target) &&
          sizeBtnRef.current && !sizeBtnRef.current.contains(e.target)) {
        setShowSizePanel(false)
      }
    }
    const handleEsc = (e) => { if (e.key === 'Escape') setShowSizePanel(false) }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [showSizePanel])

  const openSizePanel = useCallback((e) => {
    e.stopPropagation()
    if (showSizePanel) { setShowSizePanel(false); return }
    if (sizeBtnRef.current) {
      const r = sizeBtnRef.current.getBoundingClientRect()
      setSizePanelPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
    }
    setShowSizePanel(true)
  }, [showSizePanel])

  const setSize = useCallback((newW, newH) => {
    if (!layoutItem || !onResizeWidget) return
    onResizeWidget(instanceId, newW - layoutItem.w, newH - layoutItem.h)
  }, [instanceId, layoutItem, onResizeWidget])

  const isMaster = config.type === 'master-element'

  const cardStyle = {}
  if (config.settings?.bgColor) cardStyle.background = config.settings.bgColor
  if (config.settings?.accentColor) cardStyle['--widget-accent'] = config.settings.accentColor

  return (
    <div
      className="agg-widget-card"
      style={cardStyle}
      {...(isMaster ? { 'data-tour': 'master-element' } : {})}
    >
      <div className="agg-widget-header widget-drag-handle">
        <span className="agg-widget-title">{reg.label}</span>
        {editMode && (
        <div className="agg-widget-actions">
          {/* Size panel toggle */}
          {layoutItem && onResizeWidget && (
            <>
              <button
                ref={sizeBtnRef}
                className={`agg-widget-btn${showSizePanel ? ' active' : ''}`}
                onClick={openSizePanel}
                title="Resize"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
                  <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
                </svg>
              </button>
              {showSizePanel && typeof document !== 'undefined' && createPortal(
                <div
                  ref={sizePanelRef}
                  className="agg-widget-size-panel"
                  style={{ position: 'fixed', top: sizePanelPos?.top, right: sizePanelPos?.right, zIndex: 100002 }}
                  onMouseDown={e => e.stopPropagation()}
                >
                  <div className="agg-widget-size-row">
                    <span className="agg-widget-size-label">Width</span>
                    <div className="agg-widget-size-stepper">
                      <button onClick={() => setSize(Math.max(1, layoutItem.w - 1), layoutItem.h)}>−</button>
                      <input
                        type="number" min="1" step="1"
                        value={layoutItem.w}
                        onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) setSize(v, layoutItem.h) }}
                      />
                      <button onClick={() => setSize(layoutItem.w + 1, layoutItem.h)}>+</button>
                    </div>
                    <span className="agg-widget-size-unit">cols</span>
                  </div>
                  <div className="agg-widget-size-row">
                    <span className="agg-widget-size-label">Height</span>
                    <div className="agg-widget-size-stepper">
                      <button onClick={() => setSize(layoutItem.w, Math.max(1, layoutItem.h - 1))}>−</button>
                      <input
                        type="number" min="1"
                        value={layoutItem.h}
                        onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) setSize(layoutItem.w, v) }}
                      />
                      <button onClick={() => setSize(layoutItem.w, layoutItem.h + 1)}>+</button>
                    </div>
                    <span className="agg-widget-size-unit">
                      ~{Math.round(layoutItem.h * (rowHeight + 8) - 8)}px
                    </span>
                  </div>
                </div>,
                document.body
              )}
            </>
          )}
          {devicePreview && onHideOnBP && (
            <button
              className="agg-widget-btn"
              onClick={(e) => { e.stopPropagation(); onHideOnBP(instanceId) }}
              title="Hide on this device"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          )}
          <button
            ref={btnRef}
            className="agg-widget-btn"
            onClick={openSettings}
            title="Settings"
            {...(isMaster ? { 'data-tour': 'master-element-settings' } : {})}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </button>
          {showSettings && typeof document !== 'undefined' && createPortal(
            <div
              ref={settingsRef}
              style={{
                position: 'fixed',
                top: panelPos?.top,
                right: panelPos?.right,
                zIndex: 100001,
                maxHeight: `calc(100vh - ${(panelPos?.top || 0) + 16}px)`,
                overflowY: 'auto',
                overflowX: 'visible',
              }}
            >
              <WidgetSettingsPanel
                instanceId={instanceId}
                config={config}
                settingsSchema={reg.settingsSchema}
                visibilitySchema={reg.visibilitySchema || []}
                onUpdate={(id, newSettings) => onUpdateConfig(id, newSettings)}
                onClose={() => setShowSettings(false)}
                recentColors={recentColors}
                onAddRecentColor={onAddRecentColor}
                resolvedWalletAddress={resolvedWalletAddress}
              />
            </div>,
            document.body
          )}
          <button
            className="agg-widget-btn agg-widget-btn-remove"
            onClick={(e) => { e.stopPropagation(); onRemove(instanceId) }}
            title="Remove widget"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        )}
      </div>
      <div className="agg-widget-body">
        <Suspense fallback={<WidgetSkeleton />}>
          <Component
            config={effectiveSettings}
            onUpdateConfig={(newSettings) => onUpdateConfig(instanceId, newSettings)}
            editMode={editMode}
            devicePreview={devicePreview}
            effectiveBP={effectiveBP}
            resolvedWalletAddress={resolvedWalletAddress}
          />
        </Suspense>
      </div>
    </div>
  )
}

export default memo(WidgetWrapper)
