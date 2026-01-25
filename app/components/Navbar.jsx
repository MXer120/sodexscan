'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import { Auth } from './Auth'
import '../styles/Navbar.css'

function Navbar() {
  const pathname = usePathname()
  const [user, setUser] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  const navLinks = [
    { path: '/tracker', label: 'Scan' },
    { path: '/mainnet', label: 'Leaderboard' },
    { path: '/platform', label: 'Platform' },
    ...(user ? [
      { path: '/watchlist', label: 'Watchlist' },
      { path: '/incoming', label: 'Incoming' }
    ] : []),
  ]

  const isLandingPage = pathname === '/'

  return (
    <>
      <nav className={`navbar ${isLandingPage ? 'navbar-landing' : ''}`}>
        {/* Glow into navbar from below */}
        <div className="navbar-inner-glow"></div>

        <div className="navbar-container">
          <Link href="/" className="navbar-logo">
            <img src="/logo.svg" alt="Pukai" className="logo-icon" />
          </Link>

          <div className="navbar-links">
            {navLinks.map((link) =>
              link.external ? (
                <a
                  key={link.path}
                  href={link.path}
                  className="nav-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`nav-link ${pathname === link.path ? 'active' : ''}`}
                >
                  {link.label}
                </Link>
              )
            )}
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
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`mobile-menu-link ${pathname === link.path ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
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

        {/* Only show glow line on non-landing pages */}
        {<div className="navbar-glow"></div>}
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
