'use client'

import React, { useState } from 'react'
import { useUserProfile, useUpdateOwnWallet, useUpdateShowZeroData } from '../hooks/useProfile'
import WalletDisplay from './WalletDisplay'
import '../styles/Profile.css'

export default function Profile() {
  const { data: profileData, isLoading, error } = useUserProfile()
  const updateOwnWallet = useUpdateOwnWallet()
  const updateShowZeroData = useUpdateShowZeroData()
  const [ownWalletInput, setOwnWalletInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Initialize input with current own_wallet value
  React.useEffect(() => {
    if (profileData?.profile?.own_wallet) {
      setOwnWalletInput(profileData.profile.own_wallet)
    }
  }, [profileData?.profile?.own_wallet])

  const handleSaveOwnWallet = async () => {
    setIsSaving(true)
    try {
      await updateOwnWallet.mutateAsync(ownWalletInput.trim())
    } catch (err) {
      console.error('Error saving own wallet:', err)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="profile-container">
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
          Loading profile...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="profile-container">
        <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
          Error loading profile: {error.message}
        </div>
      </div>
    )
  }

  if (!profileData) {
    return (
      <div className="profile-container">
        <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
          Please log in to view your profile
        </div>
      </div>
    )
  }

  const { profile, history, leaderboardStats, tagMap } = profileData

  return (
    <div className="profile-container">
      <div className="profile-content">
        <h1 className="profile-title">Your Profile</h1>

        {/* Profile Info */}
        {profile && (
          <div className="profile-section">
            <h2 className="section-title">Account</h2>
            <div className="profile-info">
              <div className="info-item">
                <span className="info-label">Email:</span>
                <span className="info-value">{profile.email || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Member since:</span>
                <span className="info-value">
                  {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Own Wallet Section */}
        <div className="profile-section">
          <h2 className="section-title">Own Wallet</h2>
          <div className="own-wallet-input-group">
            <input
              type="text"
              className="own-wallet-input"
              placeholder="Enter your wallet address (0x...)"
              value={ownWalletInput}
              onChange={(e) => setOwnWalletInput(e.target.value)}
            />
            <button
              className="save-wallet-button"
              onClick={handleSaveOwnWallet}
              disabled={isSaving || updateOwnWallet.isPending}
            >
              {isSaving || updateOwnWallet.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
          {profile?.own_wallet && (
            <p className="own-wallet-hint">
              Current wallet: <WalletDisplay walletAddress={profile.own_wallet} tagName={tagMap?.get(profile.own_wallet)} />
            </p>
          )}
        </div>

        {/* Settings Section */}
        <div className="profile-section">
          <h2 className="section-title">Settings</h2>
          <div className="settings-group">
            <label className="setting-item">
              <input
                type="checkbox"
                checked={profile?.show_zero_data || false}
                onChange={(e) => updateShowZeroData.mutate(e.target.checked)}
                disabled={updateShowZeroData.isPending}
              />
              <span className="setting-label">Show 0 Data</span>
            </label>
            <p className="setting-description">
              When enabled, leaderboard will include accounts with zero volume and PnL. Default is to hide them.
            </p>
          </div>
        </div>

        {/* Leaderboard Stats */}
        {leaderboardStats && (
          <div className="profile-section">
            <h2 className="section-title">Your Wallet Stats</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Cumulative PnL</span>
                <span className="stat-value">
                  {leaderboardStats.cumulative_pnl 
                    ? parseFloat(leaderboardStats.cumulative_pnl).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })
                    : '0.00'}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Cumulative Volume</span>
                <span className="stat-value">
                  {leaderboardStats.cumulative_volume
                    ? parseFloat(leaderboardStats.cumulative_volume).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })
                    : '0.00'}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Unrealized PnL</span>
                <span className="stat-value">
                  {leaderboardStats.unrealized_pnl
                    ? parseFloat(leaderboardStats.unrealized_pnl).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })
                    : '0.00'}
                </span>
              </div>
              {leaderboardStats.pnl_rank && (
                <div className="stat-item">
                  <span className="stat-label">PnL Rank</span>
                  <span className="stat-value">#{leaderboardStats.pnl_rank}</span>
                </div>
              )}
              {leaderboardStats.volume_rank && (
                <div className="stat-item">
                  <span className="stat-label">Volume Rank</span>
                  <span className="stat-value">#{leaderboardStats.volume_rank}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search History */}
        <div className="profile-section">
          <h2 className="section-title">Recent Searches</h2>
          {history && history.length > 0 ? (
            <div className="history-list">
              {history.map((item) => (
                <div key={item.id} className="history-item">
                  <div className="history-address">
                    <WalletDisplay
                      walletAddress={item.wallet_address}
                      tagName={tagMap?.get(item.wallet_address)}
                    />
                  </div>
                  <div className="history-date">
                    {new Date(item.searched_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No search history yet. Start searching for wallets!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
