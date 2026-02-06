'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import MainnetTracker from './MainnetTracker'
import { useAddTag, useWalletTags } from '../hooks/useWalletTags'
import { useSessionContext } from '../lib/SessionContext'
import SearchAndAddBox from './SearchAndAddBox'
import '../styles/TrackerPage.css'

function TrackerPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [searchInput, setSearchInput] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [tagInput, setTagInput] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const { user } = useSessionContext()
  const addTag = useAddTag()
  const { data: tags } = useWalletTags()

  // Set document title
  useEffect(() => {
    document.title = 'Scan | CommunityScan SoDEX'
  }, [])

  useEffect(() => {
    document.body.style.overflow = 'auto'
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [])


  const handleAddTag = async () => {
    if (!tagInput.trim()) return // Removed !walletAddress check as walletAddress state is gone
    // await addTag.mutateAsync({ wallet: walletAddress, name: tagInput.trim() }) // walletAddress is undefined here
    setTagInput('')
    setShowTagInput(false)
  }

  // Handle URL search params - Redirect to dynamic route if wallet is present
  useEffect(() => {
    const walletParam = searchParams.get('wallet')
    const tagParam = searchParams.get('tag')

    if (tagParam && tags) {
      const matchedTag = tags.find(t =>
        t.tag_name.toLowerCase() === tagParam.toLowerCase()
      )
      if (matchedTag) {
        router.push(`/tracker/${matchedTag.wallet_address}`)
      }
    } else if (walletParam) {
      router.push(`/tracker/${walletParam}`)
    }
  }, [searchParams, tags, router])


  const handleSearchResult = ({ wallet_address }) => {
    // When searching, redirect to the dynamic route
    router.push(`/tracker/${wallet_address}`)
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
              actionLabel="Scan"
              filterType={filterType}
              onFilterChange={setFilterType}
            />
          </div>
        </div>

        <aside className="section-sidebar" style={{ background: 'var(--color-bg-card)', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}></aside>

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
          <h3 style={{ color: 'var(--color-text-main)', marginBottom: '12px', fontSize: '20px', fontWeight: '600' }}>Community-Built SoDex Mainnet Scan</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', maxWidth: '500px', lineHeight: '1.6' }}>
            Enter a wallet address, referral code, or social handle above to begin a deep-dive analysis of mainnet trading performance, current positions, and historical activity.
          </p>
        </div>

        <aside className="section-activity" style={{ background: 'var(--color-bg-card)', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}></aside>

        <div className="section-bottom-center" style={{
          background: 'var(--color-bg-card)',
          borderRadius: '8px',
          border: '1px solid var(--color-border-subtle)'
        }}>
        </div>
      </div>
    </div>
  )
}

export default TrackerPage
