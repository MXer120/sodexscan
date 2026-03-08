'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import MainnetTracker from './MainnetTracker'
import { useWalletTags } from '../hooks/useWalletTags'
import { useSessionContext } from '../lib/SessionContext'
import SearchAndAddBox from './SearchAndAddBox'
import '../styles/TrackerPage.css'

function TrackerPage() {
  const searchParams = useSearchParams()
  const [searchInput, setSearchInput] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [walletAddress, setWalletAddress] = useState(null)
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
      if (matchedTag) setWalletAddress(matchedTag.wallet_address)
    } else if (walletParam) {
      setWalletAddress(walletParam)
    }
  }, [searchParams, tags])

  const handleWalletChange = useCallback((address) => {
    setWalletAddress(address)
    setSearchInput('')
    window.history.replaceState(null, '', `/tracker/${address}`)
  }, [])

  const handleSearchResult = useCallback(({ wallet_address }) => {
    handleWalletChange(wallet_address)
  }, [handleWalletChange])

  // Build search box to pass into MainnetTracker
  const sharedSearchBox = (
    <SearchAndAddBox
      onAction={handleSearchResult}
      onSearchChange={setSearchInput}
      searchValue={searchInput}
      actionLabel="Scan"
      filterType={filterType}
      onFilterChange={setFilterType}
    />
  )

  // Always render MainnetTracker — it handles its own loading/empty states
  // walletAddress=null means MainnetTracker won't fetch, but keeps DOM stable
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

export default TrackerPage
