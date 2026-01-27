'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import TopPairs from './TopPairs'
import SearchAndAddBox from './SearchAndAddBox'
import '../styles/MainnetPage.css'

function LandingPage() {
  const [searchInput, setSearchInput] = useState('')
  const router = useRouter()

  const [filterType, setFilterType] = useState('all')

  const handleSearch = () => {
    const input = searchInput.trim()
    if (!input) return
    router.push(`/tracker?wallet=${encodeURIComponent(input)}`)
  }

  return (
    <div className="landing-page" style={{ padding: '40px', paddingTop: '100px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Wallet Search Box */}
      <div className="landing-search-box" style={{
        marginBottom: '40px',
        padding: '40px',
        background: 'rgba(255, 118, 72, 0.05)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 118, 72, 0.2)',
        textAlign: 'center'
      }}>
        <h2 style={{ color: '#fff', marginBottom: '16px', fontSize: '24px' }}>Community-Built SoDex Mainnet Scan</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '24px', fontSize: '14px' }}>
          Search any wallet to view trading activity, positions, and performance metrics
        </p>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <SearchAndAddBox
            onAction={({ wallet_address }) => router.push(`/tracker?wallet=${encodeURIComponent(wallet_address)}`)}
            actionLabel="Search"
            filterType={filterType}
            onFilterChange={setFilterType}
          />
        </div>
      </div>

      <TopPairs />
    </div>
  )
}

export default LandingPage
