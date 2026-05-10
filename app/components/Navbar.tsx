'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSessionContext } from '../lib/SessionContext'
import { Auth } from './Auth'
import { Icons } from './CommandPalette'
import '../styles/Navbar.css'

function Navbar() {
  const pathname = usePathname()
  const { user, isMod, setAuthModalCallback } = useSessionContext()
  const [showAuth, setShowAuth]             = useState(false)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [mobileActiveTab, setMobileActiveTab] = useState(null)

  useEffect(() => {
    setAuthModalCallback(() => () => setShowAuth(true))
    return () => setAuthModalCallback(null)
  }, [setAuthModalCallback])

  useEffect(() => {
    const handler = () => setShowAuth(true)
    window.addEventListener('openAuthModal', handler)
    return () => window.removeEventListener('openAuthModal', handler)
  }, [])

  useEffect(() => { setMobileActiveTab(null) }, [pathname])

  const openCmdK = () => {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('openCommandPalette'))
  }

  return (
    <>
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
              <Link href="/watchlist" onClick={() => setMobileActiveTab(null)}>Watchlist</Link>
              <Link href="/platform" onClick={() => setMobileActiveTab(null)}>Platform Stats</Link>
              <Link href="/incoming" onClick={() => setMobileActiveTab(null)}>Incoming</Link>
              <Link href="/reverse-search" onClick={() => setMobileActiveTab(null)}>Reverse Search</Link>
              {isMod && (<><div className="menu-divider" /><Link href="/admin" onClick={() => setMobileActiveTab(null)}>Admin</Link></>)}
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
