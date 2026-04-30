'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUserProfile, useUpdateOwnWallet, useUpdateShowZeroData, useWeeklyWalletStats } from '../hooks/useProfile'
import { useSessionContext } from '../lib/SessionContext'
import {
  useWalletTags, useRenameTag, useDeleteTag,
  useWalletGroups, useCreateGroup, useDeleteGroup, useRenameGroup,
  useAssignToGroup, useBulkAssignToGroup
} from '../hooks/useWalletTags'
import { GROUP_COLORS, COLOR_HEX, GroupColor } from '../lib/walletTags'
import { supabase } from '../lib/supabaseClient'
import WalletDisplay from './WalletDisplay'
import { SkeletonBar } from './Skeleton'
import '../styles/Profile.css'

type ProfileSection = 'account' | 'settings' | 'aliases' | 'alerts'

export default function Profile() {
  useEffect(() => {
    document.title = 'Profile | CommunityScan SoDEX'
  }, [])

  const [activeSection, setActiveSection] = useState<ProfileSection>('account')
  const { user: sessionUser, loading: sessionLoading, openAuthModal } = useSessionContext()
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
  const ownWalletForWeekly = profileData?.profile?.own_wallet?.toLowerCase() ?? null
  const { data: weeklyStats, isLoading: weeklyLoading } = useWeeklyWalletStats(ownWalletForWeekly)

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
  const [statsView, setStatsView] = useState<'total' | 'weekly'>('total')
  const router = useRouter()

  // Navbar visibility prefs
  const [navVisibility, setNavVisibility] = useState<Record<string, boolean>>({})
  const [navVisibilityLoaded, setNavVisibilityLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('navVisibility')
      if (stored) setNavVisibility(JSON.parse(stored))
    } catch {}
    setNavVisibilityLoaded(true)
  }, [])

  const handleNavVisibilityChange = (path: string, visible: boolean) => {
    const updated = { ...navVisibility, [path]: visible }
    setNavVisibility(updated)
    localStorage.setItem('navVisibility', JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('navVisibilityChanged'))
  }

  const navToggleItems = [
    { path: '/tracker', label: 'Scan' },
    { path: '/mainnet', label: 'Leaderboard' },
    { path: '/sopoints', label: 'SoPoints' },
    { path: '/watchlist', label: 'Watchlist' },
    { path: '/aggregator', label: 'Aggregator' },
    { path: '/platform', label: 'Platform' },
    { path: '/incoming', label: 'Incoming' },
    { path: '/reverse-search', label: 'Reverse Search' },
  ]


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
    if (groups?.some(g => g.group_name.toLowerCase() === trimmedName.toLowerCase())) {
      alert('Group name already exists')
      return
    }
    await createGroup.mutateAsync({ name: trimmedName, color: newGroupColor })
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

  const filteredTags = useMemo(() => {
    if (!walletTags) return []
    if (!filterGroup) return walletTags
    return walletTags.filter(t => t.group_name === filterGroup)
  }, [walletTags, filterGroup])

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

  if (sessionLoading || isLoading) return null

  if (!sessionUser) {
    return (
      <div className="profile-container">
        <div style={{ padding: '60px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 15, margin: 0 }}>Sign in to view your profile</p>
          <button
            onClick={openAuthModal}
            style={{ padding: '10px 24px', borderRadius: 8, background: 'var(--color-accent, #6366f1)', color: '#fff', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
          >
            Log in
          </button>
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

  const handleSectionChange = (section: ProfileSection) => {
    setActiveSection(section)
  }

  const navItems: { key: ProfileSection; label: string; icon: React.ReactNode }[] = [
    {
      key: 'account',
      label: 'Account',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      )
    },
    {
      key: 'aliases',
      label: 'Alias Manager',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      )
    },
    {
      key: 'alerts' as ProfileSection,
      label: 'Alerts',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      )
    }
  ]

  return (
    <div className="profile-container">
      <div className="profile-layout">
        {/* Vertical Navigation */}
        <nav className="profile-nav">
          <h2 className="profile-nav-title">Profile</h2>
          {navItems.map(item => (
            <button
              key={item.key}
              className={`profile-nav-item ${activeSection === item.key ? 'active' : ''}`}
              onClick={() => handleSectionChange(item.key)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Main Content */}
        <div className="profile-content">
          {/* Account Section */}
          {activeSection === 'account' && (
            <>
              <h1 className="profile-title">Account</h1>

              {profile && (
                <div className="profile-section">
                  <h2 className="section-title">Profile Information</h2>
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                    <h2 className="section-title" style={{ margin: 0 }}>Your Wallet Stats</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="leaderboard-toggle" style={{ fontSize: 13 }}>
                        <button
                          className={statsView === 'total' ? 'active' : ''}
                          onClick={() => setStatsView('total')}
                        >
                          All-Time
                        </button>
                        <button
                          className={statsView === 'weekly' ? 'active' : ''}
                          onClick={() => setStatsView('weekly')}
                        >
                          This Week
                        </button>
                      </div>
                      <div className="leaderboard-toggle" style={{ fontSize: 13 }}>
                        <button
                          onClick={() => router.push('/mainnet')}
                          title="View full leaderboard"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          Full Info
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {statsView === 'total' ? (
                    <div className="stats-grid">
                      <div className="stat-item">
                        <span className="stat-label">Total PnL</span>
                        <span className="stat-value">
                          {leaderboardStats.total_pnl?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'}
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Total Volume</span>
                        <span className="stat-value">
                          {leaderboardStats.total_volume?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'}
                        </span>
                      </div>
                      {leaderboardStats.unrealized_pnl !== 0 && (
                        <div className="stat-item">
                          <span className="stat-label">Unrealized PnL</span>
                          <span className="stat-value">
                            {leaderboardStats.unrealized_pnl?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'}
                          </span>
                        </div>
                      )}
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
                  ) : weeklyLoading ? (
                    <div className="stats-grid">
                      {[0, 1, 2, 3, 4].map(i => (
                        <div key={i} className="stat-item">
                          <span className="stat-label" style={{ visibility: 'hidden' }}>-</span>
                          <span className="stat-value"><SkeletonBar width="80px" height={16} style={{}} /></span>
                        </div>
                      ))}
                    </div>
                  ) : weeklyStats ? (
                    <div className="stats-grid">
                      <div className="stat-item">
                        <span className="stat-label">Week {weeklyStats.week_number} PnL</span>
                        <span className="stat-value">
                          {weeklyStats.weekly_pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Week {weeklyStats.week_number} Volume</span>
                        <span className="stat-value">
                          {weeklyStats.weekly_volume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Unrealized PnL</span>
                        <span className="stat-value">
                          {weeklyStats.unrealized_pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      {weeklyStats.pnl_rank && (
                        <div className="stat-item">
                          <span className="stat-label">PnL Rank</span>
                          <span className="stat-value">#{weeklyStats.pnl_rank}</span>
                        </div>
                      )}
                      {weeklyStats.volume_rank && (
                        <div className="stat-item">
                          <span className="stat-label">Volume Rank</span>
                          <span className="stat-value">#{weeklyStats.volume_rank}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: '16px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
                      No weekly data available
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Settings Section */}
          {activeSection === 'settings' && (
            <>
              <h1 className="profile-title">Settings</h1>

              <div className="profile-section">
                <h2 className="section-title">Display Options</h2>
                <div className="settings-group">
                  <label className="setting-item" style={{ opacity: 0.5, cursor: 'not-allowed' }} title="Temporarily unavailable">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => { }}
                      disabled
                    />
                    <span className="custom-checkbox">
                      <svg viewBox="0 0 24 24" fill="none">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span className="setting-label">Show 0 Data <span style={{ fontSize: '11px', color: '#ff4444', marginLeft: '8px', fontWeight: 'bold' }}>(Temporarily unavailable)</span></span>
                  </label>
                  <p className="setting-description">
                    When enabled, leaderboard will include accounts with zero volume and PnL. (This feature is currently being optimized)
                  </p>
                </div>
              </div>

              <div className="profile-section">
                <h2 className="section-title">Navbar Visibility</h2>
                <p className="setting-description" style={{ marginBottom: 12 }}>
                  Toggle which items appear in your navigation bar.
                </p>
                <div className="settings-group">
                  {navToggleItems.map(item => {
                    const isVisible = navVisibility[item.path] !== false
                    return (
                      <label key={item.path} className="setting-item" style={{ cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => handleNavVisibilityChange(item.path, !isVisible)}
                        />
                        <span className="custom-checkbox">
                          <svg viewBox="0 0 24 24" fill="none">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                        <span className="setting-label">{item.label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* Alias Manager Section */}
          {activeSection === 'aliases' && (
            <>
              <h1 className="profile-title">Alias Manager</h1>

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
            </>
          )}

          {/* Alerts Section */}
          {activeSection === 'alerts' && (
            <AlertsSection userId={profile?.id} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Alerts Section (inline to avoid extra file) ────────────────────────────

function AlertsSection({ userId }: { userId?: string }) {
  const [tgChannel, setTgChannel] = React.useState<string | null>(null)
  const [dcChannel, setDcChannel] = React.useState<string | null>(null)
  const [dcInput, setDcInput] = React.useState('')
  const [linkToken, setLinkToken] = React.useState<string | null>(null)
  const [loadingTg, setLoadingTg] = React.useState(false)
  const [savingDc, setSavingDc] = React.useState(false)
  const [msg, setMsg] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!userId) return
    supabase
      .from('user_notification_channels')
      .select('channel, address, verified_at')
      .eq('user_id', userId)
      .then(({ data }) => {
        data?.forEach(ch => {
          if (ch.channel === 'telegram') setTgChannel(ch.address)
          if (ch.channel === 'discord') { setDcChannel(ch.address); setDcInput(ch.address) }
        })
      })
  }, [userId])

  const handleGenerateTgLink = async () => {
    if (!userId) return
    setLoadingTg(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/telegram/link', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      })
      const json = await res.json()
      if (json.token) setLinkToken(json.token)
      else setMsg(json.error ?? 'Failed to generate link')
    } catch {
      setMsg('Failed to generate link')
    }
    setLoadingTg(false)
  }

  const handleDisconnectTg = async () => {
    if (!userId) return
    await supabase.from('user_notification_channels').delete().eq('user_id', userId).eq('channel', 'telegram')
    setTgChannel(null)
    setLinkToken(null)
    setMsg('Telegram disconnected.')
  }

  const handleSaveDc = async () => {
    if (!userId || !dcInput.startsWith('https://discord.com/api/webhooks/')) {
      setMsg('Please enter a valid Discord webhook URL (starts with https://discord.com/api/webhooks/)')
      return
    }
    setSavingDc(true)
    await supabase.from('user_notification_channels').upsert(
      { user_id: userId, channel: 'discord', address: dcInput, verified_at: new Date().toISOString() },
      { onConflict: 'user_id,channel' }
    )
    setDcChannel(dcInput)
    setSavingDc(false)
    setMsg('Discord webhook saved.')
  }

  const handleDisconnectDc = async () => {
    if (!userId) return
    await supabase.from('user_notification_channels').delete().eq('user_id', userId).eq('channel', 'discord')
    setDcChannel(null)
    setDcInput('')
    setMsg('Discord disconnected.')
  }

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? 'communityscan_bot'

  return (
    <>
      <h1 className="profile-title">Alerts &amp; Notifications</h1>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
        Receive instant signals when tracked wallets open/close positions, when prices move, or when Sodex has maintenance.
        Alerts are informational only — not financial advice.
      </p>

      {msg && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 13, color: '#22c55e', marginBottom: 16 }}>
          {msg}
        </div>
      )}

      {/* Telegram */}
      <div className="profile-section">
        <h2 className="section-title">Telegram</h2>
        {tgChannel ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-main)' }}>✅ Connected (chat ID: {tgChannel})</span>
            <button onClick={handleDisconnectTg} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6, background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer' }}>
              Disconnect
            </button>
          </div>
        ) : linkToken ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
              Click the link below to open Telegram and activate alerts. Link expires in 15 minutes.
            </p>
            <a
              href={`https://t.me/${botUsername}?start=${linkToken}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: '#0088cc', color: '#fff', fontWeight: 600, fontSize: 13, textDecoration: 'none', width: 'fit-content' }}
            >
              Open Telegram →
            </a>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>After clicking, refresh this page to confirm.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>Connect Telegram to receive alerts via our bot. Free, no phone number sharing.</p>
            <button onClick={handleGenerateTgLink} disabled={loadingTg} style={{ padding: '8px 18px', borderRadius: 8, background: '#0088cc', color: '#fff', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', width: 'fit-content' }}>
              {loadingTg ? 'Generating…' : 'Connect Telegram'}
            </button>
          </div>
        )}
      </div>

      {/* Discord */}
      <div className="profile-section">
        <h2 className="section-title">Discord</h2>
        {dcChannel ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-main)' }}>✅ Webhook connected</span>
            <button onClick={handleDisconnectDc} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6, background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer' }}>
              Disconnect
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
              Paste your Discord channel webhook URL. Create one in Discord: Channel Settings → Integrations → Webhooks → New Webhook.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="url"
                placeholder="https://discord.com/api/webhooks/…"
                value={dcInput}
                onChange={e => setDcInput(e.target.value)}
                style={{ flex: 1, background: 'var(--color-bg-input, var(--color-surface))', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 12px', color: 'var(--color-text-main)', fontSize: 13 }}
              />
              <button onClick={handleSaveDc} disabled={savingDc} style={{ padding: '8px 18px', borderRadius: 8, background: '#5865F2', color: '#fff', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                {savingDc ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Alert types info */}
      <div className="profile-section">
        <h2 className="section-title">What you'll receive</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { emoji: '🟢🔴', label: 'Fill signals', desc: 'When a wallet you follow opens or closes a position' },
            { emoji: '📈📉', label: 'Price alerts', desc: 'When a tracked symbol moves ≥5% (set via watchlist)' },
            { emoji: '👁', label: 'Wallet activity', desc: 'Any activity on wallets in your watchlist' },
            { emoji: '🚧', label: 'Maintenance', desc: 'When Sodex gateway becomes unreachable' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: 18, minWidth: 32 }}>{item.emoji}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-main)' }}>{item.label}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
