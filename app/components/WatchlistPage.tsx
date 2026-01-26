'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useWatchlist, WatchlistItem } from '../hooks/useWatchlist'
import { useSessionContext } from '../lib/SessionContext'
import { COLOR_HEX, GroupColor } from '../lib/walletTags'
import WalletDisplay from './WalletDisplay'
import Auth from './Auth'
import '../styles/WatchlistPage.css'

// Add Wallet Form Component
function AddWalletForm({ onAdd, isAdding }: {
  onAdd: (data: { wallet_address: string }) => Promise<void>
  isAdding: boolean
}) {
  const [walletAddress, setWalletAddress] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedAddress = walletAddress.trim()
    if (!trimmedAddress) {
      setError('Wallet address is required')
      return
    }

    try {
      await onAdd({ wallet_address: trimmedAddress })
      setWalletAddress('')
      console.log('[Watchlist] Added wallet:', trimmedAddress)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add wallet'
      setError(message)
      console.error('[Watchlist] Add error:', message)
    }
  }

  return (
    <form className="add-wallet-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group form-group-address">
          <label htmlFor="wallet-address">Wallet Address</label>
          <input
            id="wallet-address"
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="0x..."
            disabled={isAdding}
          />
        </div>
        <button type="submit" className="add-button" disabled={isAdding}>
          {isAdding ? 'Adding...' : 'Add Wallet'}
        </button>
      </div>
      {error && <div className="form-error">{error}</div>}
    </form>
  )
}

// Watchlist Row Component
function WatchlistRow({
  item,
  onDelete,
  isRemoving,
  onNavigate
}: {
  item: WatchlistItem
  onDelete: (id: number) => void
  isRemoving: boolean
  onNavigate: (address: string) => void
}) {
  const handleDelete = () => {
    if (window.confirm('Remove this wallet from your watchlist?')) {
      onDelete(item.id)
      console.log('[Watchlist] Removed item:', item.id)
    }
  }

  const handleWalletClick = () => {
    onNavigate(item.wallet_address)
  }

  const groupColor = item.wallet_tags?.group_color
    ? COLOR_HEX[item.wallet_tags.group_color as GroupColor] || item.wallet_tags.group_color
    : null

  return (
    <tr>
      <td className="wallet-cell" onClick={handleWalletClick} style={{ cursor: 'pointer' }}>
        <div className="wallet-info">
          <WalletDisplay
            walletAddress={item.wallet_address}
            tagName={item.wallet_tags?.tag_name}
          />
          {item.wallet_tags?.group_name && (
            <span
              className="group-badge"
              style={{
                color: groupColor || '#888',
                borderColor: groupColor || '#888'
              }}
            >
              <span
                className="group-dot"
                style={{ background: groupColor || '#888' }}
              />
              {item.wallet_tags.group_name}
            </span>
          )}
        </div>
      </td>
      <td className="position-cell">
        {item.current_position ? (
          <div className="position-info">
            <span className="position-symbol">{item.current_position.symbol}</span>
            <span
              className={`position-side ${item.current_position.position_side.toLowerCase()}`}
            >
              {item.current_position.position_side}
            </span>
          </div>
        ) : (
          <span className="no-position">-</span>
        )}
      </td>
      <td className="rank-cell">
        {item.leaderboard?.pnl_rank ? `#${item.leaderboard.pnl_rank}` : '-'}
      </td>
      <td className="rank-cell">
        {item.leaderboard?.volume_rank ? `#${item.leaderboard.volume_rank}` : '-'}
      </td>
      <td className="watchlist-date">
        {new Date(item.created_at).toLocaleDateString()}
      </td>
      <td className="actions-cell">
        <button
          className="unwatch-button"
          onClick={handleDelete}
          disabled={isRemoving}
        >
          {isRemoving ? 'Removing...' : 'Unwatch'}
        </button>
      </td>
    </tr>
  )
}

// Search/Filter Component
function SearchFilter({
  value,
  onChange
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="search-filter">
      <input
        type="text"
        placeholder="Search by address..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="search-input"
      />
      {value && (
        <button
          className="clear-search"
          onClick={() => onChange('')}
          type="button"
        >
          Clear
        </button>
      )}
    </div>
  )
}

// Main Watchlist Page Component
export default function WatchlistPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useSessionContext()
  const {
    watchlist,
    isLoading,
    error,
    addToWatchlist,
    isAdding,
    removeFromWatchlistById,
    isRemoving
  } = useWatchlist()

  const [searchTerm, setSearchTerm] = useState('')

  const handleNavigateToTracker = (address: string) => {
    router.push(`/tracker?wallet=${encodeURIComponent(address)}`)
  }

  // Filter watchlist by search term (client-side)
  const filteredWatchlist = useMemo(() => {
    if (!searchTerm.trim()) return watchlist

    const term = searchTerm.toLowerCase()
    return watchlist.filter(item =>
      item.wallet_address.toLowerCase().includes(term) ||
      (item.wallet_tags?.tag_name && item.wallet_tags.tag_name.toLowerCase().includes(term))
    )
  }, [watchlist, searchTerm])

  if (authLoading) {
    return (
      <div className="watchlist-container">
        <div className="loading-state">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="watchlist-container">
        <div className="watchlist-content">
          <h1 className="watchlist-title">Your Watchlist</h1>
          <div className="auth-required">
            <p>Sign in to view and manage your watchlist</p>
            <Auth />
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="watchlist-container">
        <div className="watchlist-content">
          <h1 className="watchlist-title">Your Watchlist</h1>
          <div className="loading-state">Loading watchlist...</div>
        </div>
      </div>
    )
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Watchlist] Load error:', errorMessage)
    return (
      <div className="watchlist-container">
        <div className="watchlist-content">
          <h1 className="watchlist-title">Your Watchlist</h1>
          <div className="error-state">
            Error loading watchlist: {errorMessage}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="watchlist-container">
      <div className="watchlist-content">
        <h1 className="watchlist-title">Your Watchlist</h1>

        <AddWalletForm onAdd={addToWatchlist} isAdding={isAdding} />

        {watchlist.length > 0 && (
          <SearchFilter value={searchTerm} onChange={setSearchTerm} />
        )}

        {watchlist.length === 0 ? (
          <div className="empty-state">
            <p>Your watchlist is empty. Add wallets above to track them.</p>
          </div>
        ) : filteredWatchlist.length === 0 ? (
          <div className="empty-state">
            <p>No wallets match your search.</p>
          </div>
        ) : (
          <div className="watchlist-table-wrapper">
            <table className="watchlist-table">
              <thead>
                <tr>
                  <th>Wallet / Tag / Group</th>
                  <th>Position</th>
                  <th>PnL Rank</th>
                  <th>Volume Rank</th>
                  <th>Added</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWatchlist.map((item) => (
                  <WatchlistRow
                    key={item.id}
                    item={item}
                    onDelete={removeFromWatchlistById}
                    isRemoving={isRemoving}
                    onNavigate={handleNavigateToTracker}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {watchlist.length > 0 && (
          <div className="watchlist-stats">
            {filteredWatchlist.length} of {watchlist.length} wallets
          </div>
        )}
      </div>
    </div>
  )
}
