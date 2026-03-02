'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSessionContext } from '../lib/SessionContext'
import { useTheme } from '../lib/ThemeContext'
import { Auth } from './Auth'
import { Icons } from './CommandPalette'
import { configCache, loadPageConfigs, isConfigLoaded } from '../lib/pageConfig'
import { supabase } from '../lib/supabaseClient'
import '../styles/Navbar.css'

// Hardcoded fallback used when nav_config table doesn't exist yet
const FALLBACK_NAV = [
  { path: '/tracker',        label: 'Scan',           enabled: true, tag: null,  sort_order: 10,  in_more: false },
  { path: '/mainnet',        label: 'Leaderboard',    enabled: true, tag: null,  sort_order: 20,  in_more: false },
  { path: '/sopoints',       label: 'SoPoints',       enabled: true, tag: 'V1',  sort_order: 30,  in_more: false },
  { path: '/social',         label: 'Social',         enabled: true, tag: null,  sort_order: 40,  in_more: false },
  { path: '/watchlist',      label: 'Watchlist',      enabled: true, tag: null,  sort_order: 50,  in_more: false },
  { path: '/aggregator',     label: 'Aggregator',     enabled: true, tag: 'V1',  sort_order: 60,  in_more: false },
  { path: '/tickets',        label: 'Tickets',        enabled: true, tag: null,  sort_order: 70,  in_more: false },
  { path: '/admin',          label: 'Admin',          enabled: true, tag: null,  sort_order: 80,  in_more: false },
  { path: '/platform',       label: 'Platform',       enabled: true, tag: null,  sort_order: 90,  in_more: true  },
  { path: '/incoming',       label: 'Incoming',       enabled: true, tag: null,  sort_order: 100, in_more: true  },
  { path: '/reverse-search', label: 'Reverse Search', enabled: true, tag: null,  sort_order: 110, in_more: true  },
]

// Module-level nav_config cache
const navCache = { items: null, loaded: false, promise: null }

async function loadNavConfig() {
  if (navCache.loaded) return
  if (navCache.promise) return navCache.promise
  navCache.promise = supabase
    .from('nav_config')
    .select('*')
    .order('sort_order')
    .then(({ data, error }) => {
      navCache.items = (error || !data) ? FALLBACK_NAV : data
      navCache.loaded = true
    })
  return navCache.promise
}

// Social dropdown children are structural — kept static
const SOCIAL_CHILDREN = [
  { path: '/social', label: 'Leaderboard' },
  { path: '/social/stats', label: 'Stats' },
  { path: '/referral', label: 'Referral' },
]

const TAG_COLORS = {
  V1: 'var(--color-primary)',
  V2: '#10b981',
  V3: '#6366f1',
  Beta: '#f59e0b',
  Alpha: '#ef4444',
  New: '#10b981',
}

function Navbar() {
  const pathname = usePathname()
  const { user, isMod, setAuthModalCallback } = useSessionContext()
  const { logo } = useTheme()
  const [showAuth, setShowAuth] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileActiveTab, setMobileActiveTab] = useState(null)
  const [navReady, setNavReady] = useState(navCache.loaded)

  useEffect(() => {
    setAuthModalCallback(() => () => setShowAuth(true))
    return () => setAuthModalCallback(null)
  }, [setAuthModalCallback])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Load nav_config and page_config (for permission checks)
  useEffect(() => {
    const tasks = []
    if (!navCache.loaded) tasks.push(loadNavConfig())
    if (!isConfigLoaded()) tasks.push(loadPageConfigs())
    if (tasks.length === 0) { setNavReady(true); return }
    Promise.all(tasks).then(() => setNavReady(true))
  }, [])

  const isProtected = (path) => {
    const cfg = configCache[path]
    return cfg ? cfg.permission !== 'anon' : true
  }

  const isModOnly = (path) => {
    const cfg = configCache[path]
    return cfg ? cfg.permission === 'mod' : false
  }

  const navLinks = useMemo(() => {
    const items = navCache.items || FALLBACK_NAV
    const mainItems = items.filter(i => !i.in_more && i.enabled)
    const moreItems = items.filter(i => i.in_more && i.enabled)

    const links = mainItems
      .filter(item => !isModOnly(item.path) || isMod)
      .map(item => {
        const link = {
          path: item.path,
          label: item.label,
          tag: item.tag || null,
          protected: isProtected(item.path),
        }
        if (item.path === '/social') link.children = SOCIAL_CHILDREN
        if (item.path === '/aggregator') link.newTab = true
        return link
      })

    if (moreItems.length > 0) {
      links.push({
        path: '/more',
        label: 'More',
        protected: false,
        children: moreItems
          .filter(item => !isModOnly(item.path) || isMod)
          .map(item => ({
            path: item.path,
            label: item.label,
            protected: isProtected(item.path),
          })),
      })
    }

    return links
  }, [navReady, isMod])

  const openCmdK = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('openCommandPalette'))
    }
  }

  const renderLabel = (link) => {
    if (!link.tag) return link.label
    const color = TAG_COLORS[link.tag] || 'var(--color-primary)'
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', verticalAlign: 'middle' }}>
        {link.label}
        <span style={{
          fontSize: '9px', fontWeight: 800, color,
          background: `color-mix(in srgb, ${color} 15%, transparent)`,
          border: `1px solid ${color}`,
          borderRadius: '4px', padding: '2px 4px',
          lineHeight: '1', textTransform: 'uppercase', letterSpacing: '0.5px'
        }}>{link.tag}</span>
      </span>
    )
  }

  const isLandingPage = pathname === '/'

  return (
    <>
      <nav className={`navbar ${isLandingPage ? 'navbar-landing' : ''}`}>
        <div className="navbar-inner-glow"></div>

        <div className="navbar-container">
          <Link href="/" className="navbar-logo">
            <img src={logo} alt="Pukai" className="logo-icon" />
          </Link>

          <div className="navbar-links">
            {navLinks.map((link) => {
              const checkAuth = (e) => {
                if (link.protected && !user) {
                  e.preventDefault()
                  setShowAuth(true)
                }
              }

              if (link.children) {
                return (
                  <div key={link.label} className="nav-item-dropdown">
                    <button className={`nav-link ${pathname.startsWith(link.path) ? 'active' : ''}`}>
                      {renderLabel(link)} ▾
                    </button>
                    <div className="nav-dropdown-menu">
                      {link.children.map(child => (
                        <Link
                          key={child.path}
                          href={child.path}
                          className="dropdown-link"
                          onClick={(e) => {
                            const prot = child.protected !== undefined ? child.protected : link.protected
                            if (prot && !user) { e.preventDefault(); setShowAuth(true) }
                          }}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )
              }

              if (link.newTab) {
                return (
                  <a
                    key={link.path}
                    href={link.path}
                    className={`nav-link ${pathname === link.path ? 'active' : ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (link.protected && !user) { e.preventDefault(); setShowAuth(true) }
                    }}
                  >
                    {renderLabel(link)}
                  </a>
                )
              }

              return link.external ? (
                <a key={link.path} href={link.path} className="nav-link" target="_blank" rel="noopener noreferrer">
                  {renderLabel(link)}
                </a>
              ) : (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`nav-link ${pathname === link.path ? 'active' : ''}`}
                  onClick={checkAuth}
                >
                  {renderLabel(link)}
                </Link>
              )
            })}
          </div>

          <div className="navbar-right" style={{ gridColumn: 3, justifySelf: 'end', display: 'flex', alignItems: 'center' }}>
            <div className="navbar-auth">
              {user ? (
                <Link href="/profile" className="login-btn" style={{ padding: '8px 16px', fontSize: '12px', textDecoration: 'none' }}>
                  Profile
                </Link>
              ) : (
                <button onClick={() => setShowAuth(!showAuth)} className="login-btn" style={{ padding: '8px 16px', fontSize: '12px' }}>
                  Login
                </button>
              )}
            </div>

            <button
              className="hamburger-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
              <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
              <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="mobile-menu">
            {navLinks.map((link) => {
              if (link.children) {
                return link.children.map(child => (
                  <Link
                    key={child.path}
                    href={child.path}
                    className={`mobile-menu-link ${pathname === child.path ? 'active' : ''}`}
                    onClick={(e) => {
                      const prot = child.protected !== undefined ? child.protected : link.protected
                      if (prot && !user) { e.preventDefault(); setMobileMenuOpen(false); setShowAuth(true) }
                      else setMobileMenuOpen(false)
                    }}
                  >
                    {link.label} - {child.label}
                  </Link>
                ))
              }
              if (link.newTab) {
                return (
                  <a
                    key={link.path}
                    href={link.path}
                    className={`mobile-menu-link ${pathname === link.path ? 'active' : ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (link.protected && !user) { e.preventDefault(); setMobileMenuOpen(false); setShowAuth(true) }
                      else setMobileMenuOpen(false)
                    }}
                  >
                    {renderLabel(link)}
                  </a>
                )
              }
              return (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`mobile-menu-link ${pathname === link.path ? 'active' : ''}`}
                  onClick={(e) => {
                    if (link.protected && !user) { e.preventDefault(); setMobileMenuOpen(false); setShowAuth(true) }
                    else setMobileMenuOpen(false)
                  }}
                >
                  {renderLabel(link)}
                </Link>
              )
            })}
            {user ? (
              <Link href="/profile" className={`mobile-menu-link ${pathname === '/profile' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                Profile
              </Link>
            ) : (
              <button className="mobile-menu-link" onClick={() => { setMobileMenuOpen(false); setShowAuth(true) }}>
                Login
              </button>
            )}
          </div>
        )}

        <div className="navbar-glow desktop-only"></div>

        {/* MOBILE BOTTOM BAR */}
        <div className="mobile-bottom-bar">
          <Link href="/" className={`mobile-nav-item ${pathname === '/' ? 'active' : ''}`}>
            <Icons.Home />
            <span>Home</span>
          </Link>
          <Link href="/tracker" className={`mobile-nav-item ${pathname === '/tracker' ? 'active' : ''}`}>
            <Icons.Radar />
            <span>Scan</span>
          </Link>
          <Link href="/sopoints" className={`mobile-nav-item ${pathname === '/sopoints' ? 'active' : ''}`}>
            <Icons.Star />
            <span>Points</span>
          </Link>
          <Link href="/mainnet" className={`mobile-nav-item ${pathname === '/mainnet' ? 'active' : ''}`}>
            <Icons.Chart />
            <span>Rank</span>
          </Link>
          <button className="mobile-nav-item" onClick={openCmdK}>
            <Icons.Scan />
            <span>Search</span>
          </button>

          <div className="mobile-nav-wrapper">
            {mobileActiveTab === 'more' && (
              <div className="mobile-popup-menu right-aligned">
                {user ? (
                  <Link href="/profile" className="highlight-link" onClick={() => setMobileActiveTab(null)}>Profile</Link>
                ) : (
                  <button className="text-link highlight-link" onClick={() => { setMobileActiveTab(null); setShowAuth(true) }}>Login</button>
                )}
                <div className="menu-divider"></div>
                <Link href="/social" onClick={() => setMobileActiveTab(null)}>Social Leaderboard</Link>
                <Link href="/social/stats" onClick={() => setMobileActiveTab(null)}>Social Stats</Link>
                <Link href="/referral" onClick={() => setMobileActiveTab(null)}>Referral</Link>
                <div className="menu-divider"></div>
                <Link href="/watchlist" onClick={() => setMobileActiveTab(null)}>Watchlist</Link>
                <Link href="/platform" onClick={() => setMobileActiveTab(null)}>Platform Stats</Link>
                <Link href="/incoming" onClick={() => setMobileActiveTab(null)}>Incoming</Link>
                <Link href="/reverse-search" onClick={() => setMobileActiveTab(null)}>Reverse Search</Link>
                {isMod && (
                  <>
                    <div className="menu-divider"></div>
                    <Link href="/tickets" onClick={() => setMobileActiveTab(null)}>Moderator Tickets</Link>
                    <Link href="/admin" onClick={() => setMobileActiveTab(null)}>Admin</Link>
                  </>
                )}
              </div>
            )}
            <button
              className={`mobile-nav-item ${mobileActiveTab === 'more' ? 'active' : ''}`}
              onClick={() => setMobileActiveTab(mobileActiveTab === 'more' ? null : 'more')}
            >
              <Icons.Filter />
              <span>More</span>
            </button>
          </div>
        </div>
      </nav>

      {showAuth && !user && (
        <>
          <div
            className="auth-overlay"
            onClick={() => setShowAuth(false)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000 }}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
            padding: '24px', zIndex: 1001, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(10px)', width: '90%', maxWidth: '400px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: '600' }}>Login / Register</h3>
              <button
                onClick={() => setShowAuth(false)}
                style={{
                  background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer', fontSize: '24px', lineHeight: '1', padding: '0',
                  width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s'
                }}
                onMouseEnter={e => e.target.style.color = '#fff'}
                onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.6)'}
              >×</button>
            </div>
            <Auth />
          </div>
        </>
      )}
    </>
  )
}

export default Navbar
