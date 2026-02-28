'use client'

import React, { Suspense, useState, useRef, useEffect, useMemo, memo } from 'react'
import { WIDGET_REGISTRY } from './WidgetRegistry'
import WidgetSettingsPanel from './WidgetSettingsPanel'

function WidgetSkeleton() {
  return (
    <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
      Loading...
    </div>
  )
}

function WidgetWrapper({ instanceId, config, onRemove, onUpdateConfig, recentColors, onAddRecentColor, resolvedWalletAddress }) {
  const [showSettings, setShowSettings] = useState(false)
  const settingsRef = useRef(null)

  const reg = WIDGET_REGISTRY[config.type]
  if (!reg) return null

  const Component = reg.component

  // Inject resolved wallet if widget has no explicit address
  const effectiveSettings = useMemo(() => {
    if (!resolvedWalletAddress || config.settings?.walletAddress) return config.settings
    return { ...config.settings, walletAddress: resolvedWalletAddress }
  }, [config.settings, resolvedWalletAddress])

  useEffect(() => {
    if (!showSettings) return
    const handleClick = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
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

  const cardStyle = {}
  if (config.settings?.bgColor) cardStyle.background = config.settings.bgColor
  if (config.settings?.accentColor) cardStyle['--widget-accent'] = config.settings.accentColor

  return (
    <div className="agg-widget-card" style={cardStyle}>
      <div className="agg-widget-header widget-drag-handle">
        <span className="agg-widget-title">{reg.label}</span>
        <div className="agg-widget-actions">
          <div style={{ position: 'relative' }} ref={settingsRef}>
            <button
              className="agg-widget-btn"
              onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings) }}
              title="Settings"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            </button>
            {showSettings && (
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
            )}
          </div>
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
      </div>
      <div className="agg-widget-body">
        <Suspense fallback={<WidgetSkeleton />}>
          <Component
            config={effectiveSettings}
            onUpdateConfig={(newSettings) => onUpdateConfig(instanceId, newSettings)}
          />
        </Suspense>
      </div>
    </div>
  )
}

export default memo(WidgetWrapper)
