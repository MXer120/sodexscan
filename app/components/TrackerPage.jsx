'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import MainnetTracker from './MainnetTracker'
import { useAddTag, useWalletTags } from '../hooks/useWalletTags'
import { useSessionContext } from '../lib/SessionContext'
import SearchAndAddBox from './SearchAndAddBox'
import '../styles/TrackerPage.css'

function TrackerPage() {
  const searchParams = useSearchParams()
  const [searchInput, setSearchInput] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [walletAddress, setWalletAddress] = useState(null)
  const [isScanning, setIsScanning] = useState(false)
  const { user } = useSessionContext()
  const { data: tags } = useWalletTags()

  useEffect(() => {
    document.title = walletAddress
      ? `Wallet ${walletAddress.slice(0, 6)}... | CommunityScan SoDEX`
      : 'Scan | CommunityScan SoDEX'
  }, [walletAddress])

  useEffect(() => {
    document.body.style.overflow = 'auto'
    return () => { document.body.style.overflow = 'auto' }
  }, [])

  // Handle URL search params on mount
  useEffect(() => {
    const walletParam = searchParams.get('wallet')
    const tagParam = searchParams.get('tag')

    if (tagParam && tags) {
      const matchedTag = tags.find(t =>
        t.tag_name.toLowerCase() === tagParam.toLowerCase()
      )
      if (matchedTag) {
        setWalletAddress(matchedTag.wallet_address)
      }
    } else if (walletParam) {
      setWalletAddress(walletParam)
    }
  }, [searchParams, tags])

  const handleScanStart = useCallback(() => {
    setIsScanning(true)
  }, [])

  const handleWalletChange = useCallback((address) => {
    setIsScanning(false)
    setWalletAddress(address)
    setSearchInput('')
    // Update URL without navigation
    window.history.replaceState(null, '', `/tracker/${address}`)
  }, [])

  const handleSearchResult = useCallback(({ wallet_address }) => {
    handleWalletChange(wallet_address)
  }, [handleWalletChange])

  const handleReset = useCallback(() => {
    setWalletAddress(null)
    setIsScanning(false)
    window.history.replaceState(null, '', '/tracker')
  }, [])

  // Build search box to pass into MainnetTracker
  const sharedSearchBox = (
    <SearchAndAddBox
      onAction={handleSearchResult}
      onScanStart={handleScanStart}
      isActionLoading={isScanning}
      onSearchChange={setSearchInput}
      searchValue={searchInput}
      actionLabel="Scan"
      filterType={filterType}
      onFilterChange={setFilterType}
    />
  )

  // Wallet is loaded — render MainnetTracker inline, no page transition
  if (walletAddress) {
    return (
      <div className="dashboard scanner-dashboard" style={{
        padding: '0',
        paddingTop: '44px',
        minHeight: '100vh',
        maxWidth: '100%',
        margin: '0',
        boxSizing: 'border-box'
      }}>
        <MainnetTracker
          walletAddress={walletAddress}
          searchBox={sharedSearchBox}
          onWalletChange={handleWalletChange}
        />
      </div>
    )
  }

  // Empty state or scanning skeleton
  return (
    <div className="dashboard scanner-dashboard" style={{
      padding: '0',
      paddingTop: '44px',
      minHeight: '100vh',
      maxWidth: '100%',
      margin: '0',
      boxSizing: 'border-box'
    }}>
      <div className="scanner-grid">
        <div className="section-path">
          <div className="path-breadcrumbs">
            <Link href="/">Home</Link>
            <span>/</span>
            <a href="/tracker" onClick={(e) => { e.preventDefault(); handleReset() }}>Scanner</a>
            <span>/</span>
            <b>Dashboard</b>
          </div>
          <div className="path-search-wrapper">
            {sharedSearchBox}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="section-sidebar" style={{ background: 'var(--color-bg-card)', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}>
          {isScanning && (
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ width: '100px', height: '18px', marginBottom: '6px' }}></div>
                    <div className="skeleton" style={{ width: '140px', height: '14px', opacity: 0.6 }}></div>
                  </div>
                  <div className="skeleton" style={{ width: '70px', height: '22px', borderRadius: '4px' }}></div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                  <div className="skeleton" style={{ flex: 1, height: '28px', borderRadius: '6px' }}></div>
                  <div className="skeleton" style={{ flex: 1, height: '28px', borderRadius: '6px' }}></div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className="skeleton" style={{ width: '90px', height: '10px', opacity: 0.5 }}></div>
                  <div className="skeleton" style={{ width: '120px', height: '28px' }}></div>
                </div>
              </div>
              <div style={{ height: '1px', background: 'var(--color-border-subtle)', margin: '14px 0' }} />
              {[1, 2, 3].map(s => (
                <React.Fragment key={s}>
                  <div style={{ marginBottom: '0' }}>
                    <div className="skeleton" style={{ width: `${60 + s * 20}px`, height: '12px', marginBottom: '12px', opacity: 0.8 }}></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {[1, 2, 3].map(i => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div className="skeleton" style={{ width: '65px', height: '11px', opacity: 0.5 }}></div>
                          <div className="skeleton" style={{ width: '55px', height: '11px' }}></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {s < 3 && <div style={{ height: '1px', background: 'var(--color-border-subtle)', margin: '14px 0' }} />}
                </React.Fragment>
              ))}
            </div>
          )}
        </aside>

        {/* Center area */}
        <div className="section-top-center" style={{
          background: 'rgba(var(--color-primary-rgb), 0.05)',
          borderRadius: '8px',
          border: '1px dashed rgba(var(--color-primary-rgb), 0.3)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '40px 20px',
          height: '475px',
          boxSizing: 'border-box'
        }}>
          {isScanning ? (
            <>
              <h3 style={{ color: 'var(--color-text-main)', marginBottom: '12px', fontSize: '20px', fontWeight: '600' }}>Scanning Mainnet Wallet...</h3>
              <div className="loading-progress-container" style={{ maxWidth: 'calc(100% - 40px)' }}>
                <div className="loading-progress-bar" style={{ width: '30%', transition: 'width 0.3s ease' }}></div>
              </div>
              <p className="loading-step-text" style={{ height: '20px' }}>Resolving wallet...</p>
            </>
          ) : (
            <>
              <h3 style={{ color: 'var(--color-text-main)', marginBottom: '12px', fontSize: '20px', fontWeight: '600' }}>Community-Built SoDex Mainnet Scan</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', maxWidth: '500px', lineHeight: '1.6' }}>
                Enter a wallet address, referral code, or social handle above to begin a deep-dive analysis of mainnet trading performance, current positions, and historical activity.
              </p>
            </>
          )}
        </div>

        {/* Activity sidebar */}
        <aside className="section-activity" style={{ background: 'var(--color-bg-card)', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}>
          {isScanning && (
            <div style={{ padding: '20px' }}>
              <div className="skeleton" style={{ width: '130px', height: '18px', marginBottom: '24px' }}></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingBottom: '12px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div className="skeleton skeleton-circle" style={{ width: '18px', height: '18px' }}></div>
                        <div className="skeleton" style={{ width: '100px', height: '12px' }}></div>
                      </div>
                      <div className="skeleton" style={{ width: '40px', height: '10px', opacity: 0.3 }}></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '28px' }}>
                      <div className="skeleton" style={{ width: '60px', height: '10px', opacity: 0.4 }}></div>
                      <div className="skeleton" style={{ width: '45px', height: '10px', opacity: 0.5 }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Bottom table */}
        <div className="section-bottom-center" style={{
          background: 'var(--color-bg-card)',
          borderRadius: '8px',
          border: '1px solid var(--color-border-subtle)',
          padding: isScanning ? '0' : undefined
        }}>
          {isScanning && (
            <>
              <div style={{ padding: '16px 16px 0 16px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                <div style={{ display: 'flex', gap: '24px' }}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="skeleton" style={{ height: '32px', width: '70px', borderRadius: '4px 4px 0 0' }}></div>
                  ))}
                </div>
              </div>
              <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  {[120, 60, 80, 80, 80, 80, 80].map((w, i) => (
                    <div key={i} className="skeleton" style={{ width: `${w}px`, height: '14px' }}></div>
                  ))}
                </div>
              </div>
              <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--color-border-subtle)', opacity: 0.6 }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <div className="skeleton skeleton-circle" style={{ width: '18px', height: '18px' }}></div>
                      <div className="skeleton" style={{ width: '100px', height: '12px' }}></div>
                    </div>
                    {[60, 70, 70, 70, 70, 70].map((w, j) => (
                      <div key={j} className="skeleton" style={{ width: `${w}px`, height: '14px' }}></div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default TrackerPage
