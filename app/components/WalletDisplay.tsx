'use client'

import React from 'react'

interface WalletDisplayProps {
  walletAddress: string
  tagName?: string | null
  className?: string
  truncate?: boolean
}

export default function WalletDisplay({ walletAddress, tagName, className = '', truncate = false }: WalletDisplayProps) {
  // If tagName is provided, we use it. Otherwise we check if we should truncate.
  const displayText = tagName || (truncate ? truncateAddress(walletAddress) : walletAddress)

  return (
    <span className={`wallet-display ${className}`} title={walletAddress}>
      {displayText}
    </span>
  )
}

export function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
