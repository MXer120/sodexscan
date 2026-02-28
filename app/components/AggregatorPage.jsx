'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { Responsive, WidthProvider } from 'react-grid-layout/legacy'
import { motion, AnimatePresence } from 'framer-motion'
import { useAggregatorLayout } from '../hooks/useAggregatorLayout'
import { useTheme } from '../lib/ThemeContext'
import { useUserProfile } from '../hooks/useProfile'
import { useSessionContext } from '../lib/SessionContext'
import { useGlobalTemplates, useGlobalTemplateMutations } from '../hooks/useGlobalTemplates'
import WidgetWrapper from './aggregator/WidgetWrapper'
import AddWidgetModal from './aggregator/AddWidgetModal'
import AggNav from './aggregator/AggNav'
import TemplateManager from './aggregator/TemplateManager'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import '../styles/AggregatorPage.css'

const ResponsiveGridLayout = WidthProvider(Responsive)

export default function AggregatorPage() {
  const agg = useAggregatorLayout()
  const { logo } = useTheme()
  const { isOwner } = useSessionContext()
  const { data: profileData } = useUserProfile()
  const profileWallet = profileData?.profile?.own_wallet || ''
  const { data: globalTemplates = [] } = useGlobalTemplates()
  const globalMutations = useGlobalTemplateMutations()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)

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

  const isMobile = windowWidth < 768

  const handleLayoutChange = useCallback((_, allLayouts) => {
    agg.updateLayout(allLayouts)
  }, [agg.updateLayout])

  const handleRemoveWidget = useCallback((instanceId) => {
    agg.removeWidget(instanceId)
  }, [agg.removeWidget])

  const widgetEntries = useMemo(
    () => Object.entries(agg.widgets || {}),
    [agg.widgets]
  )

  // Get recent colors from active template
  const activeTemplate = agg.templates.find(t => t.id === agg.activePage?.templateId)
  const recentColors = activeTemplate?.recentColors || []

  // Wallet resolution: page default → global → profile
  const pageDefaultWallet = agg.activePage?.defaultWallet || ''
  const resolvedWalletFallback = pageDefaultWallet || agg.globalWallet || profileWallet

  // Determine nav dock class
  const navDockClass = `nav-${agg.navDock || 'left'}`

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
    <div className={`agg-root ${navDockClass}`}>
      {/* Navigation sidebar */}
      <AggNav
        logo={logo}
        navDock={agg.navDock}
        navExpanded={agg.navExpanded}
        onSetNavDock={agg.setNavDock}
        onSetNavExpanded={agg.setNavExpanded}
        pages={agg.pages}
        activePageIndex={agg.activePageIndex}
        onSetActivePage={agg.setActivePage}
        onAddPage={agg.addPage}
        onRemovePage={agg.removePage}
        onRenamePage={agg.renamePage}
        onAddWidget={() => setShowAddModal(true)}
        onResetToDefault={agg.resetToDefault}
        templates={agg.templates}
        onSaveAsTemplate={agg.saveAsTemplate}
        onLoadTemplate={agg.loadTemplate}
        onDeleteTemplate={agg.deleteTemplate}
        onShowTemplateManager={() => setShowTemplateManager(true)}
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
      />

      {/* Main content */}
      <div className="agg-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={agg.activePageIndex}
            className="agg-grid-wrapper"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {widgetEntries.length === 0 ? (
              <div className="agg-empty">
                <p>No widgets yet. Click the + button in the sidebar to get started.</p>
              </div>
            ) : (
              <ResponsiveGridLayout
                className="agg-grid"
                layouts={agg.layouts}
                breakpoints={{ lg: 1200, md: 768, sm: 0 }}
                cols={{ lg: 12, md: 6, sm: 2 }}
                rowHeight={80}
                containerPadding={[0, 0]}
                margin={[8, 8]}
                isDraggable={!isMobile}
                isResizable={!isMobile}
                draggableHandle=".widget-drag-handle"
                onLayoutChange={handleLayoutChange}
                compactType="vertical"
                useCSSTransforms={true}
              >
                {widgetEntries.map(([instanceId, config]) => (
                  <div key={instanceId}>
                    <WidgetWrapper
                      instanceId={instanceId}
                      config={config}
                      onRemove={handleRemoveWidget}
                      onUpdateConfig={agg.updateWidgetConfig}
                      recentColors={recentColors}
                      onAddRecentColor={agg.addRecentColor}
                      resolvedWalletAddress={resolvedWalletFallback}
                    />
                  </div>
                ))}
              </ResponsiveGridLayout>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddWidgetModal
          onAdd={agg.addWidget}
          onClose={() => setShowAddModal(false)}
          existingWidgetTypes={Object.values(agg.widgets || {}).map(w => w.type)}
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
  )
}
