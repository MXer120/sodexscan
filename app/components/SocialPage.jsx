'use client'

import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { globalCache } from '../lib/globalCache'
import '../styles/SocialPage.css'
import '../styles/MainnetPage.css'

const PAGE_SIZE = 20

// Truncate long names
function truncateName(name, maxLen = 20) {
  if (!name || name.length <= maxLen) return name
  return name.slice(0, maxLen) + '...'
}

// View configurations
const SOCIAL_VIEWS = {
  messages: {
    label: 'Messages',
    view: 'leaderboard_messages',
    headers: ['#', 'User', 'Messages'],
    valueKey: 'total_messages'
  },
  characters: {
    label: 'Characters',
    view: 'leaderboard_characters',
    headers: ['#', 'User', 'Characters'],
    valueKey: 'total_characters'
  },
  fud: {
    label: 'FUD',
    isStatic: true,
    headers: ['#', 'User', 'FUD'],
    staticData: [{ rank: 1, displayName: 'DEV', value: 'infinity' }]
  },
  troll: {
    label: 'Troll',
    isStatic: true,
    headers: ['#', 'User', 'Trolling'],
    staticData: [{ rank: 1, displayName: 'Juniourcrypt[SoDEX]', value: 'infinity' }]
  }
}

export default function SocialPage() {
  const [activeView, setActiveView] = useState('messages')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [fetchTime, setFetchTime] = useState(null)
  const [error, setError] = useState(null)

  // Cache for user names per view (keyed by viewKey)
  const userNamesCache = useRef(new Map())
  const fetchInProgressRef = useRef(false)

  // Format number
  const formatNumber = (num) => {
    if (num == null) return '-'
    return num.toLocaleString('de-DE')
  }

  // Format percentage
  const formatPercent = (num) => {
    if (num == null) return '-'
    return `${(num * 100).toFixed(1)}%`
  }

  // Format sentiment
  const formatSentiment = (num) => {
    if (num == null) return '-'
    const formatted = num.toFixed(2)
    return num > 0 ? `+${formatted}` : formatted
  }

  // Get sentiment class
  const getSentimentClass = (num) => {
    if (num == null) return ''
    if (num > 0.1) return 'positive'
    if (num < -0.1) return 'negative'
    return 'neutral'
  }

  // Fetch user names for a list of user_ids
  const fetchUserNames = async (userIds) => {
    if (!userIds.length) return new Map()

    try {
      // Convert to strings for consistent matching
      const stringIds = userIds.map(id => String(id))
      console.log('Fetching names for user_ids:', stringIds)

      const { data: users, error } = await supabase
        .from('users')
        .select('user_id, display_name, username')
        .in('user_id', stringIds)

      if (error) {
        console.error('User fetch error:', error)
        throw error
      }

      console.log('Fetched users:', users)

      const nameMap = new Map()
      users?.forEach(u => {
        const name = u.display_name || u.username || `User ${u.user_id}`
        // Store with string key for consistent lookup
        nameMap.set(String(u.user_id), truncateName(name))
      })
      return nameMap
    } catch (e) {
      console.error('Failed to load users:', e)
      return new Map()
    }
  }

  // Fetch leaderboard data
  const fetchLeaderboard = async (viewKey, pageNum = 1, forceRefresh = false) => {
    const viewConfig = SOCIAL_VIEWS[viewKey]
    if (!viewConfig) return

    // Handle static views (FUD, Troll)
    if (viewConfig.isStatic) {
      setData(viewConfig.staticData)
      setTotalCount(viewConfig.staticData.length)
      setLoading(false)
      setFetchTime(new Date().toISOString())
      return
    }

    // Check cache first
    const cached = globalCache.getSocialPage(viewKey, pageNum)
    if (cached && !forceRefresh) {
      setData(cached.data)
      setTotalCount(cached.totalCount)
      setFetchTime(cached.fetchTime)
      setLoading(false)
      return
    }

    if (fetchInProgressRef.current && !forceRefresh) return

    fetchInProgressRef.current = true
    setLoading(true)
    setError(null)

    try {
      // Get total count first
      const { count, error: countError } = await supabase
        .from(viewConfig.view)
        .select('*', { count: 'exact', head: true })

      if (countError) {
        console.error('Count error:', countError)
      }
      const resolvedCount = count || 0
      setTotalCount(resolvedCount)

      // Fetch page data
      const offset = (pageNum - 1) * PAGE_SIZE

      let query = supabase
        .from(viewConfig.view)
        .select('*')

      if (offset > 0) {
        query = query.range(offset, offset + PAGE_SIZE - 1)
      } else {
        query = query.limit(PAGE_SIZE)
      }

      const { data: rows, error: fetchError } = await query

      if (fetchError) {
        console.error('Fetch error:', fetchError)
        throw fetchError
      }

      if (!rows || rows.length === 0) {
        if (pageNum === 1) {
          setError('No data available')
        }
        setData([])
      } else {
        const userIds = rows.map(r => r.user_id).filter(Boolean)
        const nameMap = await fetchUserNames(userIds)

        const formatted = rows.map((row, idx) => ({
          rank: offset + idx + 1,
          displayName: nameMap.get(String(row.user_id)) || `User ${row.user_id}`,
          userId: row.user_id,
          value: row[viewConfig.valueKey],
          isPercent: viewConfig.isPercent,
          isSentiment: viewConfig.isSentiment
        }))

        const ft = new Date().toISOString()
        setData(formatted)
        setFetchTime(ft)

        // Store in cache
        globalCache.setSocialPage(viewKey, pageNum, formatted, resolvedCount, ft)
      }
    } catch (err) {
      console.error('Failed to fetch social leaderboard:', err)
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
      fetchInProgressRef.current = false
    }
  }

  // Initial load
  useEffect(() => {
    fetchLeaderboard(activeView, 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle view change
  const handleViewChange = (viewKey) => {
    setActiveView(viewKey)
    setPage(1)
    fetchLeaderboard(viewKey, 1)
  }

  // Handle page change
  const handlePageChange = (newPage) => {
    setPage(newPage)
    fetchLeaderboard(activeView, newPage)
  }

  // Format fetch time
  const formatFetchTime = (isoString) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  }

  const viewConfig = SOCIAL_VIEWS[activeView]
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="social-page dashboard">
      <h1 className="dashboard-title">Social Leaderboard</h1>

      <div className="social-leaderboard">
        <div className="leaderboard-header">
          <h2>{viewConfig.label} Leaderboard</h2>
          <div className="leaderboard-controls">
            <div className="leaderboard-toggle social-toggle">
              {Object.entries(SOCIAL_VIEWS).map(([key, config]) => (
                <button
                  key={key}
                  className={activeView === key ? 'active' : ''}
                  onClick={() => handleViewChange(key)}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="social-status">
          {fetchTime && (
            <span className="fetch-time">
              Last updated: {formatFetchTime(fetchTime)}
            </span>
          )}
        </div>

        {/* Error */}
        {error && !data.length && (
          <div className="social-error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Table */}
        {data.length > 0 && (
          <div className="table-wrapper" style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>User</th>
                  <th className="text-right">{viewConfig.headers[2]}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.userId}>
                    <td className="rank-cell">#{row.rank}</td>
                    <td className="user-cell">{row.displayName}</td>
                    <td className={`value-cell text-right ${row.isSentiment ? getSentimentClass(row.value) : ''}`}>
                      {row.isPercent
                        ? formatPercent(row.value)
                        : row.isSentiment
                          ? formatSentiment(row.value)
                          : formatNumber(row.value)
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Loading */}
        {loading && !data.length && (
          <div className="social-loading">Loading leaderboard...</div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => handlePageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="page-btn"
            >
              &lt; Prev
            </button>
            <span className="page-info">
              Page {page} of {totalPages} ({totalCount} users)
            </span>
            <button
              onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="page-btn"
            >
              Next &gt;
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
