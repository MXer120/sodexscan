'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import MainnetTracker from './MainnetTracker'
import { useRecordSearch } from '../lib/searchHistory'
import '../styles/TrackerPage.css'

function TrackerPage() {
  const searchParams = useSearchParams()
  const [searchInput, setSearchInput] = useState('')
  const [walletAddress, setWalletAddress] = useState(null)
  const [loading, setLoading] = useState(false)
  const recordSearch = useRecordSearch()

  // Handle URL search params
  useEffect(() => {
    const walletParam = searchParams.get('wallet')
    if (walletParam) {
      setSearchInput(walletParam)
      setWalletAddress(walletParam)
    }
  }, [searchParams])


  const handleSearch = () => {
    const input = searchInput.trim()
    if (!input) return

    // Show button loading state briefly
    setLoading(true)
    setWalletAddress(null)

    // Clear button loading after brief delay (MainnetTracker shows its own loading)
    setTimeout(() => {
      setLoading(false)
    }, 300)

    // Trigger search
    setWalletAddress(input)
    recordSearch(input)
  }

  return (
    <div className="dashboard">
      <h1 className="dashboard-title">Wallet Tracker</h1>

      <section className="wallet-finder">
        <div className="search-box">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && handleSearch()}
            placeholder="Enter wallet address..."
            className="search-input"
            disabled={loading}
          />
          <button
            onClick={handleSearch}
            className="search-btn"
            disabled={loading}
            style={{ opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {loading && <div className="loading">Loading...</div>}

        {/* Mainnet Preview - Show when no search yet */}
        {!walletAddress && !loading && (
          <div style={{
            padding: '60px 40px',
            textAlign: 'center',
            background: 'rgba(60, 200, 240, 0.05)',
            borderRadius: '12px',
            border: '1px dashed rgba(60, 200, 240, 0.3)',
            marginTop: '20px'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px', opacity: 0.6 }}>🌐</div>
            <h3 style={{ color: '#fff', marginBottom: '12px', fontSize: '20px' }}>Mainnet Wallet Tracker</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', maxWidth: '500px', margin: '0 auto' }}>
              Search for a wallet address above to view mainnet trading activity, positions, and performance metrics.
            </p>
          </div>
        )}

        {/* Show MainnetTracker when wallet searched */}
        {walletAddress && (
          <div className="wallet-details">
            <MainnetTracker walletAddress={walletAddress} />
          </div>
        )}
      </section>
    </div>
  )
}

export default TrackerPage
