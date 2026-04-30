'use client'

import { useState } from 'react'
import type { NodeSubtype } from '@/types/workflow'

// ─── WorkflowIconBar ──────────────────────────────────────────────────────────

interface WorkflowIconBarProps {
  activeView: string
  onViewChange: (v: string) => void
  onSidebarToggle: () => void
  sidebarOpen: boolean
}

export function WorkflowIconBar({
  activeView,
  onViewChange,
  onSidebarToggle,
  sidebarOpen,
}: WorkflowIconBarProps) {
  const navItems: { id: string; paths: React.ReactNode }[] = [
    {
      id: 'home',
      paths: (
        <>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </>
      ),
    },
    {
      id: 'workflow',
      paths: (
        <>
          <line x1="6" y1="3" x2="6" y2="15" />
          <circle cx="18" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <path d="M18 9a9 9 0 0 1-9 9" />
        </>
      ),
    },
    {
      id: 'calendar',
      paths: (
        <>
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <rect x="3" y="4" width="18" height="18" rx="2" />
        </>
      ),
    },
    {
      id: 'documents',
      paths: (
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </>
      ),
    },
  ]

  return (
    <div className="wf-icon-sidebar">
      {/* Logo */}
      <div className="wf-icon-logo">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
          <rect x="2" y="5" width="11" height="11" rx="1.5" />
          <rect x="7" y="2" width="11" height="11" rx="1.5" />
        </svg>
      </div>

      <div className="wf-icon-divider" />

      {/* Nav items */}
      <div className="wf-icon-nav">
        {navItems.map(({ id, paths }) => (
          <button
            key={id}
            className={`wf-icon-btn${activeView === id ? ' active' : ''}`}
            onClick={() => onViewChange(id)}
            title={id.charAt(0).toUpperCase() + id.slice(1)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              {paths}
            </svg>
          </button>
        ))}
      </div>

      <div className="wf-icon-divider" />

      {/* Bottom: settings + toggle */}
      <div className="wf-icon-bottom">
        <button className="wf-icon-btn" title="Settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        <button className="wf-icon-btn" onClick={onSidebarToggle} title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            {sidebarOpen ? (
              <>
                <polyline points="15 18 9 12 15 6" />
              </>
            ) : (
              <>
                <polyline points="9 18 15 12 9 6" />
              </>
            )}
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── WorkflowLeftSidebar ──────────────────────────────────────────────────────

interface WorkflowLeftSidebarProps {
  isOpen: boolean
  onClose: () => void
  onAddNode: (subtype: NodeSubtype, position: { x: number; y: number }) => void
}

type TreeItem =
  | { id: string; type: 'folder'; label: string; children: TreeItem[] }
  | { id: string; type: 'file'; label: string }

const SAMPLE_TREE: TreeItem[] = [
  {
    id: 'folder-alerts',
    type: 'folder',
    label: 'My Alerts',
    children: [
      { id: 'file-btc', type: 'file', label: 'BTC Price Monitor' },
      { id: 'file-eth', type: 'file', label: 'ETH Whale Alerts' },
    ],
  },
  {
    id: 'folder-ai',
    type: 'folder',
    label: 'AI Workflows',
    children: [
      { id: 'file-macro', type: 'file', label: 'Macro Digest' },
      {
        id: 'folder-fomc',
        type: 'folder',
        label: 'FOMC Watch',
        children: [
          { id: 'file-rate', type: 'file', label: 'Rate Decision' },
        ],
      },
    ],
  },
  {
    id: 'folder-archive',
    type: 'folder',
    label: 'Archive',
    children: [],
  },
]

function FolderIcon({ open }: { open?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {open ? (
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      ) : (
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      )}
    </svg>
  )
}

function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  )
}

function TreeNode({
  item,
  depth,
  expandedFolders,
  activeFile,
  onToggleFolder,
  onSelectFile,
}: {
  item: TreeItem
  depth: number
  expandedFolders: Set<string>
  activeFile: string
  onToggleFolder: (id: string) => void
  onSelectFile: (id: string) => void
}) {
  const indent = depth * 12

  if (item.type === 'folder') {
    const isExpanded = expandedFolders.has(item.id)
    return (
      <div>
        <div
          className="wf-tree-item"
          style={{ paddingLeft: `${8 + indent}px`, padding: `4px ${8 + indent}px` }}
          onClick={() => onToggleFolder(item.id)}
        >
          <span
            className="wf-tree-icon"
            style={{
              opacity: 0.6,
              display: 'inline-flex',
              transition: 'transform 0.15s',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M10 7l5 5-5 5z" />
            </svg>
          </span>
          <span className="wf-tree-icon" style={{ color: '#f59e0b' }}>
            <FolderIcon open={isExpanded} />
          </span>
          <span className="wf-tree-label">{item.label}</span>
          {item.children.length > 0 && (
            <span className="wf-tree-badge">{item.children.length}</span>
          )}
        </div>
        {isExpanded && item.children.length > 0 && (
          <div className="wf-tree-children" style={{ position: 'relative' }}>
            {item.children.map((child) => (
              <TreeNode
                key={child.id}
                item={child}
                depth={depth + 1}
                expandedFolders={expandedFolders}
                activeFile={activeFile}
                onToggleFolder={onToggleFolder}
                onSelectFile={onSelectFile}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`wf-tree-item${activeFile === item.id ? ' active' : ''}`}
      style={{ paddingLeft: `${8 + indent}px`, padding: `4px ${8 + indent}px` }}
      onClick={() => onSelectFile(item.id)}
    >
      <span className="wf-tree-icon" style={{ opacity: 0.5 }}>
        <FileIcon />
      </span>
      <span className="wf-tree-label">{item.label}</span>
    </div>
  )
}

export function WorkflowLeftSidebar({ isOpen, onClose, onAddNode }: WorkflowLeftSidebarProps) {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'folders' | 'projects'>('folders')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(['folder-alerts', 'folder-ai'])
  )
  const [activeFile, setActiveFile] = useState('file-btc')

  function toggleFolder(id: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const filteredTree = search.trim()
    ? SAMPLE_TREE.map((item) => {
        if (item.type === 'folder') {
          const matchedChildren = item.children.filter((child) =>
            child.label.toLowerCase().includes(search.toLowerCase())
          )
          if (
            item.label.toLowerCase().includes(search.toLowerCase()) ||
            matchedChildren.length > 0
          ) {
            return { ...item, children: matchedChildren }
          }
          return null
        }
        return item.label.toLowerCase().includes(search.toLowerCase()) ? item : null
      }).filter(Boolean) as TreeItem[]
    : SAMPLE_TREE

  return (
    <div className={`wf-sidebar${isOpen ? '' : ' collapsed'}`}>
      {/* Header */}
      <div className="wf-sidebar-header">
        <div className="wf-sidebar-title-row">
          <span className="wf-sidebar-title">Workflows</span>
          <button className="wf-sidebar-close" onClick={onClose} title="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="wf-sidebar-search">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="wf-search-icon">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="wf-search-input"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <div className="wf-sidebar-tabs">
          <button
            className={`wf-tab${activeTab === 'folders' ? ' active' : ''}`}
            onClick={() => setActiveTab('folders')}
          >
            Folders
          </button>
          <button
            className={`wf-tab${activeTab === 'projects' ? ' active' : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            Projects
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="wf-tree">
        {filteredTree.map((item) => (
          <TreeNode
            key={item.id}
            item={item}
            depth={0}
            expandedFolders={expandedFolders}
            activeFile={activeFile}
            onToggleFolder={toggleFolder}
            onSelectFile={setActiveFile}
          />
        ))}
        {filteredTree.length === 0 && (
          <div className="wf-tree-empty">No results</div>
        )}
      </div>

      {/* New Workflow button */}
      <div style={{ padding: '8px 10px 10px' }}>
        <button
          onClick={() => onAddNode('price_alert', { x: 300, y: 200 })}
          style={{
            width: '100%',
            padding: 8,
            background: 'rgba(255,255,255,0.04)',
            border: '1px dashed rgba(255,255,255,0.1)',
            borderRadius: 8,
            color: 'rgba(255,255,255,0.4)',
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          + New
        </button>
      </div>
    </div>
  )
}
