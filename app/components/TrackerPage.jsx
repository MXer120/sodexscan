'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import MainnetTracker from './MainnetTracker'
import { useWalletTags } from '../hooks/useWalletTags'
import { useSessionContext } from '../lib/SessionContext'
import { configCache, loadPageConfigs, isConfigLoaded } from '../lib/pageConfig'
import SearchAndAddBox from './SearchAndAddBox'
import '../styles/TrackerPage.css'

function TrackerPage() {
  const searchParams = useSearchParams()
  const [searchInput, setSearchInput] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [walletAddress, setWalletAddress] = useState(null)
  const { user, loading: authLoading, openAuthModal } = useSessionContext()
  const { data: tags } = useWalletTags()
  const [configReady, setConfigReady] = useState(isConfigLoaded())

  useEffect(() => {
    if (!isConfigLoaded()) loadPageConfigs().then(() => setConfigReady(true))
  }, [])

  const pagePermission = configReady ? (configCache['/tracker']?.permission || 'anon') : 'anon'
  const needsAuth = pagePermission !== 'anon' && !user

  // ALL hooks MUST be above any conditional return
  useEffect(() => {
    if (!authLoading && needsAuth && openAuthModal) openAuthModal()
  }, [authLoading, needsAuth, openAuthModal])

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

  // Conditional returns AFTER all hooks
  if (authLoading) return null
  if (needsAuth) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', flexDirection: 'column', gap: '16px' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Sign in to access the Scanner</p>
        <button onClick={openAuthModal} style={{ padding: '10px 24px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          Sign In
        </button>
      </div>
    )
  }

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
