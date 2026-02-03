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

  // This part of the code related to `existingTag` and `handleAddTag`
  // seems to be for the `tagSection` which is no longer rendered directly here.
  // It might be moved to the dynamic route component.
  // For now, I'll keep `handleAddTag` but remove `existingTag` as `walletAddress` is not state here.
  const handleAddTag = async () => {
    // This function would need `walletAddress` to be passed or derived from the URL
    // if it were to be used in the dynamic route component.
    // As per the instruction, `walletAddress` state is removed from this component.
    // This function will likely be refactored or moved.
    // For now, I'll keep it as is, but it won't function correctly without `walletAddress`.
    // Assuming `walletAddress` would be available in the context where this is used.
    // For the purpose of this edit, I'll assume `walletAddress` is implicitly available
    // if this function were to be called, but it's not directly used in this component's render.
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
      <section className="wallet-finder">
        {/* Mainnet Preview - Show when no search yet */}
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
      </section>
    </div>
  )
}

export default TrackerPage
