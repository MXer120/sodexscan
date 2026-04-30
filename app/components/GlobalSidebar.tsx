'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import '../styles/global-sidebar.css'
import { useSessionContext } from '../lib/SessionContext'

// ─── Nav items config ─────────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    tip: 'scan',
    path: '/tracker',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    tip: 'leaderboard',
    path: '/mainnet',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10M12 20V4M6 20v-6" />
      </svg>
    ),
  },
  {
    tip: 'alerts',
    path: '/alerts',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
    showDot: true,
  },
  {
    tip: 'watchlist',
    path: '/watchlist',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    tip: 'workflows',
    path: '/workflow',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <line x1="6" y1="3" x2="6" y2="15" />
        <circle cx="18" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <path d="M18 9a9 9 0 0 1-9 9" />
      </svg>
    ),
  },
  {
    tip: 'aggregator',
    path: '/aggregator',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="8" height="8" rx="1" />
        <rect x="13" y="3" width="8" height="8" rx="1" />
        <rect x="3" y="13" width="8" height="8" rx="1" />
        <rect x="13" y="13" width="8" height="8" rx="1" />
      </svg>
    ),
  },
]

// ─── Tree item icons ──────────────────────────────────────────────────────────

function SmallIcon({ path }: { path: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  )
}

// ─── GlobalSidebar ────────────────────────────────────────────────────────────

export default function GlobalSidebar() {
  const pathname = usePathname()
  const { user } = useSessionContext()
  const [panelOpen, setPanelOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'pages' | 'recents'>('pages')
  const [wfExpanded, setWfExpanded] = useState(false)

  // Hide completely on /workflow pages
  if (pathname.startsWith('/workflow')) return null

  return (
    <>
      {/* Icon strip */}
      <div className="gs-icon-strip">
        {/* Logo */}
        <div className="gs-logo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ color: 'var(--gs-text)' }} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="11" height="11" rx="2" />
            <rect x="11" y="3" width="11" height="11" rx="2" />
          </svg>
        </div>

        <div className="gs-divider" />

        {/* Navigation buttons */}
        {NAV_ITEMS.map(({ tip, path, icon, showDot }) => (
          <Link
            key={path}
            href={path}
            className={`gs-btn${pathname.startsWith(path) ? ' active' : ''}`}
            data-tip={tip}
          >
            {icon}
            {showDot && pathname.startsWith(path) && (
              <div className="gs-dot" />
            )}
          </Link>
        ))}

        <div className="gs-divider" />

        {/* Admin */}
        <Link
          href="/admin"
          className={`gs-btn${pathname.startsWith('/admin') ? ' active' : ''}`}
          data-tip="admin"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </Link>

        <div className="gs-divider" />

        {/* User avatar / login */}
        {user ? (
          <Link
            href="/profile"
            className="gs-btn"
            data-tip="Profile"
          >
            <div style={{
              width: 26,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(34,197,94,0.12)',
              color: '#22c55e',
              borderRadius: '50%',
              fontSize: 11,
              fontWeight: 700,
            }}>
              {user.email?.[0]?.toUpperCase() ?? '?'}
            </div>
          </Link>
        ) : (
          <button
            className="gs-btn"
            data-tip="Login"
            onClick={() => window.dispatchEvent(new CustomEvent('openAuthModal'))}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          </button>
        )}

        {/* Panel toggle — very last button */}
        <button
          className={`gs-btn${panelOpen ? ' active' : ''}`}
          onClick={() => setPanelOpen((v) => !v)}
          data-tip={panelOpen ? 'close nav' : 'open nav'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            {panelOpen ? (
              <polyline points="15 18 9 12 15 6" />
            ) : (
              <polyline points="9 18 15 12 9 6" />
            )}
          </svg>
        </button>
      </div>

      {/* Expanded panel */}
      <div className={`gs-panel${panelOpen ? '' : ' hidden'}`}>
        {/* Header */}
        <div className="gs-panel-header">
          <div className="gs-panel-title">Navigation</div>

          <div className="gs-search">
            <span className="gs-search-icon">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input className="gs-search-input" type="text" placeholder="Search..." />
          </div>

          <div className="gs-tabs">
            <button
              className={`gs-tab${activeTab === 'pages' ? ' active' : ''}`}
              onClick={() => setActiveTab('pages')}
            >
              Pages
            </button>
            <button
              className={`gs-tab${activeTab === 'recents' ? ' active' : ''}`}
              onClick={() => setActiveTab('recents')}
            >
              Recents
            </button>
          </div>
        </div>

        {/* Tree */}
        <div className="gs-tree">
          {/* Main nav */}
          <Link href="/tracker" className={`gs-item${pathname.startsWith('/tracker') ? ' active' : ''}`}>
            <SmallIcon path="M22 12h-4l-3 9L9 3l-3 9H2" />
            <span className="gs-item-label">Scanner</span>
          </Link>
          <Link href="/mainnet" className={`gs-item${pathname.startsWith('/mainnet') ? ' active' : ''}`}>
            <SmallIcon path="M18 20V10M12 20V4M6 20v-6" />
            <span className="gs-item-label">Leaderboard</span>
          </Link>
          <Link href="/sopoints" className={`gs-item${pathname.startsWith('/sopoints') ? ' active' : ''}`}>
            <SmallIcon path="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            <span className="gs-item-label">SoPoints</span>
          </Link>
          <Link href="/referral" className={`gs-item${pathname.startsWith('/referral') ? ' active' : ''}`}>
            <SmallIcon path="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            <span className="gs-item-label">Referral</span>
          </Link>

          <div className="gs-section-label">Tracking</div>

          <Link href="/watchlist" className={`gs-item${pathname.startsWith('/watchlist') ? ' active' : ''}`}>
            <SmallIcon path="M1 12s4-8 11-8 11 8-4 8-11 8-11-8-11-8zM12 12m-3 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0" />
            <span className="gs-item-label">Watchlist</span>
          </Link>
          <Link href="/alerts" className={`gs-item${pathname.startsWith('/alerts') ? ' active' : ''}`}>
            <SmallIcon path="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
            <span className="gs-item-label">Alerts</span>
          </Link>
          <Link href="/copy" className={`gs-item${pathname.startsWith('/copy') ? ' active' : ''}`}>
            <SmallIcon path="M8 17l4-4-4-4m5 8l4-4-4-4" />
            <span className="gs-item-label">Copy Trade</span>
          </Link>

          <div className="gs-section-label">Tools</div>

          <Link href="/aggregator" className={`gs-item${pathname.startsWith('/aggregator') ? ' active' : ''}`}>
            <SmallIcon path="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" />
            <span className="gs-item-label">Aggregator</span>
          </Link>

          {/* Workflows folder */}
          <div
            className={`gs-item${pathname.startsWith('/workflow') ? ' active' : ''}`}
            onClick={() => setWfExpanded((v) => !v)}
            style={{ cursor: 'pointer' }}
          >
            <span className={`gs-caret${wfExpanded ? ' open' : ''}`}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </span>
            <SmallIcon path="M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9" />
            <span className="gs-item-label">Workflows</span>
          </div>
          {wfExpanded && (
            <div className="gs-children">
              <Link href="/workflow" className="gs-item">
                <SmallIcon path="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                <span className="gs-item-label">BTC Monitor</span>
              </Link>
              <Link href="/workflow" className="gs-item">
                <SmallIcon path="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                <span className="gs-item-label">ETH Watch</span>
              </Link>
            </div>
          )}

          <Link href="/reports" className={`gs-item${pathname.startsWith('/reports') ? ' active' : ''}`}>
            <SmallIcon path="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" />
            <span className="gs-item-label">Reports</span>
          </Link>
          <Link href="/reverse-search" className={`gs-item${pathname.startsWith('/reverse-search') ? ' active' : ''}`}>
            <SmallIcon path="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35" />
            <span className="gs-item-label">Reverse Search</span>
          </Link>

          <div className="gs-section-label">System</div>

          <Link href="/admin" className={`gs-item${pathname.startsWith('/admin') ? ' active' : ''}`}>
            <SmallIcon path="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <span className="gs-item-label">Admin</span>
          </Link>
          <Link href="/design-system" className={`gs-item${pathname.startsWith('/design-system') ? ' active' : ''}`}>
            <SmallIcon path="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            <span className="gs-item-label">Design System</span>
          </Link>
        </div>
      </div>
    </>
  )
}
