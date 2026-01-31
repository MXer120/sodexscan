'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useReferrals, Referral } from '../hooks/useReferrals'
import '../styles/ReferralPage.css'

if (typeof document !== 'undefined') {
  document.title = 'Referrals | CommunityScan SoDEX'
}

const BASE_URL = 'https://sodex.com/join/'

function truncate(str: string, maxLen = 16): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 2) + '...'
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

// SVG Icons
const DiscordIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="social-svg">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
)

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="social-svg">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
)

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="social-svg">
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
  </svg>
)

interface TooltipProps {
  refCode: string
  platform: 'X' | 'Telegram' | 'Discord'
  handle: string | null
}

function getTooltipText({ refCode, platform, handle }: TooltipProps): string {
  if (!handle) {
    return `Referral code ${refCode} has not been publicly observed in connection with an ${platform} @handle. No claim of ownership or control.`
  }
  return `Referral code ${refCode} has been publicly observed in connection with ${platform} @${handle}. No claim of ownership or control.`
}

interface SocialBadgeProps {
  platform: 'X' | 'Telegram' | 'Discord'
  handle: string | null
  displayName?: string | null
  refCode: string
}

function SocialBadge({ platform, handle, displayName, refCode }: SocialBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const displayValue = handle || displayName
  const label = displayValue ? truncate(displayValue) : 'Unknown'
  const isUnknown = !displayValue

  const Icon = platform === 'Discord' ? DiscordIcon : platform === 'Telegram' ? TelegramIcon : XIcon

  return (
    <div
      className="social-badge-wrapper"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className={`social-badge ${isUnknown ? 'unknown' : ''}`}>
        <Icon />
        <span className="social-label">{label}</span>
        <span className="info-icon">ⓘ</span>
      </div>
      {showTooltip && (
        <div className="tooltip">
          {getTooltipText({ refCode, platform, handle: displayValue })}
        </div>
      )}
    </div>
  )
}

interface ReferralCardProps {
  referral: Referral
}

function ReferralCard({ referral }: ReferralCardProps) {
  const link = `${BASE_URL}${referral.ref_code}`

  return (
    <div className="referral-card">
      <h3 className="referral-code">{referral.ref_code}</h3>

      <a href={link} target="_blank" rel="noopener noreferrer" className="referral-link-row">
        <span className="referral-link">{link}</span>
        <span className="link-icon">↗</span>
      </a>

      <div className="social-badges">
        <SocialBadge
          platform="Discord"
          handle={referral.dc_username}
          refCode={referral.ref_code}
        />
        <SocialBadge
          platform="Telegram"
          handle={referral.tg_username}
          displayName={referral.tg_displayname}
          refCode={referral.ref_code}
        />
        <SocialBadge
          platform="X"
          handle={null}
          refCode={referral.ref_code}
        />
      </div>
    </div>
  )
}

export default function ReferralPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 250)

  const { referrals, isLoading, error } = useReferrals()

  const filteredReferrals = useMemo(() => {
    if (!debouncedSearch.trim()) return referrals
    const term = debouncedSearch.toLowerCase()
    return referrals.filter(ref =>
      ref.ref_code.toLowerCase().includes(term) ||
      ref.dc_username?.toLowerCase().includes(term) ||
      ref.tg_username?.toLowerCase().includes(term) ||
      ref.tg_displayname?.toLowerCase().includes(term)
    )
  }, [referrals, debouncedSearch])

  if (isLoading) {
    return (
      <div className="referral-container">
        <div className="referral-content">
          <h1 className="referral-title">Referrals</h1>
          <div className="loading-state">Loading referrals...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="referral-container">
        <div className="referral-content">
          <h1 className="referral-title">Referrals</h1>
          <div className="error-state">
            Error loading referrals: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="referral-container">
      <div className="referral-content">
        <div className="referral-header">
          <div className="referral-header-left">
            <h1 className="referral-title">Referrals</h1>
            <p className="referral-subtitle">
              This dataset reflects publicly observable associations between referral codes, wallet addresses, and online handles. It does not identify individuals, ownership, or control. Associations are non-verified and may be incorrect. Referrals may not work due to weekly limits or inaccuracy of codes. For removal of referral codes, associated socials, or other data, contact communityscan-sodex@outlook.com.
            </p>
          </div>
          <div className="referral-search">
            <input
              type="text"
              placeholder="Search codes or handles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="referral-search-input"
            />
          </div>
        </div>

        {filteredReferrals.length === 0 ? (
          <div className="empty-state">
            {debouncedSearch ? 'No matching referral codes found.' : 'No referral codes found.'}
          </div>
        ) : (
          <>
            <div className="referral-grid">
              {filteredReferrals.map((ref) => (
                <ReferralCard key={ref.id} referral={ref} />
              ))}
            </div>

            <div className="referral-stats">
              {debouncedSearch
                ? `${filteredReferrals.length} of ${referrals.length} referral codes`
                : `${referrals.length} referral code${referrals.length !== 1 ? 's' : ''}`
              }
            </div>
          </>
        )}
      </div>
    </div>
  )
}
