'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import MainnetTracker from './MainnetTracker'
import { useRecordSearch } from '../lib/searchHistory'
import { useAddTag, useWalletTags } from '../hooks/useWalletTags'
import { useSessionContext } from '../lib/SessionContext'
import SearchAndAddBox from './SearchAndAddBox'
import '../styles/TrackerPage.css'

function TrackerPage() {
  const searchParams = useSearchParams()
  const [searchInput, setSearchInput] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [walletAddress, setWalletAddress] = useState(null)
  const [searchedTagName, setSearchedTagName] = useState(null)
  const [loading, setLoading] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const recordSearch = useRecordSearch()
  const { user } = useSessionContext()
  const addTag = useAddTag()
  const { data: tags } = useWalletTags()

  const existingTag = tags?.find(t => t.wallet_address === walletAddress)

  const handleAddTag = async () => {
    if (!tagInput.trim() || !walletAddress) return
    await addTag.mutateAsync({ wallet: walletAddress, name: tagInput.trim() })
    setTagInput('')
    setShowTagInput(false)
  }

  // Handle URL search params
  useEffect(() => {
    const walletParam = searchParams.get('wallet')
    const tagParam = searchParams.get('tag')

    if (tagParam && tags) {
      // Search by tag name
      const matchedTag = tags.find(t =>
        t.tag_name.toLowerCase() === tagParam.toLowerCase()
      )
      if (matchedTag) {
        setSearchInput(tagParam)
        setWalletAddress(matchedTag.wallet_address)
        setSearchedTagName(matchedTag.tag_name)
      }
    } else if (walletParam) {
      setSearchInput(walletParam)
      setWalletAddress(walletParam)
      setSearchedTagName(null)
    }
  }, [searchParams, tags])


  const handleSearchResult = ({ wallet_address }) => {
    // Show button loading state briefly
    setLoading(true)
    setWalletAddress(null)
    setSearchedTagName(null)

    // Clear button loading after brief delay
    setTimeout(() => {
      setLoading(false)
    }, 300)

    // Check if this address has a known tag to display
    if (tags) {
      const matchedTag = tags.find(t =>
        t.wallet_address.toLowerCase() === wallet_address.toLowerCase()
      )
      if (matchedTag) {
        setSearchedTagName(matchedTag.tag_name)
      }
    }

    setWalletAddress(wallet_address)
    recordSearch(wallet_address)
  }

  return (
    <div className="dashboard">
      <h1 className="dashboard-title">Wallet Scan</h1>

      <section className="wallet-finder">
        <div className="search-box-wrapper" style={{ marginBottom: '20px' }}>
          <SearchAndAddBox
            onAction={handleSearchResult}
            isActionLoading={loading}
            onSearchChange={setSearchInput}
            searchValue={searchInput}
            actionLabel={loading ? 'Searching...' : 'Search'}
            filterType={filterType}
            onFilterChange={setFilterType}
          />
        </div>

        {loading && <div className="loading">Loading...</div>}

        {/* Mainnet Preview - Show when no search yet */}
        {!walletAddress && !loading && (
          <div style={{
            padding: '60px 40px',
            textAlign: 'center',
            background: 'rgba(255, 118, 72, 0.05)',
            borderRadius: '12px',
            border: '1px dashed rgba(255, 118, 72, 0.3)',
            marginTop: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <h3 style={{ color: '#fff', marginBottom: '12px', fontSize: '20px' }}>SoDex Mainnet Scan</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', maxWidth: '500px', margin: '0 auto' }}>
              Search for a wallet address above to view mainnet trading activity, positions, and performance metrics.
            </p>
          </div>
        )}

        {/* Show MainnetTracker when wallet searched */}
        {walletAddress && (
          <div className="wallet-details">
            {/* Tag section for logged-in users */}
            {user && (
              <div className="tag-section" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
                padding: '12px 16px',
                background: 'rgba(20, 20, 20, 0.4)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.08)',
                flexWrap: 'wrap'
              }}>
                {searchedTagName && (
                  <span style={{
                    color: '#3cc8f0',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(60, 200, 240, 0.1)',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: '1px solid rgba(60, 200, 240, 0.2)'
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                      <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                    {searchedTagName}
                  </span>
                )}
                {existingTag ? (
                  <span style={{ color: '#4ade80', fontSize: '14px' }}>
                    Tagged as: <strong>{existingTag.tag_name}</strong>
                  </span>
                ) : showTagInput ? (
                  <>
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                      placeholder="Enter tag name..."
                      style={{
                        background: 'rgba(30, 30, 30, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: '#fff',
                        fontSize: '13px',
                        width: '160px'
                      }}
                      autoFocus
                    />
                    <button
                      onClick={handleAddTag}
                      disabled={addTag.isPending || !tagInput.trim()}
                      style={{
                        background: 'rgba(74, 222, 128, 0.15)',
                        border: '1px solid rgba(74, 222, 128, 0.3)',
                        color: '#4ade80',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: addTag.isPending ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        opacity: addTag.isPending ? 0.6 : 1
                      }}
                    >
                      {addTag.isPending ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => { setShowTagInput(false); setTagInput('') }}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#888',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowTagInput(true)}
                    style={{
                      background: 'rgba(60, 200, 240, 0.1)',
                      border: '1px solid rgba(60, 200, 240, 0.2)',
                      color: '#3cc8f0',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                      <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                    Add Tag
                  </button>
                )}
              </div>
            )}
            <MainnetTracker walletAddress={walletAddress} />
          </div>
        )}
      </section>
    </div>
  )
}

export default TrackerPage
