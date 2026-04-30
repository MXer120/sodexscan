'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ExternalLink, Wallet as WalletIcon, ChevronDown, X } from 'lucide-react'
import { cn } from '@/app/lib/utils'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { useSessionContext } from '../../lib/SessionContext'
import { supabase } from '../../lib/supabaseClient'
import LarpTrade from './LarpTrade'
import LarpPortfolio from './LarpPortfolio'
import LarpVault from './LarpVault'
import LarpLeaderboard from './LarpLeaderboard'
import '../../styles/LarpPage.css'

const SODEX_EXTERNAL = {
  rewards: 'https://sodex.com/points',
  referrals: 'https://sodex.com/referrals',
  staking: 'https://sodex.com/stake',
}

export default function LarpPage() {
  const { user } = useSessionContext()
  const [activeView, setActiveView] = useState('trade')
  const [wallet, setWallet] = useState('')
  const [walletInput, setWalletInput] = useState('')
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [fromScanner, setFromScanner] = useState(false)
  const [ownWallet, setOwnWallet] = useState(null)
  const [openDropdown, setOpenDropdown] = useState(null)
  const [topPerformers, setTopPerformers] = useState([])
  const dropdownRef = useRef(null)

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

  const navItems: Array<{
    key: string
    label: string
    internal?: boolean
    href?: string
    badge?: string
    hasDropdown?: boolean
    children?: Array<{ key?: string; label: string; href?: string; internal?: boolean }>
  }> = [
    { key: 'trade', label: 'Trade', internal: true },
    { key: 'vault', label: 'Vault', internal: true },
    { key: 'portfolio', label: 'Portfolio', internal: true },
    { key: 'leaderboard', label: 'Leaderboard', internal: true },
  ]

  const externalLinks = [
    { key: 'rewards', label: 'Rewards', href: SODEX_EXTERNAL.rewards },
    { key: 'referrals', label: 'Referrals', href: SODEX_EXTERNAL.referrals },
    { key: 'staking', label: 'Staking', href: SODEX_EXTERNAL.staking },
    { key: 'detector', label: 'Larp Detector', href: '/larp-detector' },
  ]

  return (
    <div className="larp-frame-shell p-4 sm:p-6 space-y-4">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">SoDEX Sandbox</h1>
          <p className="text-sm text-muted-foreground">
            Mock SoDEX trading interface — connect a wallet to view portfolio, leaderboard, and vaults.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {fromScanner && wallet && (
            <Button asChild variant="ghost" size="sm">
              <a href={`/tracker/${wallet}`}>← Back to Scanner</a>
            </Button>
          )}
          <Button onClick={() => setShowWalletModal(true)} variant={wallet ? 'outline' : 'default'} size="sm">
            <WalletIcon className="size-4 mr-2" />
            {wallet ? truncAddr(wallet) : 'Connect Wallet'}
          </Button>
        </div>
      </div>

      {/* Tab strip + external links */}
      <div className="rounded-xl border bg-card overflow-hidden" ref={dropdownRef}>
        <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => handleNavClick(item.key)}
              className={cn(
                'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                activeView === item.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {item.label}
            </button>
          ))}
          <div className="flex-1" />
          <div className="flex flex-wrap items-center gap-1">
            {externalLinks.map(link => (
              <a
                key={link.key}
                href={link.href}
                target={link.href.startsWith('http') ? '_blank' : undefined}
                rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {link.label}
                {link.href.startsWith('http') && <ExternalLink className="size-3 opacity-60" />}
              </a>
            ))}
          </div>
        </div>

        {/* Page content */}
        <div
          className={cn(
            'larp-content-shell',
            activeView === 'portfolio' && 'larp-content-portfolio',
            activeView === 'leaderboard' && 'larp-content-leaderboard',
            activeView === 'vault' && 'larp-content-vault',
          )}
        >
          {activeView === 'trade' && <LarpTrade wallet={wallet} />}
          {activeView === 'portfolio' && <LarpPortfolio wallet={wallet} />}
          {activeView === 'vault' && <LarpVault wallet={wallet} />}
          {activeView === 'leaderboard' && <LarpLeaderboard wallet={wallet} />}
        </div>
      </div>

      {/* Wallet modal */}
      {showWalletModal && (
        <>
          <div
            className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm"
            onClick={() => setShowWalletModal(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-[9999] w-[min(420px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-popover text-popover-foreground p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">Connect Wallet</h3>
              <Button variant="ghost" size="icon-sm" onClick={() => setShowWalletModal(false)} aria-label="Close">
                <X className="size-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="0x..."
                value={walletInput}
                onChange={e => setWalletInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleWalletSubmit()}
                autoFocus
              />
              <Button onClick={handleWalletSubmit}>Connect</Button>
            </div>

            {topPerformers.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="text-xs text-muted-foreground font-medium">Top Performers (All Time)</div>
                <div className="rounded-lg border bg-card overflow-hidden">
                  {topPerformers.map((p, i) => {
                    const pnl = parseFloat(p.pnl_usd || 0)
                    return (
                      <button
                        key={p.wallet_address}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted transition-colors text-left border-b last:border-0"
                        onClick={() => { setWallet(p.wallet_address); setShowWalletModal(false) }}
                      >
                        <span className="text-xs text-muted-foreground w-6">#{i + 1}</span>
                        <span className="text-xs font-mono text-foreground flex-1">{truncAddr(p.wallet_address)}</span>
                        <span className={cn('text-xs font-semibold', pnl >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                          {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {ownWallet && (
              <Button
                variant="outline"
                className="w-full mt-3"
                onClick={() => { setWallet(ownWallet); setShowWalletModal(false) }}
              >
                Use my wallet ({truncAddr(ownWallet)})
              </Button>
            )}
            {wallet && (
              <Button
                variant="outline"
                className="w-full mt-2 text-red-500 border-red-500/30 hover:bg-red-500/10"
                onClick={handleDisconnect}
              >
                Disconnect
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
