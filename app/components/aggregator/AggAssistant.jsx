'use client'

import React, { useMemo, useState } from 'react'
import { WIDGET_REGISTRY } from './WidgetRegistry'

const WALLET_WIDGET_TYPES = new Set([
  'account-value','account-equity','futures-stats','futures-perf',
  'deposit-withdrawal','rankings','social-info','pnl-chart',
  'pnl-calendar','activity-timeline','positions','balances',
  'trades','transfers','performance',
])

function IconDesktop() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
}
function IconTablet() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="18.5" r="0.5" fill="currentColor"/></svg>
}
function IconMobile() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="18.5" r="0.5" fill="currentColor"/></svg>
}
function IconGrid() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
}
function IconTrash() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
}

export default function AggAssistant({
  pages,
  resolvedWallet,
  autoUseWallet,
  activePage,
  layouts,
  onFixGaps,
  onClose,
  devicePreview,
  onSetDevicePreview,
  windowWidth,
  customDevices = [],
  onAddCustomDevice,
  onRemoveCustomDevice,
  onWalletIssue,
  onNavigateToPage,
  onResizeToFit,
  onRemoveWidgets,
  hiddenPerBP = { lg: [], md: [], sm: [] },
  onUnhideWidget,
  allWidgets = {},
  effectiveBP = 'lg',
}) {
  const [addingDevice, setAddingDevice] = useState(false)
  const [deviceName, setDeviceName] = useState('')
  const [resizeError, setResizeError] = useState(null)

  const issues = useMemo(() => {
    const list = []

    if (!resolvedWallet) {
      list.push({
        type: 'warning',
        title: 'No wallet configured',
        desc: 'Set a Global wallet so scanner widgets auto-populate.',
        action: 'wallet',
      })
    }

    const widgets = activePage?.widgets || {}
    const missingWallet = Object.values(widgets).filter(w =>
      WALLET_WIDGET_TYPES.has(w.type) && !w.settings?.walletAddress && !resolvedWallet
    )
    if (missingWallet.length > 0) {
      list.push({
        type: 'warning',
        title: `${missingWallet.length} widget${missingWallet.length > 1 ? 's' : ''} missing wallet`,
        desc: 'Set a global wallet or configure each widget individually.',
        action: 'wallet',
      })
    }

    for (let i = 0; i < pages.length; i++) {
      if (Object.keys(pages[i].widgets || {}).length === 0) {
        list.push({
          type: 'info',
          title: `Page "${pages[i].name}" is empty`,
          desc: 'Add widgets with the + button in the sidebar.',
          action: 'page',
          pageIndex: i,
        })
      }
    }

    const lgCount = (layouts?.lg || []).length
    const mdCount = (layouts?.md || []).length
    const smCount = (layouts?.sm || []).length
    if (lgCount > 0 && (mdCount === 0 || smCount === 0)) {
      list.push({
        type: 'tip',
        title: 'Tablet/mobile layouts not set',
        desc: 'Use Device Preview below to design layouts for other screen sizes.',
        action: 'device-preview',
      })
    }

    return list
  }, [pages, resolvedWallet, activePage, layouts])

  const currentBP = windowWidth >= 1200 ? 'Desktop' : windowWidth >= 768 ? 'Tablet' : 'Mobile'

  const handleIssueClick = (issue) => {
    if (issue.action === 'wallet') onWalletIssue?.()
    else if (issue.action === 'page') onNavigateToPage?.(issue.pageIndex)
    else if (issue.action === 'device-preview') onSetDevicePreview('md')
  }

  const handleCaptureDevice = () => {
    if (!deviceName.trim()) return
    onAddCustomDevice?.({ name: deviceName.trim(), width: window.innerWidth })
    setDeviceName('')
    setAddingDevice(false)
  }

  // Compute active state for device preview
  const isCustomActive = (dev) => typeof devicePreview === 'number' ? devicePreview === dev.width : false
  const previewLabel =
    typeof devicePreview === 'number'
      ? (customDevices.find(d => d.width === devicePreview)?.name || `${devicePreview}px`)
      : devicePreview === 'md' ? 'Tablet'
      : devicePreview === 'sm' ? 'Mobile'
      : null

  return (
    <div className="agg-assistant-panel">
      <div className="agg-assistant-header">
        <span className="agg-assistant-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Assistant
        </span>
        <button className="agg-assistant-close" onClick={onClose}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      {/* Issues */}
      <div className="agg-assistant-section">
        <div className="agg-assistant-section-title">
          {issues.length === 0 ? '✓ No issues' : `${issues.length} issue${issues.length > 1 ? 's' : ''}`}
        </div>
        {issues.length === 0 && (
          <div className="agg-assistant-all-good">Dashboard looks good!</div>
        )}
        {issues.map((issue, i) => (
          <div
            key={i}
            className={`agg-assistant-issue agg-assistant-issue--${issue.type} agg-assistant-issue--clickable`}
            onClick={() => handleIssueClick(issue)}
            title="Click to navigate"
          >
            <div className="agg-assistant-issue-title">
              {issue.type === 'warning' ? '⚠ ' : issue.type === 'tip' ? '💡 ' : 'ℹ '}
              {issue.title}
            </div>
            <div className="agg-assistant-issue-desc">{issue.desc}</div>
          </div>
        ))}
      </div>

      {/* Device Preview */}
      <div className="agg-assistant-section">
        <div className="agg-assistant-section-title">Device Preview</div>
        <div className="agg-assistant-section-desc">
          Currently: <strong>{previewLabel || currentBP}</strong>{!previewLabel ? ' (actual)' : ' (preview)'}
        </div>
        <div className="agg-assistant-device-row">
          <button
            className={`agg-assistant-device-btn${!devicePreview ? ' active' : ''}`}
            onClick={() => onSetDevicePreview(null)}
            title="Desktop ≥1200px"
          >
            <IconDesktop />
            <span>Desktop</span>
          </button>
          <button
            className={`agg-assistant-device-btn${devicePreview === 'md' ? ' active' : ''}`}
            onClick={() => onSetDevicePreview('md')}
            title="Tablet 768–1199px"
          >
            <IconTablet />
            <span>Tablet</span>
          </button>
          <button
            className={`agg-assistant-device-btn${devicePreview === 'sm' ? ' active' : ''}`}
            onClick={() => onSetDevicePreview('sm')}
            title="Mobile <768px"
          >
            <IconMobile />
            <span>Mobile</span>
          </button>
        </div>

        {/* Custom devices */}
        {customDevices.length > 0 && (
          <div className="agg-assistant-device-row agg-assistant-device-row--custom">
            {customDevices.map(dev => (
              <div key={dev.id} className="agg-assistant-custom-device-wrap">
                <button
                  className={`agg-assistant-device-btn${isCustomActive(dev) ? ' active' : ''}`}
                  onClick={() => onSetDevicePreview(dev.width)}
                  title={`${dev.name} (${dev.width}px)`}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                  <span style={{ maxWidth: 44, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dev.name}</span>
                </button>
                <button
                  className="agg-assistant-device-remove"
                  onClick={() => onRemoveCustomDevice?.(dev.id)}
                  title="Remove"
                >
                  <IconTrash />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add custom device */}
        {addingDevice ? (
          <div className="agg-assistant-add-device-form">
            <input
              className="agg-assistant-device-name-input"
              value={deviceName}
              onChange={e => setDeviceName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCaptureDevice()}
              placeholder={`Name (current: ${window.innerWidth}px)`}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="agg-assistant-action-btn" style={{ flex: 1 }} onClick={handleCaptureDevice}>
                Capture {window.innerWidth}px
              </button>
              <button className="agg-assistant-action-btn" style={{ flex: 0, padding: '8px' }} onClick={() => setAddingDevice(false)}>✕</button>
            </div>
          </div>
        ) : (
          <button className="agg-assistant-add-device-btn" onClick={() => setAddingDevice(true)}>
            + Add my device ({window.innerWidth}px)
          </button>
        )}

          {devicePreview && (
          <div className="agg-assistant-preview-note">
            Editing {previewLabel} layout. Save as a template (Templates menu) to preserve all device layouts.
          </div>
        )}
      </div>

      {/* Hidden widgets — always visible */}
      {[['lg', 'Desktop'], ['md', 'Tablet'], ['sm', 'Mobile']].some(([bp]) => (hiddenPerBP[bp] || []).length > 0) && (
        <div className="agg-assistant-section">
          <div className="agg-assistant-section-title">Hidden Widgets</div>
          {[['lg', 'Desktop'], ['md', 'Tablet'], ['sm', 'Mobile']].map(([bp, label]) => {
            const items = hiddenPerBP[bp] || []
            if (!items.length) return null
            return (
              <div key={bp} style={{ marginBottom: 8 }}>
                <div className="agg-assistant-section-desc" style={{ marginBottom: 4 }}>{label}</div>
                {items.map(item => {
                  const widgetType = allWidgets[item.i]?.type
                  const wLabel = widgetType ? (WIDGET_REGISTRY[widgetType]?.label || widgetType) : item.i
                  return (
                    <div key={item.i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ flex: 1, fontSize: 11, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wLabel}</span>
                      <button
                        className="agg-assistant-action-btn"
                        style={{ flex: 0, padding: '3px 8px', fontSize: 11 }}
                        onClick={() => onUnhideWidget?.(item.i, bp)}
                      >Show</button>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* Layout Tools */}
      <div className="agg-assistant-section">
        <div className="agg-assistant-section-title">Layout Tools</div>
        <button className="agg-assistant-action-btn" onClick={onFixGaps}>
          <IconGrid />
          Fix Layout Gaps
        </button>
        <div className="agg-assistant-action-desc">
          Expands widgets horizontally to fill empty space between them.
        </div>

        <button
          className="agg-assistant-action-btn"
          style={{ marginTop: 6 }}
          onClick={() => {
            setResizeError(null)
            const result = onResizeToFit?.()
            if (result && !result.ok) setResizeError(result)
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
            <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
          </svg>
          Resize to Fit
          <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: 'var(--color-warning, #f59e0b)', color: '#000', fontWeight: 700, marginLeft: 4 }}>Beta</span>
        </button>
        <div className="agg-assistant-action-desc">
          Trims bottom widget heights by the status bar amount so they don't overlap it.
        </div>

        {resizeError && (
          <div className="agg-assistant-resize-error">
            <div className="agg-assistant-resize-error-title">⚠ Can't resize</div>
            <div className="agg-assistant-resize-error-desc">
              {resizeError.tooMuch
                ? 'Layout exceeds 20% of the viewport. Remove widgets before resizing.'
                : `Remove the ${resizeError.bottomWidgetIds?.length} bottom widget${resizeError.bottomWidgetIds?.length !== 1 ? 's' : ''} to make it fit?`
              }
            </div>
            <div className="agg-assistant-resize-error-actions">
              {!resizeError.tooMuch && resizeError.bottomWidgetIds?.length > 0 && (
                <button
                  className="agg-assistant-action-btn"
                  style={{ flex: 1, color: '#f87171' }}
                  onClick={() => {
                    onRemoveWidgets?.(resizeError.bottomWidgetIds)
                    setResizeError(null)
                    setTimeout(() => {
                      const result = onResizeToFit?.()
                      if (result && !result.ok) setResizeError(result)
                    }, 100)
                  }}
                >
                  Remove & Fit
                </button>
              )}
              <button
                className="agg-assistant-action-btn"
                style={{ flex: 0, padding: '8px 10px' }}
                onClick={() => setResizeError(null)}
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
