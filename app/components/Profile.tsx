'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUserProfile, useUpdateOwnWallet, useUpdateShowZeroData } from '../hooks/useProfile'
import {
  useWalletTags, useRenameTag, useDeleteTag,
  useWalletGroups, useCreateGroup, useDeleteGroup, useRenameGroup,
  useAssignToGroup, useBulkAssignToGroup
} from '../hooks/useWalletTags'
import { GROUP_COLORS, COLOR_HEX, GroupColor } from '../lib/walletTags'
import WalletDisplay from './WalletDisplay'
import { supabase } from '../lib/supabaseClient'
import '../styles/Profile.css'

export default function Profile() {
  useEffect(() => {
    document.title = 'Profile | CommunityScan SoDEX'
  }, [])
  const { data: profileData, isLoading, error } = useUserProfile()
  const { data: walletTags } = useWalletTags()
  const { data: groups } = useWalletGroups()
  const renameTag = useRenameTag()
  const deleteTag = useDeleteTag()
  const createGroup = useCreateGroup()
  const deleteGroup = useDeleteGroup()
  const renameGroup = useRenameGroup()
  const assignToGroup = useAssignToGroup()
  const bulkAssign = useBulkAssignToGroup()
  const updateOwnWallet = useUpdateOwnWallet()
  const updateShowZeroData = useUpdateShowZeroData()

  const [ownWalletInput, setOwnWalletInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editTagName, setEditTagName] = useState('')

  // Group UI state
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupColor, setNewGroupColor] = useState<GroupColor>(GROUP_COLORS[3])
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editGroupName, setEditGroupName] = useState('')
  const [filterGroup, setFilterGroup] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [copiedWallet, setCopiedWallet] = useState<string | null>(null)
  const router = useRouter()

  const handleCopyWallet = async (wallet: string) => {
    await navigator.clipboard.writeText(wallet)
    setCopiedWallet(wallet)
    setTimeout(() => setCopiedWallet(null), 1500)
  }

  const handleTagClick = (walletAddress: string) => {
    router.push(`/tracker?wallet=${encodeURIComponent(walletAddress)}`)
  }

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

  // Group handlers
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return
    const trimmedName = newGroupName.trim()
    // Check for duplicate
    if (groups?.some(g => g.group_name.toLowerCase() === trimmedName.toLowerCase())) {
      alert('Group name already exists')
      return
    }
    await createGroup.mutateAsync({ name: trimmedName, color: newGroupColor })
    // Auto-assign selected wallets to new group
    if (selectedTags.size > 0) {
      await bulkAssign.mutateAsync({ tagIds: Array.from(selectedTags), groupName: trimmedName })
      setSelectedTags(new Set())
    }
    setNewGroupName('')
    setNewGroupColor(GROUP_COLORS[3])
    setShowCreateGroup(false)
  }

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Delete this group? Wallets will be unassigned.')) return
    await deleteGroup.mutateAsync(groupId)
  }

  const handleRenameGroup = async (groupId: string) => {
    if (!editGroupName.trim()) return
    await renameGroup.mutateAsync({ groupId, newName: editGroupName.trim() })
    setEditingGroupId(null)
    setEditGroupName('')
  }

  const handleAssignToGroup = async (tagId: string, groupName: string | null) => {
    await assignToGroup.mutateAsync({ tagId, groupName })
    setOpenDropdownId(null)
  }

  const handleBulkAssign = async (groupName: string) => {
    if (selectedTags.size === 0) return
    await bulkAssign.mutateAsync({ tagIds: Array.from(selectedTags), groupName })
    setSelectedTags(new Set())
  }

  const toggleTagSelection = (tagId: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev)
      if (next.has(tagId)) next.delete(tagId)
      else next.add(tagId)
      return next
    })
  }

  // Filtered tags
  const filteredTags = useMemo(() => {
    if (!walletTags) return []
    if (!filterGroup) return walletTags
    return walletTags.filter(t => t.group_name === filterGroup)
  }, [walletTags, filterGroup])

  // Group color map (name -> hex for display)
  const groupColorMap = useMemo(() => {
    const map = new Map<string, string>()
    groups?.forEach(g => {
      const hex = COLOR_HEX[g.group_color as GroupColor] || g.group_color
      map.set(g.group_name, hex)
    })
    return map
  }, [groups])

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

  const { profile, leaderboardStats, tagMap } = profileData

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
            <button onClick={handleLogout} className="logout-btn">
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
              <span className="custom-checkbox">
                <svg viewBox="0 0 24 24" fill="none">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span className="setting-label">Show 0 Data</span>
            </label>
            <p className="setting-description">
              When enabled, leaderboard will include accounts with zero volume and PnL.
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
              Current: <WalletDisplay walletAddress={profile.own_wallet} tagName={tagMap?.get(profile.own_wallet)} />
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
                    ? parseFloat(leaderboardStats.cumulative_pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : '0.00'}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Cumulative Volume</span>
                <span className="stat-value">
                  {leaderboardStats.cumulative_volume
                    ? parseFloat(leaderboardStats.cumulative_volume).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : '0.00'}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Unrealized PnL</span>
                <span className="stat-value">
                  {leaderboardStats.unrealized_pnl
                    ? parseFloat(leaderboardStats.unrealized_pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

        {/* Groups Section */}
        <div className="profile-section">
          <div className="section-header">
            <h2 className="section-title">Wallet Groups</h2>
            <button
              onClick={() => setShowCreateGroup(!showCreateGroup)}
              className="create-group-btn"
            >
              {showCreateGroup ? 'Cancel' : '+ Create Group'}
            </button>
          </div>

          {/* Create Group Form */}
          {showCreateGroup && (
            <div className="create-group-form" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Group name"
                className="group-name-input"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                autoFocus
              />
              <div className="color-picker">
                {GROUP_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewGroupColor(color)}
                    className={`color-swatch ${newGroupColor === color ? 'selected' : ''}`}
                    style={{ background: COLOR_HEX[color] }}
                    title={color}
                  />
                ))}
              </div>
              <button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || createGroup.isPending || bulkAssign.isPending}
                className="save-group-btn"
              >
                {selectedTags.size > 0 ? `Create + Assign ${selectedTags.size}` : 'Create'}
              </button>
            </div>
          )}

          {/* Groups List */}
          {groups && groups.length > 0 ? (
            <div className="groups-list">
              {groups.map((group) => (
                <div key={group.id} className="group-item">
                  {editingGroupId === group.id ? (
                    <div className="group-edit-row">
                      <input
                        type="text"
                        value={editGroupName}
                        onChange={(e) => setEditGroupName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRenameGroup(group.id)}
                        className="group-name-input"
                        autoFocus
                      />
                      <button onClick={() => handleRenameGroup(group.id)} className="save-btn">Save</button>
                      <button onClick={() => setEditingGroupId(null)} className="cancel-btn">Cancel</button>
                    </div>
                  ) : (
                    <>
                      <div className="group-label" style={{ color: COLOR_HEX[group.group_color as GroupColor] || group.group_color }}>
                        <span className="group-dot" style={{ background: COLOR_HEX[group.group_color as GroupColor] || group.group_color }} />
                        {group.group_name}
                        <span className="group-count">
                          ({walletTags?.filter(t => t.group_name === group.group_name).length || 0})
                        </span>
                      </div>
                      <div className="group-actions">
                        <button
                          onClick={() => setFilterGroup(filterGroup === group.group_name ? null : group.group_name)}
                          className={`filter-btn ${filterGroup === group.group_name ? 'active' : ''}`}
                          title="Filter by this group"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                          </svg>
                        </button>
                        <button
                          onClick={() => { setEditingGroupId(group.id); setEditGroupName(group.group_name) }}
                          title="Rename"
                          className="icon-btn"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          disabled={deleteGroup.isPending}
                          title="Delete"
                          className="icon-btn delete"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No groups yet. Create one to organize your wallets!</p>
            </div>
          )}
        </div>

        {/* Wallet Tags */}
        <div className="profile-section">
          <div className="section-header">
            <h2 className="section-title">
              Wallet Tags
              {filterGroup && <span className="filter-badge" style={{ color: groupColorMap.get(filterGroup) }}> - {filterGroup}</span>}
            </h2>
            <div className="tags-actions">
              {filterGroup && (
                <button onClick={() => setFilterGroup(null)} className="clear-filter-btn">
                  Clear Filter
                </button>
              )}
              {selectedTags.size > 0 && groups && groups.length > 0 && (
                <div className="bulk-assign-dropdown">
                  <span className="selected-count">{selectedTags.size} selected</span>
                  <select
                    onChange={(e) => { if (e.target.value) handleBulkAssign(e.target.value); e.target.value = '' }}
                    className="bulk-assign-select"
                  >
                    <option value="">Assign to group...</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.group_name}>{g.group_name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {filteredTags && filteredTags.length > 0 ? (
            <div className="tags-list">
              {filteredTags.map((tag) => (
                <div
                  key={tag.id}
                  className={`tag-item ${selectedTags.has(tag.id) ? 'selected' : ''}`}
                  style={{
                    borderLeft: tag.group_name ? `3px solid ${groupColorMap.get(tag.group_name) || '#666'}` : undefined
                  }}
                >
                  <label className="tag-select">
                    <input
                      type="checkbox"
                      checked={selectedTags.has(tag.id)}
                      onChange={() => toggleTagSelection(tag.id)}
                    />
                    <span className="custom-checkbox">
                      <svg viewBox="0 0 24 24" fill="none">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  </label>
                  <div className="tag-content">
                    {editingTagId === tag.id ? (
                      <div className="tag-edit-row">
                        <input
                          type="text"
                          value={editTagName}
                          onChange={(e) => setEditTagName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleRenameTag(tag.id)}
                          className="tag-name-input"
                          autoFocus
                        />
                        <button onClick={() => handleRenameTag(tag.id)} disabled={renameTag.isPending} className="save-btn">Save</button>
                        <button onClick={() => setEditingTagId(null)} className="cancel-btn">Cancel</button>
                      </div>
                    ) : (
                      <>
                        <span
                          className="tag-name clickable"
                          onClick={() => handleTagClick(tag.wallet_address)}
                          title="Search in Scanner"
                        >
                          {tag.tag_name}
                        </span>
                        <div className="wallet-copy-row">
                          <WalletDisplay walletAddress={tag.wallet_address} className="tag-wallet" />
                          <button
                            onClick={() => handleCopyWallet(tag.wallet_address)}
                            className="copy-wallet-btn"
                            title="Copy wallet address"
                          >
                            {copiedWallet === tag.wallet_address ? (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                            )}
                          </button>
                        </div>
                        {tag.group_name && (
                          <span className="tag-group-badge" style={{ color: groupColorMap.get(tag.group_name) }}>
                            {tag.group_name}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {editingTagId !== tag.id && (
                    <div className="tag-actions">
                      {/* Group assign dropdown */}
                      <div className="group-dropdown-container">
                        <button
                          onClick={() => setOpenDropdownId(openDropdownId === tag.id ? null : tag.id)}
                          className="icon-btn"
                          title="Assign to group"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          </svg>
                        </button>
                        {openDropdownId === tag.id && (
                          <div className="group-dropdown">
                            {tag.group_name && (
                              <button onClick={() => handleAssignToGroup(tag.id, null)} className="dropdown-item remove">
                                Remove from group
                              </button>
                            )}
                            {groups?.map(g => (
                              <button
                                key={g.id}
                                onClick={() => handleAssignToGroup(tag.id, g.group_name)}
                                className={`dropdown-item ${tag.group_name === g.group_name ? 'active' : ''}`}
                              >
                                <span className="dropdown-dot" style={{ background: COLOR_HEX[g.group_color as GroupColor] || g.group_color }} />
                                {g.group_name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => startEditing(tag.id, tag.tag_name)}
                        title="Rename"
                        className="icon-btn"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteTag(tag.id)}
                        disabled={deleteTag.isPending}
                        title="Delete"
                        className="icon-btn delete"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>{filterGroup ? 'No wallets in this group.' : 'No tags yet. Search for wallets and tag them!'}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
