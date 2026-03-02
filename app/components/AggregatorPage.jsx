'use client'

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Responsive, WidthProvider } from 'react-grid-layout/legacy'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import { useAggregatorLayout } from '../hooks/useAggregatorLayout'
import { useTheme } from '../lib/ThemeContext'
import { THEME_FAVICONS } from '../lib/themes'
import { useUserProfile } from '../hooks/useProfile'
import { useSessionContext } from '../lib/SessionContext'
import { useGlobalTemplates, useGlobalTemplateMutations } from '../hooks/useGlobalTemplates'
import { useGlobalLayouts, useGlobalLayoutMutations } from '../hooks/useGlobalLayouts'
import WidgetWrapper from './aggregator/WidgetWrapper'
import AddWidgetModal from './aggregator/AddWidgetModal'
import AggNav from './aggregator/AggNav'
import TemplateManager from './aggregator/TemplateManager'
import LayoutManager from './aggregator/LayoutManager'
import AggTutorial from './aggregator/AggTutorial'
import AggAssistant from './aggregator/AggAssistant'
import HotkeySettings from './aggregator/HotkeySettings'
import { PerformanceModeContext } from '../lib/PerformanceModeContext'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import '../styles/AggregatorPage.css'

const ResponsiveGridLayout = WidthProvider(Responsive)

export default function AggregatorPage() {
  const agg = useAggregatorLayout()
  const { logo, theme } = useTheme()
  const favicon = THEME_FAVICONS[theme.colorScheme] || '/favicon-cyan.svg'
  const { isOwner } = useSessionContext()
  const { data: profileData } = useUserProfile()
  const profileWallet = profileData?.profile?.own_wallet || ''
  const { data: globalTemplates = [] } = useGlobalTemplates()
  const globalMutations = useGlobalTemplateMutations()
  const { data: globalLayouts = [] } = useGlobalLayouts()
  const globalLayoutMutations = useGlobalLayoutMutations()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [showLayoutManager, setShowLayoutManager] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [showAssistant, setShowAssistant] = useState(false)
  const [showHotkeySettings, setShowHotkeySettings] = useState(false)
  const [walletHighlight, setWalletHighlight] = useState(false)
  const [devicePreview, setDevicePreview] = useState(null) // null | 'md' | 'sm' | number (custom width)
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  const [rowHeight, setRowHeight] = useState(() =>
    typeof window !== 'undefined' ? parseFloat(localStorage.getItem('agg-rowheight') || '20') : 20
  )

  // Sync rowHeight ↔ supabase on first load
  useEffect(() => {
    if (!agg.storedRowHeight) {
      // No value in supabase yet — persist current value
      agg.setStoredRowHeight(rowHeight)
    } else if (agg.storedRowHeight !== rowHeight) {
      // Supabase has a value — apply it
      setRowHeight(agg.storedRowHeight)
      localStorage.setItem('agg-rowheight', String(agg.storedRowHeight))
    }
  }, [agg.storedRowHeight])
  const gridWrapperRef = useRef(null)
  const horizontalDragState = useRef(null)
  const [gridContainerWidth, setGridContainerWidth] = useState(0)

  // Track grid container width for resize handle positioning
  useEffect(() => {
    const el = gridWrapperRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setGridContainerWidth(entry.contentRect.width)
    })
    ro.observe(el)
    setGridContainerWidth(el.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [])

  // Hide main site navbar on aggregator page
  useEffect(() => {
    const navbar = document.querySelector('.navbar, .nav-bar, nav.main-nav, header.site-header, [class*="Navbar"]')
    if (navbar) navbar.style.display = 'none'
    document.body.classList.add('aggregator-active')
    return () => {
      if (navbar) navbar.style.display = ''
      document.body.classList.remove('aggregator-active')
    }
  }, [])

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Show tutorial on first visit (after initial load)
  useEffect(() => {
    if (!agg.isLoading && typeof window !== 'undefined' && !localStorage.getItem('agg-tutorial-seen')) {
      setShowTutorial(true)
    }
  }, [agg.isLoading])

  // Auto-apply scan preset if active page has no widgets after load
  const scanAutoApplied = useRef(false)
  useEffect(() => {
    if (agg.isLoading) return
    if (scanAutoApplied.current) return
    const widgetCount = Object.keys(agg.activePage?.widgets || {}).length
    if (widgetCount === 0) {
      scanAutoApplied.current = true
      agg.loadPresetTemplate('preset-scan')
    }
  }, [agg.isLoading, agg.activePage])

  // Deactivate edit mode when page is locked
  useEffect(() => {
    if (agg.activePage?.locked === true && agg.editMode !== false) {
      agg.setEditMode(false)
    }
  }, [agg.activePage?.locked])

  const handleCloseTutorial = useCallback(() => {
    setShowTutorial(false)
    if (typeof window !== 'undefined') localStorage.setItem('agg-tutorial-seen', '1')
  }, [])

  // Global hotkey listener
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      // Ignore if a modal is open that manages its own keys
      if (showHotkeySettings) return

      const hk = agg.hotkeyMap
      const k = e.key

      if (k === hk.prevPage || k === hk.prevPageAlt) {
        e.preventDefault()
        agg.setActivePage(
          (agg.activePageIndex - 1 + agg.pages.length) % agg.pages.length
        )
      } else if (k === hk.nextPage || k === hk.nextPageAlt) {
        e.preventDefault()
        agg.setActivePage(
          (agg.activePageIndex + 1) % agg.pages.length
        )
      } else if (k === hk.perfMode) {
        agg.setPerformanceMode(!agg.performanceMode)
      } else if (k === hk.editMode) {
        agg.setEditMode(!(agg.editMode !== false))
      } else if (k === hk.assistant) {
        setShowAssistant(v => !v)
      } else if (k === hk.tutorial) {
        setShowTutorial(v => !v)
      } else if (k === hk.sidebar) {
        agg.setNavExpanded(!agg.navExpanded)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [agg, showHotkeySettings])

  // Device preview constrains grid width to force a breakpoint
  const devicePreviewWidth =
    typeof devicePreview === 'number' ? devicePreview
    : devicePreview === 'md' ? 960
    : devicePreview === 'sm' ? 400
    : undefined

  const isMobile = windowWidth < 768

  // Effective breakpoint respects device preview mode
  const effectiveBP = useMemo(() => {
    const w = devicePreviewWidth || windowWidth
    return w >= 1200 ? 'lg' : w >= 768 ? 'md' : 'sm'
  }, [devicePreviewWidth, windowWidth])

  const handleSetDevicePreview = useCallback((bp) => {
    setDevicePreview(bp || null)
  }, [])

  const handleWalletIssue = useCallback(() => {
    agg.setNavExpanded(true)
    setWalletHighlight(true)
    setTimeout(() => setWalletHighlight(false), 2200)
  }, [agg.setNavExpanded])

  const handleNavigateToPage = useCallback((i) => {
    agg.setActivePage(i)
    setShowAssistant(false)
  }, [agg.setActivePage])

  const handleResizeToFit = useCallback(() => {
    const contentEl = document.querySelector('.agg-content')
    if (!contentEl) return { ok: false }

    // scrollHeight - clientHeight = exact pixel overflow the user can scroll
    // padding-bottom (status bar) is included in scrollHeight so this is already correct
    const overflowPx = contentEl.scrollHeight - contentEl.clientHeight

    if (overflowPx <= 0) return { ok: true }
    if (overflowPx > 0.3 * contentEl.clientHeight) return { ok: false, tooMuch: true }

    const MARGIN_Y = 8
    const bp = effectiveBP
    const layout = agg.layouts?.[bp] || []
    if (!layout.length) return { ok: true }

    const overflowRows = Math.ceil(overflowPx / (rowHeight + MARGIN_Y))

    const bottomWidgets = layout.filter(item =>
      !layout.some(other =>
        other.i !== item.i &&
        other.y >= item.y + item.h &&
        other.x < item.x + item.w &&
        other.x + other.w > item.x
      )
    )

    const newLayout = layout.map(item => {
      if (!bottomWidgets.some(b => b.i === item.i)) return item
      return { ...item, h: Math.max(1, item.h - overflowRows) }
    })

    agg.updateBreakpointLayout(bp, newLayout)
    return { ok: true }
  }, [agg, rowHeight, effectiveBP])

  const currentPageLocked = agg.activePage?.locked === true

  const handleRemoveWidgets = useCallback((ids) => {
    if (currentPageLocked) return
    ids.forEach(id => agg.removeWidget(id))
  }, [agg, currentPageLocked])

  const handleResizeWidget = useCallback((instanceId, dw, dh) => {
    if (currentPageLocked) return
    const bp = effectiveBP
    const cols = { lg: 24, md: 12, sm: 4 }[bp] || 24
    const layout = agg.layouts?.[bp] || []
    const item = layout.find(l => l.i === instanceId)
    if (!item) return
    const newW = Math.max(1, Math.min(cols - item.x, Math.round(item.w + dw)))
    const newH = Math.max(1, item.h + dh)
    agg.updateBreakpointLayout(bp, layout.map(l => l.i === instanceId ? { ...l, w: newW, h: newH } : l))
  }, [agg, effectiveBP])

  // Only update the currently active breakpoint — never let RGL overwrite other breakpoints
  const handleLayoutChange = useCallback((currentLayout) => {
    if (currentPageLocked) return
    agg.updateBreakpointLayout(effectiveBP, currentLayout)
  }, [agg.updateBreakpointLayout, effectiveBP, currentPageLocked])

  const handleRemoveWidget = useCallback((instanceId) => {
    if (currentPageLocked) return
    agg.removeWidget(instanceId)
  }, [agg.removeWidget, currentPageLocked])

  // Horizontal bidirectional resize between adjacent widgets
  const handleHorizontalResizeStart = useCallback((instanceId, startClientX) => {
    if (currentPageLocked) return
    const startLayouts = JSON.parse(JSON.stringify(agg.layouts || {}))
    horizontalDragState.current = { instanceId, startClientX, startLayouts, lastDeltaCol: 0, rafId: null }

    const applyResize = (deltaCol) => {
      const ds = horizontalDragState.current
      if (!ds || deltaCol === ds.lastDeltaCol) return
      ds.lastDeltaCol = deltaCol

      const ew = devicePreviewWidth || window.innerWidth
      const currentBP = ew >= 1200 ? 'lg' : ew >= 768 ? 'md' : 'sm'
      const cols = { lg: 24, md: 12, sm: 4 }[currentBP] || 24
      const bpLayout = ds.startLayouts[currentBP] || ds.startLayouts.lg || []

      const item = bpLayout.find(l => l.i === ds.instanceId)
      if (!item) return

      const adj = bpLayout.find(other =>
        other.i !== ds.instanceId &&
        other.x === item.x + item.w &&
        other.y < item.y + item.h &&
        other.y + other.h > item.y
      )

      const newItemW = Math.max(1, Math.min(cols - item.x, item.w + deltaCol))
      const actualDelta = newItemW - item.w
      if (actualDelta === 0) return

      const newBPLayout = bpLayout.map(l => {
        if (l.i === ds.instanceId) return { ...l, w: newItemW }
        if (adj && l.i === adj.i) {
          return { ...l, x: Math.max(0, l.x + actualDelta), w: Math.max(1, l.w - actualDelta) }
        }
        return l
      })

      agg.updateLayout({ ...ds.startLayouts, [currentBP]: newBPLayout })
    }

    const handleMouseMove = (e) => {
      const ds = horizontalDragState.current
      if (!ds) return
      const deltaX = e.clientX - ds.startClientX
      const containerEl = gridWrapperRef.current
      if (!containerEl) return

      const containerWidth = containerEl.getBoundingClientRect().width
      const ww = window.innerWidth
      const cols = ww >= 1200 ? 24 : ww >= 768 ? 12 : 4
      const pixelPerCol = (containerWidth - 8 * (cols - 1)) / cols + 8
      const deltaCol = Math.round(deltaX / pixelPerCol)

      if (ds.rafId) cancelAnimationFrame(ds.rafId)
      ds.rafId = requestAnimationFrame(() => applyResize(deltaCol))
    }

    const handleMouseUp = () => {
      const ds = horizontalDragState.current
      if (ds?.rafId) cancelAnimationFrame(ds.rafId)
      horizontalDragState.current = null
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [agg, devicePreviewWidth, currentPageLocked])

  const widgetEntries = useMemo(
    () => Object.entries(agg.widgets || {}),
    [agg.widgets]
  )

  // Strip minW/minH from RGL layouts so drag min matches +/- min (1)
  const rglLayouts = useMemo(() => {
    const result = {}
    for (const [bp, items] of Object.entries(agg.layouts || {})) {
      result[bp] = items.map(item => ({ ...item, minW: 1, minH: 1 }))
    }
    return result
  }, [agg.layouts])

  const currentBPLayout = useMemo(() => {
    return agg.layouts?.[effectiveBP] || agg.layouts?.lg || []
  }, [agg.layouts, effectiveBP])

  const visibleWidgetEntries = useMemo(() => {
    const ids = new Set(currentBPLayout.map(l => l.i))
    return widgetEntries.filter(([id]) => ids.has(id))
  }, [widgetEntries, currentBPLayout])

  // Compute adjacent widget pairs for centered resize handles
  const adjacentPairs = useMemo(() => {
    if (isMobile || !gridContainerWidth) return []
    const currentBP = effectiveBP
    const cols = { lg: 24, md: 12, sm: 4 }[currentBP] || 24
    const bpLayout = agg.layouts?.[currentBP] || agg.layouts?.lg || []
    if (!bpLayout.length) return []

    const marginX = 8, marginY = 8
    const colWidth = (gridContainerWidth - marginX * (cols - 1)) / cols

    const pairs = []
    for (const item of bpLayout) {
      const adj = bpLayout.find(other =>
        other.i !== item.i &&
        other.x === item.x + item.w &&
        other.y < item.y + item.h &&
        other.y + other.h > item.y
      )
      if (!adj) continue
      if (pairs.some(p => p.leftId === adj.i && p.rightId === item.i)) continue

      const overlapTop = Math.max(item.y, adj.y)
      const overlapBottom = Math.min(item.y + item.h, adj.y + adj.h)

      const borderX = (item.x + item.w) * (colWidth + marginX) - marginX / 2
      const top = overlapTop * (rowHeight + marginY)
      const height = (overlapBottom - overlapTop) * (rowHeight + marginY) - marginY

      pairs.push({ leftId: item.i, rightId: adj.i, left: borderX, top, height })
    }
    return pairs
  }, [agg.layouts, effectiveBP, isMobile, gridContainerWidth, rowHeight])

  const renderResizeHandles = useCallback(() => {
    if (!adjacentPairs.length) return null
    return adjacentPairs.map((pair) => (
      <div
        key={`resize-${pair.leftId}-${pair.rightId}`}
        className="grid-h-resize-zone"
        style={{
          position: 'absolute',
          left: pair.left - 6,
          top: pair.top,
          width: 12,
          height: pair.height,
          zIndex: 20,
          cursor: 'ew-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseDown={(e) => {
          e.stopPropagation()
          e.preventDefault()
          handleHorizontalResizeStart(pair.leftId, e.clientX)
        }}
      >
        <div className="grid-h-resize-bar" />
      </div>
    ))
  }, [adjacentPairs, handleHorizontalResizeStart])

  // Get recent colors from active template
  const activeTemplate = agg.templates.find(t => t.id === agg.activePage?.templateId)
  const recentColors = activeTemplate?.recentColors || []

  // Wallet resolution: page default → global → profile (profile only when autoUseWallet)
  const pageDefaultWallet = agg.activePage?.defaultWallet || ''
  const resolvedWalletFallback = pageDefaultWallet || agg.globalWallet || (agg.autoUseWallet ? profileWallet : '')

  // Sidebar always left
  const navDockClass = 'nav-left'

  if (agg.isLoading) {
    return (
      <div className="agg-loading-screen">
        <img src={logo || '/logo.svg'} alt="Logo" className="agg-loading-logo" />
        <div className="agg-loading-bar">
          <div
            className="agg-loading-bar-fill"
            style={{ width: `${agg.loadingProgress}%` }}
          />
        </div>
        <p className="agg-loading-text">
          {agg.loadingProgress < 30 ? 'Authenticating...' :
           agg.loadingProgress < 60 ? 'Loading layout...' :
           agg.loadingProgress < 90 ? 'Initializing widgets...' :
           'Almost ready...'}
        </p>
      </div>
    )
  }

  return (
    <PerformanceModeContext.Provider value={agg.performanceMode}>
    <MotionConfig reducedMotion={agg.performanceMode ? 'always' : 'never'}>
    <div className={`agg-root ${navDockClass}${agg.performanceMode ? ' perf-mode' : ''}`}>
      {/* Navigation sidebar */}
      <AggNav
        logo={logo}
        favicon={favicon}
        navExpanded={agg.navExpanded}
        onSetNavExpanded={agg.setNavExpanded}
        pages={agg.pages}
        activePageIndex={agg.activePageIndex}
        onSetActivePage={agg.setActivePage}
        onAddPage={agg.addPage}
        onRemovePage={agg.removePage}
        onRenamePage={agg.renamePage}
        onTogglePageLock={agg.togglePageLock}
        onAddWidget={() => { if (!currentPageLocked) setShowAddModal(true) }}
        onResetToDefault={agg.resetToDefault}
        templates={agg.templates}
        onSaveAsTemplate={agg.saveAsTemplate}
        onLoadTemplate={agg.loadTemplate}
        onDeleteTemplate={agg.deleteTemplate}
        onShowTemplateManager={() => { if (!currentPageLocked) setShowTemplateManager(true) }}
        onShowLayoutManager={() => { if (!currentPageLocked) setShowLayoutManager(true) }}
        quickLinks={agg.quickLinks}
        onAddQuickLink={agg.addQuickLink}
        onRemoveQuickLink={agg.removeQuickLink}
        onUpdateQuickLink={agg.updateQuickLink}
        onReorderQuickLinks={agg.reorderQuickLinks}
        folders={agg.folders}
        onAddFolder={agg.addFolder}
        onRenameFolder={agg.renameFolder}
        onRemoveFolder={agg.removeFolder}
        globalWallet={agg.globalWallet}
        pageDefaultWallet={pageDefaultWallet}
        profileWallet={profileWallet}
        onSetGlobalWallet={agg.setGlobalWallet}
        onSetPageDefaultWallet={(wallet) => agg.setPageDefaultWallet(agg.activePageIndex, wallet)}
        autoUseWallet={agg.autoUseWallet}
        onSetAutoUseWallet={agg.setAutoUseWallet}
        performanceMode={agg.performanceMode}
        onSetPerformanceMode={agg.setPerformanceMode}
        editMode={currentPageLocked ? false : agg.editMode}
        onSetEditMode={(val) => { if (!currentPageLocked) agg.setEditMode(val) }}
        onShowTutorial={() => setShowTutorial(true)}
        onToggleAssistant={() => setShowAssistant(v => !v)}
        assistantOpen={showAssistant}
        walletHighlight={walletHighlight}
      />

      {/* Main content */}
      <div className={`agg-content${devicePreview ? ' agg-content--device-preview' : ''}`}>
        {agg.performanceMode ? (
          <div className="agg-grid-wrapper" ref={gridWrapperRef} style={{ position: 'relative', maxWidth: devicePreviewWidth }}>
            {widgetEntries.length === 0 ? (
              <div className="agg-empty">
                <p>No widgets yet. Click the + button in the sidebar to get started.</p>
              </div>
            ) : (
              <>
                <ResponsiveGridLayout
                  className="agg-grid"
                  layouts={rglLayouts}
                  breakpoints={{ lg: 1200, md: 768, sm: 0 }}
                  cols={{ lg: 24, md: 12, sm: 4 }}
                  rowHeight={rowHeight}
                  containerPadding={[0, 0]}
                  margin={[8, 8]}
                  isDraggable={!isMobile && agg.editMode !== false && !currentPageLocked}
                  isResizable={!isMobile && agg.editMode !== false && !currentPageLocked}
                  draggableHandle=".widget-drag-handle"
                  onLayoutChange={handleLayoutChange}
                  compactType="vertical"
                  useCSSTransforms={false}
                  transformScale={1}
                >
                  {visibleWidgetEntries.map(([instanceId, config]) => (
                    <div key={instanceId}>
                      <WidgetWrapper
                        instanceId={instanceId}
                        config={config}
                        onRemove={handleRemoveWidget}
                        onUpdateConfig={agg.updateWidgetConfig}
                        recentColors={recentColors}
                        onAddRecentColor={agg.addRecentColor}
                        resolvedWalletAddress={resolvedWalletFallback}
                        editMode={agg.editMode !== false}
                        layoutItem={currentBPLayout.find(l => l.i === instanceId)}
                        onResizeWidget={handleResizeWidget}
                        rowHeight={rowHeight}
                        devicePreview={devicePreview}
                        effectiveBP={effectiveBP}
                        onHideOnBP={(id) => agg.hideWidgetOnBP(id, effectiveBP)}
                      />
                    </div>
                  ))}
                </ResponsiveGridLayout>
                {(agg.editMode !== false) && renderResizeHandles()}
              </>
            )}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={agg.activePageIndex}
              className="agg-grid-wrapper"
              ref={gridWrapperRef}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              style={{ position: 'relative', maxWidth: devicePreviewWidth }}
            >
              {widgetEntries.length === 0 ? (
                <div className="agg-empty">
                  <p>No widgets yet. Click the + button in the sidebar to get started.</p>
                </div>
              ) : (
                <>
                  <ResponsiveGridLayout
                    className="agg-grid"
                    layouts={rglLayouts}
                    breakpoints={{ lg: 1200, md: 768, sm: 0 }}
                    cols={{ lg: 24, md: 12, sm: 4 }}
                    rowHeight={rowHeight}
                    containerPadding={[0, 0]}
                    margin={[8, 8]}
                    isDraggable={!isMobile && agg.editMode !== false}
                    isResizable={!isMobile && agg.editMode !== false}
                    draggableHandle=".widget-drag-handle"
                    onLayoutChange={handleLayoutChange}
                    compactType="vertical"
                    useCSSTransforms={true}
                  >
                    {visibleWidgetEntries.map(([instanceId, config]) => (
                      <div key={instanceId}>
                        <WidgetWrapper
                          instanceId={instanceId}
                          config={config}
                          onRemove={handleRemoveWidget}
                          onUpdateConfig={agg.updateWidgetConfig}
                          recentColors={recentColors}
                          onAddRecentColor={agg.addRecentColor}
                          resolvedWalletAddress={resolvedWalletFallback}
                          editMode={agg.editMode !== false}
                          layoutItem={currentBPLayout.find(l => l.i === instanceId)}
                          onResizeWidget={handleResizeWidget}
                          rowHeight={rowHeight}
                          devicePreview={devicePreview}
                          effectiveBP={effectiveBP}
                          onHideOnBP={(id) => agg.hideWidgetOnBP(id, effectiveBP)}
                        />
                      </div>
                    ))}
                  </ResponsiveGridLayout>
                  {(agg.editMode !== false) && renderResizeHandles()}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddWidgetModal
          onAdd={agg.addWidget}
          onClose={() => setShowAddModal(false)}
          existingWidgetTypes={Object.values(agg.widgets || {}).map(w => w.type)}
        />
      )}

      {/* Device preview exit button */}
      {devicePreview && (
        <button
          className="agg-device-preview-exit-btn"
          onClick={() => handleSetDevicePreview(null)}
        >
          ✕ Exit {typeof devicePreview === 'number' ? `${devicePreview}px` : devicePreview === 'md' ? 'Tablet' : 'Mobile'} Preview
        </button>
      )}

      {/* Assistant panel — animated slide-in */}
      <AnimatePresence>
        {showAssistant && (
          <motion.div
            key="assistant-panel"
            initial={{ x: -290 }}
            animate={{ x: 0 }}
            exit={{ x: -290 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: 'fixed',
              top: 0,
              bottom: 0,
              left: agg.navExpanded ? 220 : 48,
              width: 290,
              zIndex: 98, // below nav z-index:100 → slides from behind nav
            }}
          >
            <AggAssistant
              pages={agg.pages}
              resolvedWallet={resolvedWalletFallback}
              autoUseWallet={agg.autoUseWallet}
              activePage={agg.activePage}
              layouts={agg.layouts}
              onFixGaps={agg.fixGaps}
              onClose={() => setShowAssistant(false)}
              devicePreview={devicePreview}
              onSetDevicePreview={handleSetDevicePreview}
              windowWidth={windowWidth}
              customDevices={agg.customDevices}
              onAddCustomDevice={agg.addCustomDevice}
              onRemoveCustomDevice={agg.removeCustomDevice}
              onWalletIssue={handleWalletIssue}
              onNavigateToPage={handleNavigateToPage}
              onResizeToFit={handleResizeToFit}
              onRemoveWidgets={handleRemoveWidgets}
              hiddenPerBP={agg.hiddenPerBP}
              onUnhideWidget={agg.unhideWidgetOnBP}
              allWidgets={agg.widgets}
              effectiveBP={effectiveBP}
              onShowHotkeySettings={() => setShowHotkeySettings(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tutorial */}
      {showTutorial && <AggTutorial onClose={handleCloseTutorial} />}

      {/* Hotkey Settings */}
      {showHotkeySettings && (
        <HotkeySettings
          hotkeyMap={agg.hotkeyMap}
          onSave={(updates) => agg.updateHotkeyMap(updates)}
          onClose={() => setShowHotkeySettings(false)}
        />
      )}
      {showLayoutManager && (
        <LayoutManager
          userLayouts={agg.userLayouts}
          onApplyLayout={agg.applyLayout}
          onSaveLayout={agg.saveUserLayout}
          onDeleteLayout={agg.deleteUserLayout}
          onRenameLayout={agg.renameUserLayout}
          onClose={() => setShowLayoutManager(false)}
          isOwner={isOwner}
          globalLayouts={globalLayouts}
          onCreateGlobalLayout={(name) => globalLayoutMutations.create.mutate({ name, layouts: agg.layouts || { lg: [], md: [], sm: [] }, widgets: agg.widgets || {} })}
          onUpdateGlobalLayout={(id, updates) => globalLayoutMutations.update.mutate({ id, ...updates })}
          onDeleteGlobalLayout={(id) => globalLayoutMutations.remove.mutate(id)}
        />
      )}
      {showTemplateManager && (
        <TemplateManager
          templates={agg.templates}
          activePage={agg.activePage}
          onSaveAsTemplate={agg.saveAsTemplate}
          onLoadTemplate={agg.loadTemplate}
          onLoadPresetTemplate={agg.loadPresetTemplate}
          onApplyLayoutPreset={agg.applyLayoutPreset}
          onDeleteTemplate={agg.deleteTemplate}
          onRenameTemplate={agg.renameTemplate}
          onUpdateTemplate={agg.updateTemplate}
          onClose={() => setShowTemplateManager(false)}
          globalTemplates={globalTemplates}
          isOwner={isOwner}
          onCreateGlobal={(t) => globalMutations.create.mutate(t)}
          onUpdateGlobal={(t) => globalMutations.update.mutate(t)}
          onDeleteGlobal={(id) => globalMutations.remove.mutate(id)}
          onImportPresets={() => globalMutations.importPresets.mutate()}
          isImportingPresets={globalMutations.importPresets.isPending}
        />
      )}
    </div>
    </MotionConfig>
    </PerformanceModeContext.Provider>
  )
}
