'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWatchlist, WatchlistItem } from '../hooks/useWatchlist'
import { useSessionContext } from '../lib/SessionContext'
import { COLOR_HEX, GroupColor, fetchUserTags, WalletTag } from '../lib/walletTags'
import WalletDisplay from './WalletDisplay'
import SearchAndAddBox from './SearchAndAddBox'
import Auth from './Auth'
import '../styles/WatchlistPage.css'

type FilterType = 'all' | 'address' | 'tag'

// Set document title
if (typeof document !== 'undefined') {
  document.title = 'Watchlist | CommunityScan SoDEX'
}



// Watchlist Row Component
function WatchlistRow({
  item,
  onDelete,
  isRemoving,
  onNavigate,
  showAddedTime
}: {
  item: WatchlistItem
  onDelete: (id: number) => void
  isRemoving: boolean
  onNavigate: (address: string) => void
  showAddedTime: boolean
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
    <tr className="watchlist-row">
      <td className="wallet-cell" onClick={handleWalletClick}>
        <div className="wallet-info">
          {item.wallet_tags?.tag_name ? (
            <div className="tag-display-wrapper">
              <span className="tag-name-main">{item.wallet_tags.tag_name}</span>
              {item.wallet_tags.group_name && (
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
          ) : (
            <WalletDisplay
              walletAddress={item.wallet_address}
              tagName={item.wallet_tags?.tag_name}
              truncate={true}
            />
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
        {item.leaderboard?.pnl_rank != null ? `#${item.leaderboard.pnl_rank}` : <span className="no-rank">-</span>}
      </td>
      <td className="rank-cell">
        {item.leaderboard?.volume_rank != null ? `#${item.leaderboard.volume_rank}` : <span className="no-rank">-</span>}
      </td>
      {showAddedTime && (
        <td className="watchlist-date">
          {new Date(item.created_at).toLocaleDateString()}
        </td>
      )}
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
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [showAddedTime, setShowAddedTime] = useState(false)

  const handleNavigateToTracker = (address: string) => {
    router.push(`/tracker?wallet=${encodeURIComponent(address)}`)
  }

  // Filter watchlist by search term and filter type
  const filteredWatchlist = useMemo(() => {
    if (!searchTerm.trim()) return watchlist

    const term = searchTerm.toLowerCase()
    return watchlist.filter(item => {
      if (filterType === 'address') {
        return item.wallet_address.toLowerCase().includes(term)
      } else if (filterType === 'tag') {
        return item.wallet_tags?.tag_name && item.wallet_tags.tag_name.toLowerCase().includes(term)
      } else {
        // 'all' filter
        return item.wallet_address.toLowerCase().includes(term) ||
          (item.wallet_tags?.tag_name && item.wallet_tags.tag_name.toLowerCase().includes(term))
      }
    })
  }, [watchlist, searchTerm, filterType])

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

        <SearchAndAddBox
          onAction={async (data) => {
            await addToWatchlist(data)
            setSearchTerm('')
          }}
          isActionLoading={isAdding}
          onSearchChange={setSearchTerm}
          searchValue={searchTerm}
          filterType={filterType}
          onFilterChange={(type: FilterType) => setFilterType(type)}
          actionLabel="Add to Watchlist"
        />

        {watchlist.length > 0 && (
          <div className="watchlist-controls">
            <label className="toggle-item">
              <input
                type="checkbox"
                checked={showAddedTime}
                onChange={(e) => setShowAddedTime(e.target.checked)}
              />
              <span className="custom-checkbox">
                <svg viewBox="0 0 24 24" fill="none">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span className="toggle-label">Show Added Time</span>
            </label>
          </div>
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
                  {showAddedTime && <th>Added</th>}
                  <th className="actions-header">Actions</th>
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
                    showAddedTime={showAddedTime}
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
