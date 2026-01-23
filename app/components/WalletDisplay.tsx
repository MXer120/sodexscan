'use client'

import React from 'react'

interface WalletDisplayProps {
  walletAddress: string
  tagName?: string | null
  className?: string
}

export default function WalletDisplay({ walletAddress, tagName, className = '' }: WalletDisplayProps) {
  const displayText = tagName || truncateAddress(walletAddress)

  return (
    <span className={`wallet-display ${className}`} title={walletAddress}>
      {displayText}
    </span>
  )
}

function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}
