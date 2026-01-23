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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setShowAuth(false)
  }

  const navLinks = [
    { path: '/tracker', label: 'Scan' },
    { path: '/mainnet', label: 'Leaderboard' },
    { path: '/platform', label: 'Platform' },
    ...(user ? [
      { path: '/watchlist', label: 'Watchlist' },
      { path: '/profile', label: 'Profile' }
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

          <div className="navbar-auth" style={{ gridColumn: 3, justifySelf: 'end' }}>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)' }}>{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="login-btn"
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px'
                  }}
                >
                  Logout
                </button>
              </div>
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
        </div>

        {/* Only show glow line on non-landing pages */}
        {<div className="navbar-glow"></div>}
      </nav>

      {showAuth && !user && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          background: '#1a1a1a',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '24px',
          zIndex: 1000,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(10px)'
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
      )}
    </>
  )
}

export default Navbar
