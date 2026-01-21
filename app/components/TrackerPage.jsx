'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import MainnetTracker from './MainnetTracker'
import '../styles/TrackerPage.css'

function TrackerPage() {
  const searchParams = useSearchParams()
  const [searchInput, setSearchInput] = useState('')
  const [walletAddress, setWalletAddress] = useState(null)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Handle URL search params
  useEffect(() => {
    const walletParam = searchParams.get('wallet')
    if (walletParam) {
      setSearchInput(walletParam)
      setWalletAddress(walletParam)
    }
  }, [searchParams])

  // Fetch wallet suggestions from leaderboard API
  const fetchSuggestions = async (query) => {
    if (query.length < 4) {
      setSuggestions([])
      return
    }

    try {
      const response = await fetch('/data/mainnet_leaderboard.csv')
      const text = await response.text()
      const lines = text.split('\n').slice(1) // Skip header

      const matches = []
      const search = query.toLowerCase()

      for (const line of lines) {
        if (matches.length >= 10) break
        const match = line.match(/"([^"]+)","([^"]+)","([^"]+)"/)
        if (match) {
          const walletAddr = match[1]
          if (walletAddr.toLowerCase().includes(search)) {
            matches.push({
              address: walletAddr,
              pnl: parseFloat(match[2]) || 0,
              volume: parseFloat(match[3]) || 0
            })
          }
        }
      }

      setSuggestions(matches)
    } catch (error) {
      console.error('Failed to fetch suggestions:', error)
      setSuggestions([])
    }
  }

  const handleInputChange = (value) => {
    setSearchInput(value)
    setShowSuggestions(true)
    if (value.length >= 4) {
      fetchSuggestions(value)
    } else {
      setSuggestions([])
    }
  }

  const handleSuggestionClick = (suggestion) => {
    setSearchInput(suggestion.address)
    setWalletAddress(suggestion.address)
    setShowSuggestions(false)
    setSuggestions([])
  }

  const handleSearch = () => {
    const input = searchInput.trim()
    if (!input) return
    setWalletAddress(input)
    setShowSuggestions(false)
  }

  const formatNumber = (num) => {
    if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(2)}M`
    if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toFixed(2)
  }

  return (
    <div className="dashboard">
      <h1 className="dashboard-title">Wallet Tracker</h1>

      <section className="wallet-finder">
        <div className="search-box" style={{ position: 'relative' }}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Enter wallet address..."
            className="search-input"
          />
          <button onClick={handleSearch} className="search-btn">Search</button>

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '0 0 8px 8px',
              zIndex: 100,
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              {suggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion)}
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #2a2a2a',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#2a2a2a'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div>
                    <span style={{ color: '#fff', fontSize: '13px', fontFamily: 'monospace' }}>
                      {suggestion.address.slice(0, 6)}...{suggestion.address.slice(-4)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                    <span style={{ color: suggestion.pnl >= 0 ? '#4ade80' : '#ef4444' }}>
                      {suggestion.pnl >= 0 ? '+' : ''}${formatNumber(suggestion.pnl)}
                    </span>
                    <span style={{ color: '#888' }}>
                      ${formatNumber(suggestion.volume)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
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
