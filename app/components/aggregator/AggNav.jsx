'use client'

import React, { useState } from 'react'
import { motion, Reorder } from 'framer-motion'
import Link from 'next/link'
import AggSelect from './AggSelect'

// ── Icons ──────────────────────────────────────────────────────────
const Icons = {
  add: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  template: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>,
  link: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  expand: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,3 21,3 21,9"/><polyline points="9,21 3,21 3,15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>,
  collapse: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4,14 10,14 10,20"/><polyline points="20,10 14,10 14,4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>,
  close: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  reset: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>,
  dockLeft: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>,
  dockRight: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="15" y1="3" x2="15" y2="21"/></svg>,
  dockTop: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>,
  dockBottom: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="15" x2="21" y2="15"/></svg>,
  folder: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  edit: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  addSmall: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  chevronDown: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
  chevronRight: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
  wallet: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 12a1 1 0 0 0 0 2h2a1 1 0 0 0 0-2h-2z"/></svg>,
}

const DOCK_CYCLE = ['left', 'right', 'top', 'bottom']

export default function AggNav({
  logo,
  navDock, navExpanded,
  onSetNavDock, onSetNavExpanded,
  pages, activePageIndex,
  onSetActivePage, onAddPage, onRemovePage, onRenamePage,
  onAddWidget, onResetToDefault,
  onShowTemplateManager,
  quickLinks = [], onAddQuickLink, onRemoveQuickLink, onUpdateQuickLink, onReorderQuickLinks,
  folders = [], onAddFolder, onRenameFolder, onRemoveFolder,
  globalWallet = '', pageDefaultWallet = '', profileWallet = '',
  onSetGlobalWallet, onSetPageDefaultWallet,
}) {
  const [showSiteLinks, setShowSiteLinks] = useState(false)
  const [showWalletSettings, setShowWalletSettings] = useState(false)
  const [showDockPicker, setShowDockPicker] = useState(false)
  const [collapsedFolders, setCollapsedFolders] = useState({})
  const [editingPage, setEditingPage] = useState(null)
  const [editName, setEditName] = useState('')

  // Add link state
  const [addingLink, setAddingLink] = useState(false)
  const [newLinkName, setNewLinkName] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newLinkFolder, setNewLinkFolder] = useState('')

  // Add folder state
  const [addingFolder, setAddingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  // Edit link state
  const [editingLinkId, setEditingLinkId] = useState(null)
  const [editLinkName, setEditLinkName] = useState('')
  const [editLinkUrl, setEditLinkUrl] = useState('')
  const [editLinkFolder, setEditLinkFolder] = useState('')

  // Edit folder state
  const [editingFolderName, setEditingFolderName] = useState(null)
  const [editFolderNewName, setEditFolderNewName] = useState('')

  const startRename = (idx) => {
    setEditingPage(idx)
    setEditName(pages[idx].name)
  }

  const finishRename = () => {
    if (editingPage !== null && editName.trim()) {
      onRenamePage(editingPage, editName.trim())
    }
    setEditingPage(null)
  }

  const handleAddLink = () => {
    if (newLinkName.trim() && newLinkUrl.trim()) {
      onAddQuickLink({
        name: newLinkName.trim(),
        url: newLinkUrl.trim().startsWith('http') ? newLinkUrl.trim() : `https://${newLinkUrl.trim()}`,
        icon: '🔗',
        folder: newLinkFolder || null,
      })
      setNewLinkName(''); setNewLinkUrl(''); setNewLinkFolder('')
      setAddingLink(false)
    }
  }

  const handleAddFolder = () => {
    if (newFolderName.trim()) {
      onAddFolder(newFolderName.trim())
      setNewFolderName('')
      setAddingFolder(false)
    }
  }

  const startEditLink = (link) => {
    setEditingLinkId(link.id)
    setEditLinkName(link.name)
    setEditLinkUrl(link.url)
    setEditLinkFolder(link.folder || '')
  }

  const saveEditLink = () => {
    if (editingLinkId && editLinkName.trim() && editLinkUrl.trim()) {
      onUpdateQuickLink(editingLinkId, {
        name: editLinkName.trim(),
        url: editLinkUrl.trim().startsWith('http') ? editLinkUrl.trim() : `https://${editLinkUrl.trim()}`,
        folder: editLinkFolder || null,
      })
    }
    setEditingLinkId(null)
  }

  const startEditFolder = (name) => {
    setEditingFolderName(name)
    setEditFolderNewName(name)
  }

  const saveEditFolder = () => {
    if (editingFolderName && editFolderNewName.trim() && editFolderNewName.trim() !== editingFolderName) {
      onRenameFolder(editingFolderName, editFolderNewName.trim())
    }
    setEditingFolderName(null)
  }

  const toggleFolder = (name) => {
    setCollapsedFolders(prev => ({ ...prev, [name]: !prev[name] }))
  }

  // Folder options for dropdowns
  const folderOptions = [
    { value: '', label: 'No folder' },
    ...folders.map(f => ({ value: f.name, label: f.name }))
  ]

  // Group links by folder
  const rootLinks = quickLinks.filter(l => !l.folder)
  const folderGroups = {}
  for (const f of folders) {
    folderGroups[f.name] = quickLinks.filter(l => l.folder === f.name)
  }

  // Reorder handler for a section
  const handleReorder = (folderName, newOrder) => {
    // Reconstruct full quickLinks: keep other sections, replace this section
    const otherLinks = quickLinks.filter(l => (folderName === null ? l.folder : l.folder !== folderName))
    const reordered = folderName === null
      ? [...newOrder, ...quickLinks.filter(l => l.folder)]
      : [...quickLinks.filter(l => l.folder !== folderName && !l.folder), ...quickLinks.filter(l => l.folder && l.folder !== folderName), ...newOrder].filter(Boolean)

    // Simpler: rebuild from root + each folder in order
    const rebuilt = []
    if (folderName === null) {
      rebuilt.push(...newOrder)
    } else {
      rebuilt.push(...rootLinks)
    }
    for (const f of folders) {
      if (f.name === folderName) {
        rebuilt.push(...newOrder)
      } else {
        rebuilt.push(...(folderGroups[f.name] || []))
      }
    }
    onReorderQuickLinks(rebuilt)
  }

  const dockClass = `docked-${navDock}`
  const expandedClass = navExpanded ? 'expanded' : ''

  // Render a link item (normal or edit mode)
  const renderLinkItem = (link) => {
    if (editingLinkId === link.id) {
      return (
        <div key={link.id} className="agg-nav-edit-link-form">
          <input value={editLinkName} onChange={e => setEditLinkName(e.target.value)} className="agg-nav-link-input" placeholder="Name" />
          <input value={editLinkUrl} onChange={e => setEditLinkUrl(e.target.value)} className="agg-nav-link-input" placeholder="URL" />
          <AggSelect value={editLinkFolder} onChange={setEditLinkFolder} options={folderOptions} />
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="agg-nav-link-btn" onClick={saveEditLink}>Save</button>
            <button className="agg-nav-link-btn cancel" onClick={() => setEditingLinkId(null)}>Cancel</button>
          </div>
        </div>
      )
    }
    return (
      <div key={link.id} className="agg-nav-link-row">
        <a className="agg-nav-link" href={link.url} target="_blank" rel="noopener noreferrer">
          <span className="agg-nav-link-icon">{link.icon}</span>
          <span>{link.name}</span>
        </a>
        <button className="agg-nav-link-action" onClick={() => startEditLink(link)}>{Icons.edit}</button>
        <button className="agg-nav-link-action delete" onClick={() => onRemoveQuickLink(link.id)}>{Icons.trash}</button>
      </div>
    )
  }

  return (
    <motion.nav
      className={`agg-nav ${dockClass} ${expandedClass}`}
      layout
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Logo — full width expanded, favicon collapsed */}
      <Link href="/" className="agg-nav-logo" title="Home">
        <img
          src={navExpanded ? (logo || '/logo.svg') : '/favicon.png'}
          alt="Logo"
          className={`agg-nav-logo-img ${navExpanded ? 'expanded' : 'collapsed'}`}
        />
      </Link>

      {/* Page tabs (expanded only) */}
      {navExpanded && (
        <div className="agg-nav-pages">
          {pages.map((page, idx) => (
            <div
              key={idx}
              className={`agg-nav-page-tab ${idx === activePageIndex ? 'active' : ''}`}
              onClick={() => onSetActivePage(idx)}
            >
              {editingPage === idx ? (
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={finishRename}
                  onKeyDown={e => e.key === 'Enter' && finishRename()}
                  autoFocus
                  style={{ background: 'transparent', border: 'none', color: 'inherit', fontSize: 12, width: '100%', outline: 'none' }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span onDoubleClick={() => startRename(idx)}>{page.name}</span>
              )}
              {pages.length > 1 && (
                <button className="agg-nav-page-close" onClick={e => { e.stopPropagation(); onRemovePage(idx) }}>
                  {Icons.close}
                </button>
              )}
            </div>
          ))}
          {pages.length < 3 && (
            <button className="agg-nav-page-add" onClick={onAddPage}>
              {Icons.add}
            </button>
          )}
        </div>
      )}

      {/* Main nav items */}
      <div className="agg-nav-items">
        <button className="agg-nav-item" onClick={() => onSetNavExpanded(!navExpanded)} title={navExpanded ? 'Collapse' : 'Expand'}>
          {navExpanded ? Icons.collapse : Icons.expand}
          <span className="agg-nav-item-label">{navExpanded ? 'Collapse' : 'Expand'}</span>
        </button>

        <button className="agg-nav-item" onClick={onAddWidget} title="Add Widget">
          {Icons.add}
          <span className="agg-nav-item-label">Add Widget</span>
        </button>

        <div className="agg-nav-section">
          <div className="agg-nav-section-label">Templates</div>
          <button className="agg-nav-item" onClick={onShowTemplateManager} title="Templates">
            {Icons.template}
            <span className="agg-nav-item-label">Templates</span>
          </button>
        </div>

        {/* ── Wallet settings ───────────────────────────────────── */}
        <div className="agg-nav-section">
          <div className="agg-nav-section-label">Wallet</div>
          <button className="agg-nav-item" onClick={() => setShowWalletSettings(!showWalletSettings)} title="Wallet Settings">
            {Icons.wallet}
            <span className="agg-nav-item-label">Wallet</span>
          </button>
          {navExpanded && showWalletSettings && (
            <div className="agg-nav-wallet-panel">
              <div className="agg-nav-wallet-row">
                <label className="agg-nav-wallet-label">Global</label>
                <input
                  type="text"
                  className="agg-nav-wallet-input"
                  value={globalWallet}
                  onChange={e => onSetGlobalWallet(e.target.value)}
                  placeholder={profileWallet ? `Profile: ${profileWallet.slice(0, 8)}…` : '0x…'}
                  spellCheck={false}
                />
              </div>
              <div className="agg-nav-wallet-row">
                <label className="agg-nav-wallet-label">This page</label>
                <input
                  type="text"
                  className="agg-nav-wallet-input"
                  value={pageDefaultWallet}
                  onChange={e => onSetPageDefaultWallet(e.target.value)}
                  placeholder={globalWallet ? `Global: ${globalWallet.slice(0, 8)}…` : profileWallet ? `Profile: ${profileWallet.slice(0, 8)}…` : '0x…'}
                  spellCheck={false}
                />
              </div>
              {profileWallet && (
                <div className="agg-nav-wallet-hint">
                  Profile wallet: {profileWallet.slice(0, 10)}…
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Site links (collapsible) ──────────────────────────── */}
        <div className="agg-nav-section">
          <div className="agg-nav-section-label">Pages</div>
          <button className="agg-nav-item" onClick={() => setShowSiteLinks(!showSiteLinks)} title="Site Pages">
            {Icons.link}
            <span className="agg-nav-item-label">Site Pages</span>
          </button>
          {navExpanded && showSiteLinks && (
            <div className="agg-nav-links-list">
              <a className="agg-nav-link" href="/tracker">
                <span className="agg-nav-link-icon">🔍</span><span>Scanner</span>
              </a>
              <a className="agg-nav-link" href="/mainnet">
                <span className="agg-nav-link-icon">🏆</span><span>Leaderboard</span>
              </a>
              <a className="agg-nav-link" href="/sopoints">
                <span className="agg-nav-link-icon">⭐</span><span>SoPoints</span>
              </a>
              <a className="agg-nav-link" href="/platform">
                <span className="agg-nav-link-icon">📈</span><span>Platform</span>
              </a>
              <a className="agg-nav-link" href="/social">
                <span className="agg-nav-link-icon">👥</span><span>Socials</span>
              </a>
            </div>
          )}
        </div>

        {/* ── User folders (always visible, each collapsible) ───── */}
        {navExpanded && (
          <div className="agg-nav-section agg-nav-folders-section">
            <div className="agg-nav-section-label">Links</div>

            {/* Root links (no folder) */}
            {rootLinks.length > 0 && (
              <Reorder.Group
                axis="y"
                values={rootLinks}
                onReorder={(newOrder) => handleReorder(null, newOrder)}
                className="agg-nav-reorder-group"
              >
                {rootLinks.map(link => (
                  <Reorder.Item key={link.id} value={link} className="agg-nav-reorder-item">
                    {renderLinkItem(link)}
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            )}

            {/* User folders */}
            {folders.map(folder => {
              const isCollapsed = !!collapsedFolders[folder.name]
              return (
                <div key={folder.name} className="agg-nav-link-folder">
                  <div className="agg-nav-folder-header">
                    {/* Collapse toggle */}
                    <button
                      className="agg-nav-folder-toggle"
                      onClick={() => toggleFolder(folder.name)}
                      title={isCollapsed ? 'Expand' : 'Collapse'}
                    >
                      {isCollapsed ? Icons.chevronRight : Icons.chevronDown}
                    </button>

                    {editingFolderName === folder.name ? (
                      <input
                        className="agg-nav-folder-rename"
                        value={editFolderNewName}
                        onChange={e => setEditFolderNewName(e.target.value)}
                        onBlur={saveEditFolder}
                        onKeyDown={e => e.key === 'Enter' && saveEditFolder()}
                        autoFocus
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <span className="agg-nav-folder-name-text" onClick={() => toggleFolder(folder.name)}>
                        {folder.name}
                      </span>
                    )}

                    <div className="agg-nav-folder-actions">
                      <button className="agg-nav-link-action" onClick={() => startEditFolder(folder.name)}>{Icons.edit}</button>
                      <button className="agg-nav-link-action delete" onClick={() => onRemoveFolder(folder.name)}>{Icons.trash}</button>
                    </div>
                  </div>

                  {!isCollapsed && (
                    (folderGroups[folder.name] || []).length > 0 ? (
                      <Reorder.Group
                        axis="y"
                        values={folderGroups[folder.name] || []}
                        onReorder={(newOrder) => handleReorder(folder.name, newOrder)}
                        className="agg-nav-reorder-group"
                      >
                        {(folderGroups[folder.name] || []).map(link => (
                          <Reorder.Item key={link.id} value={link} className="agg-nav-reorder-item">
                            {renderLinkItem(link)}
                          </Reorder.Item>
                        ))}
                      </Reorder.Group>
                    ) : (
                      <div className="agg-nav-folder-empty">No links</div>
                    )
                  )}
                </div>
              )
            })}

            {/* Add Link / Add Folder */}
            {addingLink ? (
              <div className="agg-nav-add-link-form">
                <input placeholder="Name" value={newLinkName} onChange={e => setNewLinkName(e.target.value)} className="agg-nav-link-input" />
                <input placeholder="URL" value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} className="agg-nav-link-input" />
                <AggSelect value={newLinkFolder} onChange={setNewLinkFolder} options={folderOptions} />
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="agg-nav-link-btn" onClick={handleAddLink}>Add</button>
                  <button className="agg-nav-link-btn cancel" onClick={() => setAddingLink(false)}>Cancel</button>
                </div>
              </div>
            ) : addingFolder ? (
              <div className="agg-nav-add-link-form">
                <input placeholder="Folder name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} className="agg-nav-link-input" autoFocus />
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="agg-nav-link-btn" onClick={handleAddFolder}>Create</button>
                  <button className="agg-nav-link-btn cancel" onClick={() => setAddingFolder(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="agg-nav-add-btns">
                <button className="agg-nav-add-link-btn" onClick={() => setAddingLink(true)}>
                  {Icons.addSmall} <span>Link</span>
                </button>
                <button className="agg-nav-add-link-btn" onClick={() => setAddingFolder(true)}>
                  {Icons.folder} <span>Folder</span>
                </button>
              </div>
            )}
          </div>
        )}
        {/* Collapsed nav: show folder icons always */}
        {!navExpanded && folders.length > 0 && (
          <div style={{ padding: '4px 6px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {folders.map(folder => (
              <div key={folder.name} className="agg-nav-item" title={folder.name} style={{ justifyContent: 'center', padding: 8 }}>
                {Icons.folder}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer: dock position + reset */}
      <div className="agg-nav-footer">
        <div style={{ position: 'relative' }}>
          <button
            className="agg-nav-item"
            onClick={() => setShowDockPicker(!showDockPicker)}
            title="Change dock position"
          >
            {navDock === 'left' && Icons.dockLeft}
            {navDock === 'right' && Icons.dockRight}
            {navDock === 'top' && Icons.dockTop}
            {navDock === 'bottom' && Icons.dockBottom}
            <span className="agg-nav-item-label">Position</span>
          </button>
          {showDockPicker && (
            <div className="agg-dock-picker">
              {DOCK_CYCLE.map(pos => (
                <button
                  key={pos}
                  className={`agg-dock-option ${pos === navDock ? 'active' : ''}`}
                  onClick={() => { onSetNavDock(pos); setShowDockPicker(false) }}
                  title={pos.charAt(0).toUpperCase() + pos.slice(1)}
                >
                  {pos === 'left' && Icons.dockLeft}
                  {pos === 'right' && Icons.dockRight}
                  {pos === 'top' && Icons.dockTop}
                  {pos === 'bottom' && Icons.dockBottom}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="agg-nav-item" onClick={onResetToDefault} title="Reset Layout">
          {Icons.reset}
          <span className="agg-nav-item-label">Reset</span>
        </button>
      </div>
    </motion.nav>
  )
}
