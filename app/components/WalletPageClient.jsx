'use client'

import React, { useState, useCallback, useEffect } from 'react'
import MainnetTracker from './MainnetTracker'
import { useSessionContext } from '../lib/SessionContext'
import { configCache, loadPageConfigs, isConfigLoaded } from '../lib/pageConfig'

export default function WalletPageClient({ initialAddress }) {
  const [walletAddress, setWalletAddress] = useState(initialAddress)
  const { user, loading: authLoading, openAuthModal } = useSessionContext()
  const [configReady, setConfigReady] = useState(isConfigLoaded())

  useEffect(() => {
    if (!isConfigLoaded()) loadPageConfigs().then(() => setConfigReady(true))
  }, [])

  const pagePermission = configReady ? (configCache['/tracker']?.permission || 'anon') : 'anon'
  const needsAuth = pagePermission !== 'anon' && !user

  useEffect(() => {
    if (!authLoading && needsAuth && openAuthModal) openAuthModal()
  }, [authLoading, needsAuth, openAuthModal])

  const handleWalletChange = useCallback((address) => {
    setWalletAddress(address)
    window.history.replaceState(null, '', `/tracker/${address}`)
  }, [])

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
        onWalletChange={handleWalletChange}
      />
    </div>
  )
}
