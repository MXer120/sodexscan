'use client'

import React, { useState, useEffect } from 'react'
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
  const [searchedTagName, setSearchedTagName] = useState(null)
  const [showResults, setShowResults] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const [searchKey, setSearchKey] = useState(0)
  const { user } = useSessionContext()
  const addTag = useAddTag()
  const { data: tags } = useWalletTags()

  // Set document title
  useEffect(() => {
    if (walletAddress) {
      const truncated = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
      document.title = `${truncated} | CommunityScan SoDEX`
    } else {
      document.title = 'Scan | CommunityScan SoDEX'
    }
  }, [walletAddress])

  useEffect(() => {
    document.body.style.overflow = 'auto'
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [])

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
      setShowResults(true) // Immediately show results if params are present
    }
  }, [searchParams, tags])


  const handleSearchResult = ({ wallet_address }) => {
    setSearchedTagName(null)

    // Check if this address has a known tag
    if (tags) {
      const matchedTag = tags.find(t =>
        t.wallet_address.toLowerCase() === wallet_address.toLowerCase()
      )
      if (matchedTag) {
        setSearchedTagName(matchedTag.tag_name)
      }
    }

    setWalletAddress(wallet_address)
    setSearchKey(k => k + 1)
    setShowResults(true)
  }

  return (
    <div className="dashboard scanner-dashboard" style={{
      padding: '0',
      paddingTop: '44px',
      minHeight: '100vh',
      maxWidth: '100%',
      margin: '0',
      boxSizing: 'border-box'
    }}>
      <section className="wallet-finder">
        {/* Mainnet Preview - Show when no search yet */}
        {!showResults && (
          <div className="scanner-grid">
            <div className="section-path">
              <div className="path-breadcrumbs">
                <Link href="/">Home</Link>
                <span>/</span>
                <a href="/tracker">Scanner</a>
                <span>/</span>
                <b>Dashboard</b>
              </div>
              <div className="path-search-wrapper">
                <SearchAndAddBox
                  onAction={handleSearchResult}
                  onSearchChange={setSearchInput}
                  searchValue={searchInput}
                  actionLabel="Search"
                  filterType={filterType}
                  onFilterChange={setFilterType}
                />
              </div>
            </div>

            <aside className="section-sidebar" style={{ background: 'rgba(20,20,20,0.4)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}></aside>

            <div className="section-top-center" style={{
              background: 'rgba(255, 118, 72, 0.05)',
              borderRadius: '8px',
              border: '1px dashed rgba(255, 118, 72, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '40px 20px',
              height: '475px',
              boxSizing: 'border-box'
            }}>
              <h3 style={{ color: '#fff', marginBottom: '12px', fontSize: '20px', fontWeight: '600' }}>Community-Built SoDex Mainnet Scan</h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', maxWidth: '500px', lineHeight: '1.6' }}>
                Enter a wallet address, , referral code, social handle and more above to begin a deep-dive analysis of mainnet trading performance, current positions, and historical activity.
              </p>
            </div>

            <aside className="section-activity" style={{ background: 'rgba(20,20,20,0.4)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}></aside>

            <div className="section-bottom-center" style={{
              background: 'rgba(20,20,20,0.4)',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
            </div>
          </div>
        )}

        {/* Show MainnetTracker when search is triggered */}
        {showResults && walletAddress && (
          <MainnetTracker
            key={searchKey}
            walletAddress={walletAddress}
            searchBox={
              <SearchAndAddBox
                onAction={handleSearchResult}
                onSearchChange={setSearchInput}
                searchValue={searchInput}
                actionLabel="Search"
                filterType={filterType}
                onFilterChange={setFilterType}
              />
            }
            tagSection={user && (
              <div className="tag-section" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
                padding: '12px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.05)',
                width: '100%'
              }}>
                {searchedTagName && (
                  <span style={{
                    color: '#3cc8f0',
                    fontSize: '12px',
                    background: 'rgba(60, 200, 240, 0.1)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid rgba(60, 200, 240, 0.2)'
                  }}>
                    {searchedTagName}
                  </span>
                )}
                {existingTag ? (
                  <span style={{ color: '#4ade80', fontSize: '12px', fontWeight: '500' }}>
                    {existingTag.tag_name}
                  </span>
                ) : showTagInput ? (
                  <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                      placeholder="Add tag..."
                      style={{
                        background: 'rgba(30,30,30,0.8)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        color: '#fff',
                        fontSize: '11px',
                        flex: 1
                      }}
                      autoFocus
                    />
                    <button onClick={handleAddTag} style={{ background: '#4ade8022', border: '1px solid #4ade8044', color: '#4ade80', padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }}>Save</button>
                  </div>
                ) : (
                  <button onClick={() => setShowTagInput(true)} style={{ background: 'transparent', border: '1px dashed rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', width: '100%' }}>
                    + Add Tag
                  </button>
                )}
              </div>
            )}
          />
        )}
      </section>
    </div>
  )
}

export default TrackerPage
