'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useSessionContext } from '../../lib/SessionContext'
// SoDEX logo SVG URL extracted from live sodex.com
const SODEX_LOGO = 'https://sodex.com/assets/SoDEX-zLhsse8_.svg'
import { supabase } from '../../lib/supabaseClient'
import LarpTrade from './LarpTrade'
import LarpPortfolio from './LarpPortfolio'
import LarpVault from './LarpVault'
import LarpLeaderboard from './LarpLeaderboard'
import '../../styles/LarpPage.css'

function LarpBorderOverlay() {
  const [walletRect, setWalletRect] = useState(null)

  useEffect(() => {
    const measure = () => {
      const btn = document.querySelector('.larp-wallet-btn')
      if (btn) {
        const r = btn.getBoundingClientRect()
        setWalletRect({ x: r.x, y: r.y, w: r.width, h: r.height })
      }
    }
    measure()
    // Re-measure on resize
    const ro = new ResizeObserver(measure)
    ro.observe(document.body)
    // Also observe wallet btn directly if it exists
    const btn = document.querySelector('.larp-wallet-btn')
    if (btn) ro.observe(btn)
    return () => ro.disconnect()
  }, [])

  if (!walletRect) {
    // Fallback: simple rectangle until wallet btn is measured
    return (
      <svg className="larp-border-overlay" viewBox="0 0 1 1" preserveAspectRatio="none">
        <rect x="0" y="0" width="1" height="1" fill="none" stroke="var(--larp-border, #48cbff)" strokeWidth="0.003" vectorEffect="non-scaling-stroke" />
      </svg>
    )
  }

  const pad = 6
  const sw = 2 // stroke width
  const W = window.innerWidth
  const H = window.innerHeight

  // Wallet button bounds with padding
  const wL = walletRect.x - pad
  const wT = walletRect.y - pad
  const wR = walletRect.x + walletRect.w + pad
  const wB = walletRect.y + walletRect.h + pad

  // Path: traces outer border with a notch/tab dipping down around the wallet button
  // Start top-left, go right along top to wallet area, dip down around wallet, back up, continue to right edge
  const d = [
    `M ${sw/2},${sw/2}`,              // top-left
    `H ${wL}`,                         // across top to wallet left
    `V ${wB}`,                         // down to wallet bottom
    `H ${wR}`,                         // across wallet bottom
    `V ${sw/2}`,                       // back up to top
    `H ${W - sw/2}`,                   // continue to right edge
    `V ${H - sw/2}`,                   // down right side
    `H ${sw/2}`,                       // across bottom
    `Z`,                               // back to top-left
  ].join(' ')

  return (
    <svg
      className="larp-border-overlay"
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 }}
    >
      <path
        d={d}
        fill="none"
        stroke="var(--larp-border, #48cbff)"
        strokeWidth={sw}
      />
    </svg>
  )
}

const SODEX_EXTERNAL = {
  rewards: 'https://sodex.com/points',
  referrals: 'https://sodex.com/referrals',
  staking: 'https://sodex.com/stake',
}

// Dropdown arrow SVG path (Phosphor caret-down)
const CARET_PATH = 'M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z'

function DropdownCaret() {
  return (
    <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" style={{ display: 'block', overflow: 'hidden', transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      <path d={CARET_PATH} />
    </svg>
  )
}

export default function LarpPage() {
  const { user } = useSessionContext()
  // no useTheme — larp page uses SoDEX branding, not communityscan
  const [activeView, setActiveView] = useState('trade')
  const [wallet, setWallet] = useState('')
  const [walletInput, setWalletInput] = useState('')
  const [showWalletModal, setShowWalletModal] = useState(false)

  const [fromScanner, setFromScanner] = useState(false)

  // Accept ?wallet= param to pre-connect (used by "View as Sodex" from scanner)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const w = params.get('wallet')
    if (w && /^0x[a-fA-F0-9]{40}$/.test(w)) {
      setWallet(w)
      setActiveView('portfolio')
      setFromScanner(true)
    }
  }, [])
  const [ownWallet, setOwnWallet] = useState(null)
  const [openDropdown, setOpenDropdown] = useState(null)
  const [topPerformers, setTopPerformers] = useState([])
  const dropdownRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Get user's own wallet
  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('own_wallet')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.own_wallet) {
          setOwnWallet(data.own_wallet)
          if (!wallet) setWallet(data.own_wallet)
        }
      })
  }, [user])

  const handleWalletSubmit = useCallback(() => {
    const v = walletInput.trim()
    if (v && v.startsWith('0x') && v.length >= 10) {
      setWallet(v)
      setShowWalletModal(false)
    }
  }, [walletInput])

  const handleDisconnect = useCallback(() => {
    setWallet('')
    setShowWalletModal(false)
  }, [])

  const truncAddr = (a) => a ? `${a.slice(0, 6)}...${a.slice(-4)}` : ''

  // Fetch top 5 leaderboard performers for wallet modal
  useEffect(() => {
    fetch('/api/sodex-leaderboard?window_type=ALL_TIME&sort_by=pnl&sort_order=desc&page=1&page_size=5')
      .then(r => r.json())
      .then(json => {
        if (json?.data?.items) setTopPerformers(json.data.items)
      })
      .catch(() => {})
  }, [])

  const handleNavClick = (key) => {
    setActiveView(key)
    setOpenDropdown(null)
  }

  // Nav item definitions matching Sodex order
  const navItems = [
    {
      key: 'trade', label: 'Trade', hasDropdown: true,
      children: [
        { key: 'trade', label: 'Perpetuals', internal: true },
      ]
    },
    { key: 'vault', label: 'Vault', internal: true },
    { key: 'portfolio', label: 'Portfolio', internal: true },
    {
      key: 'rewards', label: 'Rewards', hasDropdown: true,
      badge: 'WEEK 9',
      children: [
        { label: 'Points', href: SODEX_EXTERNAL.rewards },
      ]
    },
    { key: 'referrals', label: 'Referrals', href: SODEX_EXTERNAL.referrals },
    { key: 'staking', label: 'Staking', href: SODEX_EXTERNAL.staking },
    { key: 'leaderboard', label: 'Leaderboard', internal: true },
    { key: 'detector', label: 'Larp Detector', href: '/larp-detector' },
    {
      key: 'more', label: 'More', hasDropdown: true,
      children: [
        { label: 'Explorer', href: 'https://explorer.sodex.dev' },
        { label: 'Docs', href: 'https://sodex.com/documentation' },
        { label: 'Announcements', href: 'https://sodex.com/announcements' },
      ]
    },
  ]

  const isActive = (item) => {
    if (item.internal && activeView === item.key) return true
    if (item.children) return item.children.some(c => c.internal && activeView === c.key)
    return false
  }

  return (
    <div className="larp-frame" style={{ '--larp-border': 'var(--color-primary, #48cbff)' }}>
      {/* Colored border overlay — SVG path with wallet button notch */}
      <LarpBorderOverlay />

      {/* Sodex-style navbar */}
      <header className="larp-nav">
        <div className="larp-nav-inner" ref={dropdownRef}>
          {/* Logo — CommunityScan when from scanner, else Sodex */}
          <a className="larp-nav-logo" onClick={() => handleNavClick('trade')} style={{ cursor: 'pointer' }}>
            {fromScanner
              ? <img src="/logo-green.svg" alt="CommunityScan" height="24" style={{ height: 24, width: 'auto' }} />
              : <img src={SODEX_LOGO} alt="SoDEX" width="88" height="24" style={{ height: 24, width: 'auto' }} />
            }
          </a>

          {/* Nav items */}
          <ul className="larp-nav-list">
            {navItems.map(item => {
              const active = isActive(item)

              // External link (no dropdown)
              if (item.href) {
                return (
                  <li key={item.key} className="larp-nav-item">
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="larp-nav-link"
                    >
                      {item.label}
                    </a>
                  </li>
                )
              }

              // Internal page (no dropdown)
              if (item.internal) {
                return (
                  <li key={item.key} className="larp-nav-item">
                    <button
                      className={`larp-nav-link${active ? ' active' : ''}`}
                      onClick={() => handleNavClick(item.key)}
                    >
                      {item.label}
                    </button>
                  </li>
                )
              }

              // Dropdown item
              return (
                <li key={item.key} className="larp-nav-item">
                  <button
                    className={`larp-nav-link${item.key === 'more' ? ' larp-nav-more' : ''}${active ? ' active' : ''}`}
                    onClick={() => setOpenDropdown(openDropdown === item.key ? null : item.key)}
                  >
                    {item.label}
                    {item.badge && <span className="larp-nav-badge">{item.badge}</span>}
                    <DropdownCaret />
                  </button>
                  {openDropdown === item.key && (
                    <div className="larp-nav-dropdown">
                      {item.children.map((child, i) =>
                        child.href ? (
                          <a
                            key={i}
                            href={child.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="larp-nav-dropdown-item"
                            onClick={() => setOpenDropdown(null)}
                          >
                            {child.label}
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 6, opacity: 0.3 }}>
                              <path d="M3.5 1.5H10.5V8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M10.5 1.5L1.5 10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </a>
                        ) : (
                          <button
                            key={i}
                            className={`larp-nav-dropdown-item${activeView === child.key ? ' active' : ''}`}
                            onClick={() => handleNavClick(child.key)}
                          >
                            {child.label}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          {/* Right section — matches sodex.com order */}
          <div className="larp-nav-right">
            {/* Back to Scanner — only when opened from scanner */}
            {fromScanner && wallet && (
              <a
                href={`/tracker/${wallet}`}
                className="larp-nav-link"
                style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary, #48cbff)', textDecoration: 'none', whiteSpace: 'nowrap' }}
              >
                &larr; Scanner
              </a>
            )}
            {/* Connect Wallet button */}
            <button
              className="larp-wallet-btn"
              onClick={() => setShowWalletModal(true)}
            >
              {wallet ? truncAddr(wallet) : 'Connect Wallet'}
            </button>

            {/* Research Terminal link */}
            <a
              href="/"
              className="larp-nav-link larp-nav-research"
              onClick={(e) => { e.preventDefault(); window.location.href = '/' }}
            >
              <img src="https://sosovalue.com/favicon.ico" alt="SoSoValue Logo" width="16" height="16" style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Research Terminal
            </a>

            {/* Utility icons */}
            <div className="larp-nav-socials">
              <span className="larp-nav-util-icon" title="Language">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </span>
              <span className="larp-nav-util-icon" title="Settings">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              </span>
              <span className="larp-nav-util-icon" title="Theme">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Wallet modal */}
      {showWalletModal && (
        <>
          <div className="larp-modal-overlay" onClick={() => setShowWalletModal(false)} />
          <div className="larp-modal">
            <h3 className="larp-modal-title">Connect Wallet</h3>
            <div className="larp-modal-row">
              <input
                type="text"
                className="larp-modal-input"
                placeholder="0x..."
                value={walletInput}
                onChange={e => setWalletInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleWalletSubmit()}
                autoFocus
              />
              <button className="larp-modal-btn" onClick={handleWalletSubmit}>
                Connect
              </button>
            </div>
            {topPerformers.length > 0 && (
              <div className="larp-modal-top-performers">
                <div className="larp-modal-top-title">Top Performers (All Time)</div>
                {topPerformers.map((p, i) => {
                  const pnl = parseFloat(p.pnl_usd || 0)
                  return (
                    <div
                      key={p.wallet_address}
                      className="larp-modal-top-row"
                      onClick={() => { setWallet(p.wallet_address); setShowWalletModal(false) }}
                    >
                      <span className="larp-modal-top-rank">#{i + 1}</span>
                      <span className="larp-modal-top-addr">{truncAddr(p.wallet_address)}</span>
                      <span className={`larp-modal-top-pnl ${pnl >= 0 ? 'larp-green' : 'larp-red'}`}>
                        {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
            {ownWallet && (
              <button
                className="larp-modal-own"
                onClick={() => { setWallet(ownWallet); setShowWalletModal(false) }}
              >
                Use my wallet ({truncAddr(ownWallet)})
              </button>
            )}
            {wallet && (
              <button className="larp-modal-disconnect" onClick={handleDisconnect}>
                Disconnect
              </button>
            )}
          </div>
        </>
      )}

      {/* Page content */}
      <div className={`larp-content${activeView === 'portfolio' ? ' larp-content-portfolio' : ''}${activeView === 'leaderboard' ? ' larp-content-leaderboard' : ''}${activeView === 'vault' ? ' larp-content-vault' : ''}${activeView === 'detector' ? ' larp-content-detector' : ''}`}>
        {activeView === 'trade' && <LarpTrade wallet={wallet} />}
        {activeView === 'portfolio' && <LarpPortfolio wallet={wallet} />}
        {activeView === 'vault' && <LarpVault wallet={wallet} />}
        {activeView === 'leaderboard' && <LarpLeaderboard wallet={wallet} />}
      </div>
    </div>
  )
}
