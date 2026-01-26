'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import TopPairs from './TopPairs'
import '../styles/MainnetPage.css'

function LandingPage() {
  const [searchInput, setSearchInput] = useState('')
  const router = useRouter()

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
        <div className="landing-search-inputs" style={{ display: 'flex', gap: '12px', maxWidth: '600px', margin: '0 auto' }}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Enter wallet address..."
            style={{
              flex: 1,
              background: 'rgba(20, 20, 20, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              padding: '14px 18px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              background: 'rgba(255, 118, 72, 0.15)',
              border: '1px solid rgba(255, 118, 72, 0.3)',
              color: '#FF7648',
              padding: '14px 28px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Search
          </button>
        </div>
      </div>

      <TopPairs />
    </div>
  )
}

export default LandingPage
