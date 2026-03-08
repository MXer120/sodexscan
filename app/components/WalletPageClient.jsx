'use client'

import React, { useState, useCallback } from 'react'
import MainnetTracker from './MainnetTracker'

export default function WalletPageClient({ initialAddress }) {
  const [walletAddress, setWalletAddress] = useState(initialAddress)

  const handleWalletChange = useCallback((address) => {
    setWalletAddress(address)
    window.history.replaceState(null, '', `/tracker/${address}`)
  }, [])

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
