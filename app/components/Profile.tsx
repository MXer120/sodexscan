'use client'

import React, { useState } from 'react'
import { useUserProfile, useUpdateOwnWallet, useUpdateShowZeroData } from '../hooks/useProfile'
import { useWalletTags, useRenameTag, useDeleteTag } from '../hooks/useWalletTags'
import WalletDisplay from './WalletDisplay'
import { supabase } from '../lib/supabaseClient'
import '../styles/Profile.css'

export default function Profile() {
  const { data: profileData, isLoading, error } = useUserProfile()
  const { data: walletTags } = useWalletTags()
  const renameTag = useRenameTag()
  const deleteTag = useDeleteTag()
  const updateOwnWallet = useUpdateOwnWallet()
  const updateShowZeroData = useUpdateShowZeroData()
  const [ownWalletInput, setOwnWalletInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editTagName, setEditTagName] = useState('')

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const handleRenameTag = async (tagId: string) => {
    if (!editTagName.trim()) return
    await renameTag.mutateAsync({ tagId, newName: editTagName.trim() })
    setEditingTagId(null)
    setEditTagName('')
  }

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('Delete this tag?')) return
    await deleteTag.mutateAsync(tagId)
  }

  const startEditing = (tagId: string, currentName: string) => {
    setEditingTagId(tagId)
    setEditTagName(currentName)
  }

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
            <button
              onClick={handleLogout}
              className="logout-btn"
              style={{
                marginTop: '16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Logout
            </button>
          </div>
        )}

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

        {/* Wallet Tags */}
        <div className="profile-section">
          <h2 className="section-title">Wallet Tags</h2>
          {walletTags && walletTags.length > 0 ? (
            <div className="tags-list">
              {walletTags.map((tag) => (
                <div key={tag.id} className="tag-item" style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'rgba(20, 20, 20, 0.4)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  marginBottom: '8px'
                }}>
                  <div style={{ flex: 1 }}>
                    {editingTagId === tag.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="text"
                          value={editTagName}
                          onChange={(e) => setEditTagName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleRenameTag(tag.id)}
                          style={{
                            background: 'rgba(30, 30, 30, 0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '4px',
                            padding: '6px 10px',
                            color: '#fff',
                            fontSize: '13px',
                            width: '140px'
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleRenameTag(tag.id)}
                          disabled={renameTag.isPending}
                          style={{
                            background: 'rgba(74, 222, 128, 0.15)',
                            border: '1px solid rgba(74, 222, 128, 0.3)',
                            color: '#4ade80',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingTagId(null)}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#888',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <span style={{ color: '#4ade80', fontWeight: '500', marginRight: '12px' }}>
                          {tag.tag_name}
                        </span>
                        <WalletDisplay walletAddress={tag.wallet_address} className="tag-wallet" />
                      </>
                    )}
                  </div>
                  {editingTagId !== tag.id && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => startEditing(tag.id, tag.tag_name)}
                        title="Rename"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#888',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteTag(tag.id)}
                        disabled={deleteTag.isPending}
                        title="Delete"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#f44336',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No tags yet. Search for wallets and tag them!</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
