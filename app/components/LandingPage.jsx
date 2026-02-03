'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import TopPairs from './TopPairs'
import SearchAndAddBox from './SearchAndAddBox'
import SignUpCTA from './SignUpCTA'
import '../styles/MainnetPage.css'

function LandingPage() {
  const [searchInput, setSearchInput] = useState('')
  const router = useRouter()

  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    document.title = 'Home | CommunityScan SoDEX'
  }, [])

  const handleSearch = () => {
    const input = searchInput.trim()
    if (!input) return
    router.push(`/tracker?wallet=${encodeURIComponent(input)}`)
  }

  return (
    <div className="landing-page dashboard">
      {/* Wallet Search Box */}
      <div className="landing-search-box" style={{
        marginBottom: '40px',
        padding: '40px 20px',
        background: 'rgba(var(--color-primary-rgb), 0.05)',
        borderRadius: '8px',
        border: '1px dashed rgba(var(--color-primary-rgb), 0.3)',
        textAlign: 'center',
        position: 'relative',
        height: '475px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box'
      }}>
        <h2 style={{ color: 'var(--color-text-main)', marginBottom: '12px', fontSize: '20px', fontWeight: '600' }}>Community-Built SoDex Mainnet Scan</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '14px', maxWidth: '500px', lineHeight: '1.6' }}>
          Enter any wallet address, referral code, or social handle above to begin a deep-dive analysis of mainnet trading performance, current positions, and historical activity.
        </p>
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', justifyContent: 'center', width: '100%' }}>
          <SearchAndAddBox
            onAction={({ wallet_address }) => router.push(`/tracker/${wallet_address}`)}
            onSearchChange={setSearchInput}
            searchValue={searchInput}
            actionLabel="Scan"
            filterType={filterType}
            onFilterChange={setFilterType}
          />
        </div>
      </div>

      <TopPairs />

      <SignUpCTA />
    </div>
  )
}

export default LandingPage
