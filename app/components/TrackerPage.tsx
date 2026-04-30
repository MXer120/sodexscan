'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import MainnetTracker from './MainnetTracker'
import { useWalletTags } from '../hooks/useWalletTags'
import SearchAndAddBox, { FilterType } from './SearchAndAddBox'
import '../styles/TrackerPage.css'

function TrackerPage() {
  const searchParams = useSearchParams()
  const [searchInput, setSearchInput] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [walletAddress, setWalletAddress] = useState(null)
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

  useEffect(() => {
    const walletParam = searchParams.get('wallet')
    const tagParam = searchParams.get('tag')
    if (tagParam && tags) {
      const matchedTag = tags.find(t => t.tag_name.toLowerCase() === tagParam.toLowerCase())
      if (matchedTag) setWalletAddress(matchedTag.wallet_address)
    } else if (walletParam) {
      setWalletAddress(walletParam)
    }
  }, [searchParams, tags])

  const handleWalletChange = useCallback((address) => {
    setWalletAddress(address)
    setSearchInput('')
    if (address) window.history.replaceState(null, '', `/tracker/${address}`)
  }, [])

  const handleSearchResult = useCallback(({ wallet_address }) => {
    handleWalletChange(wallet_address)
  }, [handleWalletChange])

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

  return (
    <div className="scanner-dashboard" style={{
      height: '100%',
      maxWidth: '100%',
      overflow: 'hidden',
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
