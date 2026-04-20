'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSessionContext } from '../lib/SessionContext'
import { Auth } from './Auth'
import { Icons } from './CommandPalette'
import { configCache, loadPageConfigs, isConfigLoaded } from '../lib/pageConfig'
import { supabase } from '../lib/supabaseClient'
import '../styles/Navbar.css'

const FALLBACK_NAV = [
  { path: '/tracker',        label: 'Scan',           enabled: true,  tag: null,  sort_order: 10,  in_more: false },
  { path: '/mainnet',        label: 'Leaderboard',    enabled: true,  tag: null,  sort_order: 20,  in_more: false },
  { path: '/sopoints',       label: 'SoPoints',       enabled: true,  tag: 'V1',  sort_order: 30,  in_more: false },
  { path: '/referral',       label: 'Referral',       enabled: true,  tag: null,  sort_order: 40,  in_more: false },
  { path: '/watchlist',      label: 'Watchlist',      enabled: true,  tag: null,  sort_order: 50,  in_more: false },
  { path: '/aggregator',     label: 'Aggregator',     enabled: true,  tag: 'V1',  sort_order: 60,  in_more: false },
  { path: '/tickets',        label: 'Tickets',        enabled: true,  tag: null,  sort_order: 70,  in_more: false },
  { path: '/larp',           label: 'LARP',           enabled: false, tag: 'New', sort_order: 75,  in_more: false },
  { path: '/reports',        label: 'Reports',        enabled: true,  tag: null,  sort_order: 75,  in_more: false },
  { path: '/copy',           label: 'Copy Trade',     enabled: true,  tag: null,  sort_order: 76,  in_more: true  },
  { path: '/alerts',         label: 'Alerts',         enabled: true,  tag: null,  sort_order: 77,  in_more: false },
  { path: '/design-system',  label: 'Design System',  enabled: true,  tag: null,  sort_order: 78,  in_more: true  },
  { path: '/admin',          label: 'Admin',          enabled: true,  tag: null,  sort_order: 80,  in_more: false },
  { path: '/platform',       label: 'Platform',       enabled: true,  tag: null,  sort_order: 90,  in_more: true  },
  { path: '/incoming',       label: 'Incoming',       enabled: true,  tag: null,  sort_order: 100, in_more: true  },
  { path: '/reverse-search', label: 'Reverse Search', enabled: true,  tag: null,  sort_order: 110, in_more: true  },
]

const navCache = { items: null, loaded: false, promise: null }
async function loadNavConfig() {
  if (navCache.loaded) return
  if (navCache.promise) return navCache.promise
  navCache.promise = supabase
    .from('nav_config')
    .select('path, label, enabled, tag, sort_order, in_more')
    .order('sort_order')
    .then(({ data, error }) => {
      if (error || !data) { navCache.items = FALLBACK_NAV }
      else {
        const dbPaths = new Set(data.map(d => d.path))
        const missing = FALLBACK_NAV.filter(f => !dbPaths.has(f.path))
        navCache.items = [...data, ...missing].sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
      }
      navCache.loaded = true
    })
  return navCache.promise
}

const TAG_COLORS = {
  V1: '#f26b1f', V2: '#10b981', V3: '#6366f1', Beta: '#f59e0b', Alpha: '#ef4444', New: '#10b981',
}

// Nav icons from design file (stroked, 1.8px)
const NavIcon = ({ name, size = 16 }) => {
  const paths = {
    tracker:    <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><circle cx="11" cy="11" r="3"/></>,
    mainnet:    <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
    sopoints:   <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>,
    social:     <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    watchlist:  <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    aggregator: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
    tickets:    <><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/></>,
    larp:       <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
    admin:      <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    platform:   <><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>,
    incoming:   <><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></>,
    search:     <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    design:     <><circle cx="8" cy="8" r="2"/><circle cx="16" cy="8" r="2"/><circle cx="8" cy="16" r="2"/><circle cx="16" cy="16" r="2"/></>,
    profile:    <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    settings:   <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    disclaimer: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
    shield:     <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    file:       <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
    info:       <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>,
    twitter:    null,
    telegram:   null,
    caret:      <><path d="m6 9 6 6 6-6"/></>,
    chevron:    <><path d="m6 9 6 6 6-6"/></>,
    login:      <><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></>,
    extlink:    <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>,
    reports:    <><path d="M3 3v18h18"/><path d="m7 14 3-3 4 4 5-5"/></>,
    copy:       <><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="m9 14 2 2 4-4"/></>,
    bell:       <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,
    mail:       <><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></>,
    collapseL:  <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><polyline points="15 9 12 12 15 15"/></>,
    collapseR:  <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><polyline points="13 15 16 12 13 9"/></>,
  }
  const p = paths[name]
  if (name === 'twitter') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )
  if (name === 'telegram') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  )
  if (!p) return null
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {p}
    </svg>
  )
}

const PATH_ICON_NAME = {
  '/tracker': 'tracker', '/mainnet': 'mainnet', '/sopoints': 'sopoints',
  '/referral': 'social', '/watchlist': 'watchlist', '/aggregator': 'aggregator',
  '/tickets': 'tickets', '/larp': 'larp', '/admin': 'admin',
  '/platform': 'platform', '/incoming': 'incoming', '/reverse-search': 'search',
  '/reports': 'reports', '/alerts': 'bell', '/copy': 'copy', '/design-system': 'design',
}

function Navbar() {
  const pathname = usePathname()
  const { user, isMod, setAuthModalCallback } = useSessionContext()
  const [showAuth, setShowAuth]             = useState(false)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [mobileActiveTab, setMobileActiveTab] = useState(null)
  const [navReady, setNavReady]             = useState(navCache.loaded)
  const [navHidden, setNavHidden]           = useState({})
  const [collapsed, setCollapsed]           = useState(false)

  // Persist collapsed state
  useEffect(() => {
    try { if (localStorage.getItem('sidebarCollapsed') === 'true') setCollapsed(true) } catch {}
  }, [])
  useEffect(() => {
    document.body.classList.toggle('sb-collapsed', collapsed)
    try { localStorage.setItem('sidebarCollapsed', String(collapsed)) } catch {}
  }, [collapsed])

  useEffect(() => {
    const load = () => {
      try { const s = localStorage.getItem('navVisibility'); if (s) setNavHidden(JSON.parse(s)) } catch {}
    }
    load()
    window.addEventListener('navVisibilityChanged', load)
    return () => window.removeEventListener('navVisibilityChanged', load)
  }, [])

  useEffect(() => {
    setAuthModalCallback(() => () => setShowAuth(true))
    return () => setAuthModalCallback(null)
  }, [setAuthModalCallback])

  useEffect(() => { setMobileActiveTab(null) }, [pathname])

  useEffect(() => {
    const tasks = []
    if (!navCache.loaded) tasks.push(loadNavConfig())
    if (!isConfigLoaded()) tasks.push(loadPageConfigs())
    if (tasks.length === 0) { setNavReady(true); return }
    Promise.all(tasks).then(() => setNavReady(true))
  }, [])

  const isProtected = (path) => { const c = configCache[path]; return c ? c.permission !== 'anon' : true }
  const isModOnly   = (path) => { if (path === '/admin') return true; const c = configCache[path]; return c ? c.permission === 'mod' : false }

  const { mainItems, moreItems } = useMemo(() => {
    const items = navCache.items || FALLBACK_NAV
    return {
      mainItems: items.filter(i => !i.in_more && i.enabled && navHidden[i.path] !== false && (!isModOnly(i.path) || isMod)),
      moreItems: items.filter(i =>  i.in_more && i.enabled && navHidden[i.path] !== false && (!isModOnly(i.path) || isMod)),
    }
  }, [navReady, isMod, navHidden])

  const currentPageLabel = useMemo(() => {
    if (pathname === '/') return 'Home'
    if (pathname === '/profile') return 'Profile'
    if (pathname === '/referral') return 'Referral'
    const all = navCache.items || FALLBACK_NAV
    const match = all.find(i => i.path !== '/' && pathname.startsWith(i.path))
    return match ? match.label : ''
  }, [pathname, navReady])

  const openCmdK = () => {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('openCommandPalette'))
  }

  const userInitial = user?.email?.[0]?.toUpperCase() ?? '?'
  const userEmail   = user?.email ?? ''
  const userName    = userEmail.split('@')[0] || 'User'

  const isActive = (path) => path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(path + '/')

  const renderTag = (tag) => {
    if (!tag) return null
    const color = TAG_COLORS[tag] || '#f26b1f'
    return (
      <span className="nav-tag" style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)` }}>
        {tag}
      </span>
    )
  }

  const renderNavItem = (item, checkAuth = true) => {
    const active = isActive(item.path)
    const iconName = PATH_ICON_NAME[item.path] || 'info'
    const El = item.newTab ? 'a' : Link
    const extra = item.newTab ? { target: '_blank', rel: 'noopener noreferrer', href: item.path } : { href: item.path }
    return (
      <El key={item.path} {...extra}
        className={`nav-item ${active ? 'active' : ''}`}
        title={collapsed ? item.label : undefined}
        onClick={checkAuth && item.protected && !user ? (e) => { e.preventDefault(); setShowAuth(true) } : undefined}
      >
        <NavIcon name={iconName} size={16} />
        <span className="nav-label">{item.label}</span>
        {renderTag(item.tag)}
        {item.newTab && <span className="nav-ext"><NavIcon name="extlink" size={10} /></span>}
      </El>
    )
  }

  return (
    <>
      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <aside className="sidebar">

        {/* Brand / Logo — no scroll */}
        <div className="sidebar-brand">
          <Link href="/" className="brand-logo-link" title="Home">
            <img src="/logo.svg" alt="CommunityScan" className="brand-logo-img" />
          </Link>
          <button className="sidebar-toggle" onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand' : 'Collapse'}>
            <NavIcon name={collapsed ? 'collapseR' : 'collapseL'} size={14} />
          </button>
        </div>

        {/* Main nav — scrolls internally only if items overflow */}
        <div className="sidebar-nav-list">

          {/* Main items */}
          <div className="nav-section">
            {mainItems.map(item => renderNavItem(item))}
          </div>

          {/* More items */}
          {moreItems.length > 0 && (
            <div className="nav-section">
              <div className="nav-section-title">More</div>
              {moreItems.map(item => renderNavItem(item))}
            </div>
          )}

          {/* Settings & Legal */}
          <div className="nav-section nav-section-last">
            <div className="nav-section-title">Settings &amp; Legal</div>

            <Link href="/profile" className={`nav-item ${isActive('/profile') ? 'active' : ''}`}
              title={collapsed ? 'Profile' : undefined}>
              <NavIcon name="profile" size={16} />
              <span className="nav-label">Profile</span>
            </Link>

            <Link href="/profile" className={`nav-item ${isActive('/profile') ? 'active' : ''}`}
              title={collapsed ? 'Settings' : undefined}>
              <NavIcon name="settings" size={16} />
              <span className="nav-label">Settings</span>
            </Link>

            <button className="nav-item" onClick={() => setShowDisclaimer(true)}
              title={collapsed ? 'Disclaimer' : undefined}>
              <NavIcon name="disclaimer" size={16} />
              <span className="nav-label">Disclaimer</span>
            </button>

            <a href="/datenschutz" className="nav-item" title={collapsed ? 'DSGVO' : undefined}>
              <NavIcon name="shield" size={16} />
              <span className="nav-label">DSGVO</span>
            </a>

            <a href="/terms" className="nav-item" title={collapsed ? 'T&C' : undefined}>
              <NavIcon name="file" size={16} />
              <span className="nav-label">T&amp;C</span>
            </a>

            <a href="/impressum" className="nav-item" title={collapsed ? 'Impressum' : undefined}>
              <NavIcon name="info" size={16} />
              <span className="nav-label">Impressum</span>
            </a>

            <a href="https://x.com/Lutz_S120" target="_blank" rel="noopener noreferrer"
              className="nav-item" title={collapsed ? 'X (Twitter)' : undefined}>
              <NavIcon name="twitter" size={16} />
              <span className="nav-label">X (Twitter)</span>
            </a>

            <a href="https://t.me/LutzS120" target="_blank" rel="noopener noreferrer"
              className="nav-item" title={collapsed ? 'Telegram' : undefined}>
              <NavIcon name="telegram" size={16} />
              <span className="nav-label">Telegram</span>
            </a>
          </div>
        </div>

        {/* Account card — no scroll, always at bottom */}
        {user ? (
          <Link href="/profile" className="sidebar-user">
            <div className="sidebar-avatar">{userInitial}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{userName}</div>
              <div className="sidebar-user-plan">{userEmail}</div>
            </div>
            <span className="sidebar-user-caret"><NavIcon name="caret" size={12} /></span>
          </Link>
        ) : (
          <button className="sidebar-user sidebar-login" onClick={() => setShowAuth(true)}>
            <div className="sidebar-avatar sidebar-avatar-login">
              <NavIcon name="login" size={14} />
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">Sign in</div>
              <div className="sidebar-user-plan">Login to your account</div>
            </div>
            <span className="sidebar-user-caret"><NavIcon name="caret" size={12} /></span>
          </button>
        )}
      </aside>

      {/* ── TOPBAR ──────────────────────────────────────────── */}
      <header className="topbar">
        <div className="topbar-breadcrumb">
          {currentPageLabel
            ? <><span className="breadcrumb-item">CommunityScan</span><span className="breadcrumb-sep">›</span><span className="breadcrumb-item current">{currentPageLabel}</span></>
            : <span className="breadcrumb-item current">CommunityScan</span>
          }
        </div>
        <div className="topbar-search">
          <NavIcon name="search" size={14} />
          <span className="topbar-search-label">Search...</span>
          <span className="topbar-kbd">⌘</span><span className="topbar-kbd">K</span>
          <button className="topbar-search-hit" onClick={openCmdK} aria-label="Open search" />
        </div>
        <button className="topbar-iconbox" title="Notifications">
          <NavIcon name="bell" size={15} />
          <span className="topbar-dot" />
        </button>
        <button className="topbar-iconbox" title="Messages">
          <NavIcon name="mail" size={15} />
        </button>
        {user ? (
          <Link href="/profile" className="topbar-avatarbox" title={userEmail}>
            <div className="topbar-av">{userInitial}</div>
          </Link>
        ) : (
          <button className="topbar-iconbox" onClick={() => setShowAuth(true)} title="Login">
            <NavIcon name="login" size={15} />
          </button>
        )}
      </header>

      {/* ── MOBILE BOTTOM BAR ───────────────────────────────── */}
      <div className="mobile-bottom-bar">
        <Link href="/" className={`mobile-nav-item ${pathname === '/' ? 'active' : ''}`}><Icons.Home /><span>Home</span></Link>
        <Link href="/tracker" className={`mobile-nav-item ${pathname === '/tracker' ? 'active' : ''}`}><Icons.Radar /><span>Scan</span></Link>
        <Link href="/sopoints" className={`mobile-nav-item ${pathname === '/sopoints' ? 'active' : ''}`}><Icons.Star /><span>Points</span></Link>
        <Link href="/mainnet" className={`mobile-nav-item ${pathname === '/mainnet' ? 'active' : ''}`}><Icons.Chart /><span>Rank</span></Link>
        <button className="mobile-nav-item" onClick={openCmdK}><Icons.Scan /><span>Search</span></button>
        <div className="mobile-nav-wrapper">
          {mobileActiveTab === 'more' && (
            <div className="mobile-popup-menu right-aligned">
              {user
                ? <Link href="/profile" className="highlight-link" onClick={() => setMobileActiveTab(null)}>Profile</Link>
                : <button className="text-link highlight-link" onClick={() => { setMobileActiveTab(null); setShowAuth(true) }}>Login</button>
              }
              <div className="menu-divider" />
              <Link href="/referral" onClick={() => setMobileActiveTab(null)}>Referral</Link>
              <div className="menu-divider" />
              <Link href="/watchlist" onClick={() => setMobileActiveTab(null)}>Watchlist</Link>
              <Link href="/platform" onClick={() => setMobileActiveTab(null)}>Platform Stats</Link>
              <Link href="/incoming" onClick={() => setMobileActiveTab(null)}>Incoming</Link>
              <Link href="/reverse-search" onClick={() => setMobileActiveTab(null)}>Reverse Search</Link>
              {isMod && (<><div className="menu-divider" /><Link href="/tickets" onClick={() => setMobileActiveTab(null)}>Tickets</Link><Link href="/admin" onClick={() => setMobileActiveTab(null)}>Admin</Link></>)}
              <div className="menu-divider" />
              <button className="text-link" onClick={() => { setMobileActiveTab(null); setShowDisclaimer(true) }}>Disclaimer</button>
            </div>
          )}
          <button className={`mobile-nav-item ${mobileActiveTab === 'more' ? 'active' : ''}`}
            onClick={() => setMobileActiveTab(mobileActiveTab === 'more' ? null : 'more')}>
            <Icons.Filter /><span>More</span>
          </button>
        </div>
      </div>

      {/* ── AUTH MODAL ──────────────────────────────────────── */}
      {showAuth && !user && (
        <>
          <div className="modal-overlay" onClick={() => setShowAuth(false)} />
          <div className="modal-box">
            <div className="modal-header">
              <h3>Login / Register</h3>
              <button className="modal-close" onClick={() => setShowAuth(false)}>×</button>
            </div>
            <Auth />
          </div>
        </>
      )}

      {/* ── DISCLAIMER MODAL ────────────────────────────────── */}
      {showDisclaimer && (
        <div className="disclaimer-overlay" onClick={() => setShowDisclaimer(false)}>
          <div className="disclaimer-modal" onClick={e => e.stopPropagation()}>
            <button className="disclaimer-close" onClick={() => setShowDisclaimer(false)}>×</button>
            <h2>Haftungsausschluss / Disclaimer</h2>
            <div className="disclaimer-content">
              <h3>Deutsch</h3>
              <p><strong>Ich gehöre in keiner Weise zu sodex.com oder sosovalue.com und bin nicht mit diesen affiliiert.</strong></p>
              <p><strong>Inhalte &amp; Nutzung:</strong> Alle Inhalte dieser Website dienen ausschließlich zu Informationszwecken. Trotz sorgfältiger Prüfung übernehmen wir keine Gewähr für die Aktualität, Vollständigkeit oder Richtigkeit der Inhalte.</p>
              <p><strong>Haftung:</strong> Die Nutzung der Website erfolgt <strong>auf eigenes Risiko</strong>. Wir übernehmen keine Haftung für direkte oder indirekte Schäden, Datenverlust oder sonstige Nachteile.</p>
              <p><strong>Referral-Daten:</strong> Für die Löschung kontaktieren Sie communityscan-sodex@outlook.com.</p>
              <p><strong>Keine Finanz- oder Anlageberatung.</strong></p>
              <h3>English</h3>
              <p><strong>I am in no way affiliated with sodex.com or sosovalue.com.</strong></p>
              <p><strong>Content &amp; Use:</strong> All content is for informational purposes only.</p>
              <p><strong>Liability:</strong> Use of this website is <strong>at your own risk</strong>.</p>
              <p><strong>No Financial Advice.</strong> Cryptocurrency trading involves substantial risk of loss.</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Navbar
