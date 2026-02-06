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
import { useTheme } from '../lib/ThemeContext'
import { COLOR_SCHEMES, ColorScheme, ThemeMode, BULLISH_PRESETS, BEARISH_PRESETS, ACCENT_PRESETS, isValidHex } from '../lib/themes'
import WalletDisplay from './WalletDisplay'
import { supabase } from '../lib/supabaseClient'
import '../styles/Profile.css'

type ProfileSection = 'account' | 'settings' | 'customization' | 'aliases'

export default function Profile() {
  useEffect(() => {
    document.title = 'Profile | CommunityScan SoDEX'
  }, [])

  const [activeSection, setActiveSection] = useState<ProfileSection>('account')
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
  const { theme, setTheme } = useTheme()

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

  // Custom color inputs
  const [customBullish, setCustomBullish] = useState(theme.bullishColor)
  const [customBearish, setCustomBearish] = useState(theme.bearishColor)
  const [customAccent, setCustomAccent] = useState(theme.accentColor)

  // Unsaved changes tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [originalValues, setOriginalValues] = useState({
    ownWallet: '',
    colorScheme: theme.colorScheme,
    mode: theme.mode,
    bullishColor: theme.bullishColor,
    bearishColor: theme.bearishColor,
    accentColor: theme.accentColor
  })

  useEffect(() => {
    setCustomBullish(theme.bullishColor)
    setCustomBearish(theme.bearishColor)
    setCustomAccent(theme.accentColor)
  }, [theme.bullishColor, theme.bearishColor, theme.accentColor])

  const handleCopyWallet = async (wallet: string) => {
    await navigator.clipboard.writeText(wallet)
    setCopiedWallet(wallet)
    setTimeout(() => setCopiedWallet(null), 1500)
  }

  const handleTagClick = (walletAddress: string) => {
    if (hasUnsavedChanges) {
      // Trigger shake animation
      const banner = document.querySelector('.unsaved-changes-banner')
      if (banner) {
        banner.classList.add('shake')
        setTimeout(() => banner.classList.remove('shake'), 500)
      }
      return
    }
    router.push(`/tracker?wallet=${encodeURIComponent(walletAddress)}`)
  }

  const handleLogout = async () => {
    if (hasUnsavedChanges) {
      // Trigger shake animation
      const banner = document.querySelector('.unsaved-changes-banner')
      if (banner) {
        banner.classList.add('shake')
        setTimeout(() => banner.classList.remove('shake'), 500)
      }
      return
    }
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
      setOriginalValues(prev => ({ ...prev, ownWallet: profileData.profile.own_wallet }))
    }
  }, [profileData?.profile?.own_wallet])

  // Check for unsaved changes
  useEffect(() => {
    const hasChanges =
      ownWalletInput.trim() !== originalValues.ownWallet ||
      theme.colorScheme !== originalValues.colorScheme ||
      theme.mode !== originalValues.mode ||
      theme.bullishColor !== originalValues.bullishColor ||
      theme.bearishColor !== originalValues.bearishColor ||
      theme.accentColor !== originalValues.accentColor

    setHasUnsavedChanges(hasChanges)
  }, [ownWalletInput, theme.colorScheme, theme.mode, theme.bullishColor, theme.bearishColor, theme.accentColor, originalValues])

  // Block navigation when unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

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

  const handleSaveAllChanges = async () => {
    setIsSaving(true)
    try {
      // Save own wallet if changed
      if (ownWalletInput.trim() !== originalValues.ownWallet) {
        await updateOwnWallet.mutateAsync(ownWalletInput.trim())
      }

      // Update original values
      setOriginalValues({
        ownWallet: ownWalletInput.trim(),
        colorScheme: theme.colorScheme,
        mode: theme.mode,
        bullishColor: theme.bullishColor,
        bearishColor: theme.bearishColor,
        accentColor: theme.accentColor
      })

      setHasUnsavedChanges(false)
    } catch (err) {
      console.error('Error saving changes:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDiscardChanges = () => {
    // Revert all changes
    setOwnWalletInput(originalValues.ownWallet)
    setTheme({
      colorScheme: originalValues.colorScheme,
      mode: originalValues.mode,
      bullishColor: originalValues.bullishColor,
      bearishColor: originalValues.bearishColor,
      accentColor: originalValues.accentColor
    })
    setHasUnsavedChanges(false)
  }

  // Theme handlers
  const handleColorSchemeChange = (scheme: ColorScheme) => {
    setTheme({ colorScheme: scheme })
  }

  const handleModeChange = (mode: ThemeMode) => {
    setTheme({ mode })
  }

  const handleBullishColorChange = (color: string) => {
    setCustomBullish(color)
    if (isValidHex(color)) {
      setTheme({ bullishColor: color })
    }
  }

  const handleBearishColorChange = (color: string) => {
    setCustomBearish(color)
    if (isValidHex(color)) {
      setTheme({ bearishColor: color })
    }
  }

  const handleAccentColorChange = (color: string) => {
    setCustomAccent(color)
    if (isValidHex(color)) {
      setTheme({ accentColor: color })
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

  const handleSectionChange = (section: ProfileSection) => {
    if (hasUnsavedChanges) {
      // Trigger shake animation instead of browser confirm
      const banner = document.querySelector('.unsaved-changes-banner')
      if (banner) {
        banner.classList.add('shake')
        setTimeout(() => banner.classList.remove('shake'), 500)
      }
      return
    }
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
      key: 'customization',
      label: 'Customization',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="13.5" cy="6.5" r="2.5" />
          <circle cx="17.5" cy="10.5" r="2.5" />
          <circle cx="8.5" cy="7.5" r="2.5" />
          <circle cx="6.5" cy="12.5" r="2.5" />
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
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
    }
  ]

  return (
    <div className="profile-container">
      {/* Unsaved Changes Banner */}
      {hasUnsavedChanges && (
        <div className="unsaved-changes-banner">
          <div className="banner-content">
            <div className="banner-text">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>You have unsaved changes</span>
            </div>
            <div className="banner-actions">
              <button onClick={handleDiscardChanges} className="discard-btn" disabled={isSaving}>
                Discard
              </button>
              <button onClick={handleSaveAllChanges} className="save-btn" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

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
            </>
          )}

          {/* Customization Section */}
          {activeSection === 'customization' && (
            <>
              <h1 className="profile-title">Customization</h1>

              {/* Color Scheme */}
              <div className="profile-section">
                <h2 className="section-title">Color Scheme</h2>
                <div className="theme-grid">
                  {(Object.keys(COLOR_SCHEMES) as ColorScheme[]).map(scheme => (
                    <button
                      key={scheme}
                      className={`theme-card ${theme.colorScheme === scheme ? 'active' : ''}`}
                      onClick={() => handleColorSchemeChange(scheme)}
                    >
                      <div
                        className="theme-preview"
                        style={{ background: COLOR_SCHEMES[scheme].dark.primary }}
                      />
                      <span className="theme-name">{COLOR_SCHEMES[scheme].name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Light/Dark Mode */}
              <div className="profile-section">
                <h2 className="section-title">Mode</h2>
                <div className="mode-toggle">
                  <button
                    className={`mode-btn ${theme.mode === 'dark' ? 'active' : ''}`}
                    onClick={() => handleModeChange('dark')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                    Dark
                  </button>
                  <button
                    className={`mode-btn ${theme.mode === 'light' ? 'active' : ''}`}
                    disabled
                    style={{
                      opacity: 0.4,
                      cursor: 'not-allowed',
                      position: 'relative'
                    }}
                    title="Coming soon"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="1" x2="12" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                      <line x1="1" y1="12" x2="3" y2="12" />
                      <line x1="21" y1="12" x2="23" y2="12" />
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                    Light
                  </button>
                </div>
              </div>

              {/* Bullish Color */}
              <div className="profile-section">
                <h2 className="section-title">Bullish Color</h2>
                <div className="color-presets">
                  {BULLISH_PRESETS.map(color => (
                    <button
                      key={color}
                      className={`color-preset ${theme.bullishColor === color ? 'active' : ''}`}
                      style={{ background: color }}
                      onClick={() => setTheme({ bullishColor: color })}
                      title={color}
                    />
                  ))}
                </div>
                <div className="custom-color-input">
                  <label>Custom:</label>
                  <input
                    type="text"
                    value={customBullish}
                    onChange={(e) => handleBullishColorChange(e.target.value)}
                    placeholder="#22c55e"
                    className={!isValidHex(customBullish) && customBullish !== '' ? 'invalid' : ''}
                  />
                  <div
                    className="color-preview"
                    style={{ background: isValidHex(customBullish) ? customBullish : '#22c55e' }}
                  />
                </div>
              </div>

              {/* Bearish Color */}
              <div className="profile-section">
                <h2 className="section-title">Bearish Color</h2>
                <div className="color-presets">
                  {BEARISH_PRESETS.map(color => (
                    <button
                      key={color}
                      className={`color-preset ${theme.bearishColor === color ? 'active' : ''}`}
                      style={{ background: color }}
                      onClick={() => setTheme({ bearishColor: color })}
                      title={color}
                    />
                  ))}
                </div>
                <div className="custom-color-input">
                  <label>Custom:</label>
                  <input
                    type="text"
                    value={customBearish}
                    onChange={(e) => handleBearishColorChange(e.target.value)}
                    placeholder="#ef4444"
                    className={!isValidHex(customBearish) && customBearish !== '' ? 'invalid' : ''}
                  />
                  <div
                    className="color-preview"
                    style={{ background: isValidHex(customBearish) ? customBearish : '#ef4444' }}
                  />
                </div>
              </div>

              {/* Accent Color */}
              <div className="profile-section">
                <h2 className="section-title">Accent Color</h2>
                <div className="color-presets">
                  {ACCENT_PRESETS.map((color: string) => (
                    <button
                      key={color}
                      className={`color-preset ${theme.accentColor === color ? 'active' : ''}`}
                      style={{ background: color }}
                      onClick={() => setTheme({ accentColor: color })}
                      title={color}
                    />
                  ))}
                </div>
                <div className="custom-color-input">
                  <label>Custom:</label>
                  <input
                    type="text"
                    value={customAccent}
                    onChange={(e) => handleAccentColorChange(e.target.value)}
                    placeholder="#1230B7"
                    className={!isValidHex(customAccent) && customAccent !== '' ? 'invalid' : ''}
                  />
                  <div
                    className="color-preview"
                    style={{ background: isValidHex(customAccent) ? customAccent : '#1230B7' }}
                  />
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
        </div>
      </div>
    </div>
  )
}
