'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSessionContext } from '../lib/SessionContext'
import { useTheme } from '../lib/ThemeContext'
import NotificationsPanel from './NotificationsPanel'
import '../styles/global-sidebar.css'

const PAGE_LABELS: Record<string, string> = {
  '/tracker':        'Scanner',
  '/mainnet':        'Leaderboard',
  '/sopoints':       'SoPoints',
  '/referral':       'Referral',
  '/watchlist':      'Watchlist',
  '/aggregator':     'Aggregator',
  '/alerts':         'Alerts',
  '/workflow':       'Workflows',
  '/tools':          'Tools',
  '/admin':          'Admin',
  '/reports':        'Reports',
  '/copy':           'Copy Trade',
  '/larp':           'LARP',
  '/incoming':       'Incoming',
  '/reverse-search': 'Reverse Search',
  '/profile':        'Profile',
  '/design-system':  'Design System',
  '/chat':           'CommunityScan AI',
  '/dashboards':     'Dashboards',
}

function getPageLabel(pathname: string): string | null {
  if (pathname === '/') return null
  for (const [path, label] of Object.entries(PAGE_LABELS)) {
    if (pathname === path || pathname.startsWith(path + '/')) return label
  }
  return null
}

const TEAM_MEMBERS = [
  { name: 'Alex Kim',    role: 'Owner',  initial: 'A', color: '#6366f1' },
  { name: 'Maria Chen',  role: 'Admin',  initial: 'M', color: '#22c55e' },
  { name: 'Lutz S.',     role: 'Admin',  initial: 'L', color: '#f59e0b' },
  { name: 'Sam Patel',   role: 'Member', initial: 'S', color: '#06b6d4' },
  { name: 'Riya Gupta',  role: 'Member', initial: 'R', color: '#ec4899' },
  { name: 'Jordan Lee',  role: 'Viewer', initial: 'J', color: '#a855f7' },
]

export default function FloatingTopBar() {
  const pathname = usePathname()
  const { user } = useSessionContext()
  const { mode, toggleMode } = useTheme()
  const [teamOpen, setTeamOpen] = useState(false)
  const teamRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!teamOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (teamRef.current && !teamRef.current.contains(e.target as Node)) setTeamOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [teamOpen])

  if (pathname.startsWith('/workflow')) return null

  const pageLabel = getPageLabel(pathname)
  const userInitial = user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="ftb-root">
      {pageLabel && <span className="ftb-breadcrumb">{pageLabel}</span>}

      <button
        className="ftb-search"
        onClick={() => window.dispatchEvent(new CustomEvent('openCommandPalette'))}
        aria-label="Open search"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span>Search</span>
        <kbd className="ftb-kbd">⌘K</kbd>
      </button>

      {/* Team members button + popup */}
      <div className="ftb-team-wrap" ref={teamRef}>
        <button
          type="button"
          className={`ftb-team-btn ${teamOpen ? 'open' : ''}`}
          onClick={() => setTeamOpen(o => !o)}
          aria-haspopup="menu"
          aria-expanded={teamOpen}
          title="Team members"
        >
          <span className="ftb-team-stack">
            <span className="ftb-team-av" style={{ background: '#6366f1', marginLeft: 0 }}>A</span>
            <span className="ftb-team-av" style={{ background: '#22c55e' }}>M</span>
            <span className="ftb-team-av" style={{ background: '#f59e0b' }}>L</span>
            <span className="ftb-team-av ftb-team-av-more">+3</span>
          </span>
        </button>
        {teamOpen && (
          <div className="ftb-team-menu" role="menu">
            <div className="ftb-team-menu-header">
              <div>
                <div className="ftb-team-menu-title">Team members</div>
                <div className="ftb-team-menu-sub">{TEAM_MEMBERS.length} people</div>
              </div>
              <button type="button" className="ftb-team-invite">+ Invite</button>
            </div>
            <ul className="ftb-team-list">
              {TEAM_MEMBERS.map(m => (
                <li key={m.name} className="ftb-team-row">
                  <span className="ftb-team-row-av" style={{ background: m.color }}>{m.initial}</span>
                  <div className="ftb-team-row-info">
                    <div className="ftb-team-row-name">{m.name}</div>
                    <div className="ftb-team-row-role">{m.role}</div>
                  </div>
                </li>
              ))}
            </ul>
            <button type="button" className="ftb-team-manage">Manage workspace</button>
          </div>
        )}
      </div>

      {/* Theme toggle */}
      <button
        type="button"
        className="ftb-theme-toggle"
        onClick={toggleMode}
        title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label="Toggle theme"
      >
        {mode === 'dark' ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>

      <NotificationsPanel user={user} />

      {user ? (
        <Link href="/profile" className="ftb-user" aria-label="Profile">
          {userInitial}
        </Link>
      ) : (
        <button
          type="button"
          className="ftb-login"
          onClick={() => window.dispatchEvent(new CustomEvent('openAuthModal'))}
          aria-label="Login"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
        </button>
      )}
    </div>
  )
}
