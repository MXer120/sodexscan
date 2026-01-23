'use client'

import React from 'react'
import { useWatchlist } from '../hooks/useWatchlist'
import WalletDisplay from './WalletDisplay'
import '../styles/WatchlistPage.css'

export default function WatchlistPage() {
  const { watchlist, isLoading, error, removeFromWatchlist, isRemoving } = useWatchlist()

  if (isLoading) {
    return (
      <div className="watchlist-container">
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
          Loading watchlist...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="watchlist-container">
        <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
          Error loading watchlist: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    )
  }

  return (
    <div className="watchlist-container">
      <div className="watchlist-content">
        <h1 className="watchlist-title">Your Watchlist</h1>

        {watchlist.length === 0 ? (
          <div className="empty-state">
            <p>Your watchlist is empty. Add wallets to track them!</p>
          </div>
        ) : (
          <div className="watchlist-table-wrapper">
            <table className="watchlist-table">
              <thead>
                <tr>
                  <th>Wallet Address</th>
                  <th>Added</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {watchlist.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <WalletDisplay
                        walletAddress={item.wallet_address}
                        tagName={item.wallet_tags?.tag_name}
                      />
                    </td>
                    <td className="watchlist-date">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        className="unwatch-button"
                        onClick={() => removeFromWatchlist(item.wallet_address)}
                        disabled={isRemoving}
                      >
                        {isRemoving ? 'Removing...' : 'Unwatch'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
