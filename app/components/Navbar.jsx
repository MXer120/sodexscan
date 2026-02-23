'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSessionContext } from '../lib/SessionContext'
import { useTheme } from '../lib/ThemeContext'
import { Auth } from './Auth'
import { Icons } from './CommandPalette'
import '../styles/Navbar.css'

function Navbar() {
  const pathname = usePathname()
  const { user, isMod, setAuthModalCallback } = useSessionContext()
  const { logo } = useTheme()
  const [showAuth, setShowAuth] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false) // Keeping this for backward compatibility if needed, or repurposed
  const [mobileActiveTab, setMobileActiveTab] = useState(null)

  const openCmdK = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('openCommandPalette'))
    }
  }

  // Register the auth modal callback with the context
  useEffect(() => {
    setAuthModalCallback(() => () => setShowAuth(true))
    return () => setAuthModalCallback(null)
  }, [setAuthModalCallback])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  const navLinks = useMemo(() => {
    if (isMod) {
      return [
        { path: '/tracker', label: 'Scan', protected: false },
        { path: '/mainnet', label: 'Leaderboard', protected: true },
        { path: '/tickets', label: 'Tickets', protected: true },
        { path: '/reverse-search', label: 'Reverse Search', protected: true },
        { path: '/watchlist', label: 'Watchlist', protected: true },
        {
          path: '/more',
          label: 'More',
          protected: false,
          children: [
            { path: '/platform', label: 'Platform', protected: false },
          ]
        }
      ]
    }
    return [
      { path: '/tracker', label: 'Scan', protected: false },
      { path: '/mainnet', label: 'Leaderboard', protected: true },
      { path: '/sopoints', label: 'SoPoints', protected: true, isNew: true },
      {
        path: '/social',
        label: 'Social',
        protected: true,
        children: [
          { path: '/social', label: 'Leaderboard' },
          { path: '/social/stats', label: 'Stats' },
          { path: '/referral', label: 'Referral' }
        ]
      },
      { path: '/watchlist', label: 'Watchlist', protected: true },
      {
        path: '/more',
        label: 'More',
        protected: false,
        children: [
          { path: '/platform', label: 'Platform', protected: false },
          { path: '/incoming', label: 'Incoming', protected: true },
          { path: '/reverse-search', label: 'Reverse Search', protected: true }
        ]
      }
    ]
  }, [isMod])

  const isLandingPage = pathname === '/'

  const renderLabel = (link) => {
    if (link.isNew) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', verticalAlign: 'middle' }}>
          {link.label}
          <span style={{
            fontSize: '9px',
            fontWeight: 800,
            color: 'var(--color-primary)',
            background: 'rgba(var(--color-primary-rgb), 0.15)',
            border: '1px solid var(--color-primary)',
            borderRadius: '4px',
            padding: '2px 4px',
            lineHeight: '1',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>V1</span>
        </span>
      )
    }
    return link.label
  }

  return (
    <>
      <nav className={`navbar ${isLandingPage ? 'navbar-landing' : ''}`}>
        {/* Glow into navbar from below */}
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
                            const isProtected = child.protected !== undefined ? child.protected : link.protected
                            if (isProtected && !user) {
                              e.preventDefault()
                              setShowAuth(true)
                            }
                          }}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )
              }

              return link.external ? (
                <a
                  key={link.path}
                  href={link.path}
                  className="nav-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
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
            {/* Desktop auth */}
            <div className="navbar-auth">
              {user ? (
                <Link
                  href="/profile"
                  className="login-btn"
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    textDecoration: 'none'
                  }}
                >
                  Profile
                </Link>
              ) : (
                <button
                  onClick={() => setShowAuth(!showAuth)}
                  className="login-btn"
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px'
                  }}
                >
                  Login
                </button>
              )}
            </div>

            {/* Hamburger menu button - mobile only */}
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

        {/* Mobile menu */}
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
                      const isProtected = child.protected !== undefined ? child.protected : link.protected
                      if (isProtected && !user) {
                        e.preventDefault()
                        setMobileMenuOpen(false);
                        setShowAuth(true);
                      } else {
                        setMobileMenuOpen(false);
                      }
                    }}
                  >
                    {link.label} - {child.label}
                  </Link>
                ))
              }
              return (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`mobile-menu-link ${pathname === link.path ? 'active' : ''}`}
                  onClick={(e) => {
                    if (link.protected && !user) {
                      e.preventDefault()
                      setMobileMenuOpen(false);
                      setShowAuth(true);
                    } else {
                      setMobileMenuOpen(false);
                    }
                  }}
                >

                  {renderLabel(link)}
                </Link>
              )
            })}
            {user ? (
              <Link
                href="/profile"
                className={`mobile-menu-link ${pathname === '/profile' ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Profile
              </Link>
            ) : (
              <button
                className="mobile-menu-link"
                onClick={() => { setMobileMenuOpen(false); setShowAuth(true); }}
              >
                Login
              </button>
            )}
          </div>
        )}

        {/* Only show glow line on non-landing pages on Desktop */}
        <div className="navbar-glow desktop-only"></div>

        {/* MOBILE BOTTOM BAR */}
        <div className="mobile-bottom-bar">
          {/* 1. Home */}
          <Link href="/" className={`mobile-nav-item ${pathname === '/' ? 'active' : ''}`}>
            <Icons.Home />
            <span>Home</span>
          </Link>

          {/* 2. Scan */}
          <Link href="/tracker" className={`mobile-nav-item ${pathname === '/tracker' ? 'active' : ''}`}>
            <Icons.Radar />
            <span>Scan</span>
          </Link>

          {/* 3. SoPoints or Tickets (mod) */}
          {isMod ? (
            <Link href="/tickets" className={`mobile-nav-item ${pathname.startsWith('/tickets') ? 'active' : ''}`}>
              <Icons.File />
              <span>Tickets</span>
            </Link>
          ) : (
            <Link href="/sopoints" className={`mobile-nav-item ${pathname === '/sopoints' ? 'active' : ''}`}>
              <Icons.Star />
              <span>Points</span>
            </Link>
          )}

          {/* 4. Rank */}
          <Link href="/mainnet" className={`mobile-nav-item ${pathname === '/mainnet' ? 'active' : ''}`}>
            <Icons.Chart />
            <span>Rank</span>
          </Link>

          {/* 5. Search */}
          <button className="mobile-nav-item" onClick={openCmdK}>
            <Icons.Scan />
            <span>Search</span>
          </button>

          {/* 6. More (Dropdown) */}
          <div className="mobile-nav-wrapper">
            {mobileActiveTab === 'more' && (
              <div className="mobile-popup-menu right-aligned">
                {user ? (
                  <Link href="/profile" className="highlight-link" onClick={() => setMobileActiveTab(null)}>Profile</Link>
                ) : (
                  <button className="text-link highlight-link" onClick={() => { setMobileActiveTab(null); setShowAuth(true); }}>Login</button>
                )}
                <div className="menu-divider"></div>

                {isMod ? (
                  <>
                    <Link href="/reverse-search" onClick={() => setMobileActiveTab(null)}>Reverse Search</Link>
                    <Link href="/watchlist" onClick={() => setMobileActiveTab(null)}>Watchlist</Link>
                    <Link href="/platform" onClick={() => setMobileActiveTab(null)}>Platform Stats</Link>
                  </>
                ) : (
                  <>
                    {/* Social Links */}
                    <Link href="/social" onClick={() => setMobileActiveTab(null)}>Social Leaderboard</Link>
                    <Link href="/social/stats" onClick={() => setMobileActiveTab(null)}>Social Stats</Link>
                    <Link href="/referral" onClick={() => setMobileActiveTab(null)}>Referral</Link>
                    <div className="menu-divider"></div>

                    <Link href="/watchlist" onClick={() => setMobileActiveTab(null)}>Watchlist</Link>
                    <Link href="/platform" onClick={() => setMobileActiveTab(null)}>Platform Stats</Link>
                    <Link href="/incoming" onClick={() => setMobileActiveTab(null)}>Incoming</Link>
                    <Link href="/reverse-search" onClick={() => setMobileActiveTab(null)}>Reverse Search</Link>
                  </>
                )}
              </div>
            )}
            <button
              className={`mobile-nav-item ${(mobileActiveTab === 'more') ? 'active' : ''}`}
              onClick={() => setMobileActiveTab(mobileActiveTab === 'more' ? null : 'more')}
            >
              <Icons.Filter />
              <span>More</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Auth modal - centered */}
      {showAuth && !user && (
        <>
          <div
            className="auth-overlay"
            onClick={() => setShowAuth(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 1000
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#1a1a1a',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '24px',
            zIndex: 1001,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(10px)',
            width: '90%',
            maxWidth: '400px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: '600' }}>Login / Register</h3>
              <button
                onClick={() => setShowAuth(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.6)',
                  cursor: 'pointer',
                  fontSize: '24px',
                  lineHeight: '1',
                  padding: '0',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.color = '#fff'}
                onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.6)'}
              >
                ×
              </button>
            </div>
            <Auth />
          </div>
        </>
      )}
    </>
  )
}

export default Navbar
