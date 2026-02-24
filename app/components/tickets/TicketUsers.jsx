'use client'

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSessionContext } from '../../lib/SessionContext'
import { useAllMods, useModResponders, useSearchTicketOpeners, useUserTickets, useDiscordUser, useDiscordUserStats } from '../../hooks/useDiscordUser'
import '../../styles/TicketDetail.css'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

function getTicketTag(t) {
  const hasMod = t.responding_mods && t.responding_mods.length > 0
  const hasOpener = !!t.last_opener_message

  if (!hasMod) {
    return hasOpener ? 'unattended' : 'new'
  }
  return (t.progress || 'new').toLowerCase()
}

function UserAvatar({ user }) {
  const name = user.display_name || user.username || '?'
  return (
    <div className="ticket-users-avatar">
      {user.avatar_url
        ? <img src={user.avatar_url} alt="" />
        : name[0]?.toUpperCase()
      }
    </div>
  )
}

/** Scrollable list that loads more items when scrolling to bottom */
function ScrollList({ items, renderItem, pageSize = 15 }) {
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const listRef = useRef(null)

  const handleScroll = useCallback((e) => {
    const el = e.target
    if (!el) return
    // Match homepage: scrollHeight - scrollTop - clientHeight < 50
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50
    if (nearBottom && visibleCount < items.length) {
      setVisibleCount(prev => Math.min(prev + pageSize, items.length))
    }
  }, [items.length, pageSize, visibleCount])

  useEffect(() => { setVisibleCount(pageSize) }, [items, pageSize])

  const visible = items.slice(0, visibleCount)

  return (
    <div
      className="ticket-users-list ticket-users-scroll-list"
      ref={listRef}
      onScroll={handleScroll}
      style={{ maxHeight: '400px', overflowY: 'auto' }}
    >
      {visible.map((item, i) => renderItem(item, i))}
      {visibleCount < items.length && (
        <div style={{ textAlign: 'center', padding: '10px', color: '#666', fontSize: '11px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
          Scroll for more...
        </div>
      )}
    </div>
  )
}

function UserProfileView({ discordId, onBack }) {
  const { data: discordUser, isLoading: userLoading } = useDiscordUser(discordId)
  const { data: stats } = useDiscordUserStats(discordId)
  const { data: tickets, isLoading: ticketsLoading } = useUserTickets(discordId)
  const [filterProgress, setFilterProgress] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [sortBy, setSortBy] = useState('last_message')
  const router = useRouter()

  const filtered = useMemo(() => {
    if (!tickets) return []
    let result = [...tickets]
    if (filterProgress) result = result.filter(t => t.progress === filterProgress)
    if (filterProject) result = result.filter(t => t.project === filterProject)
    result.sort((a, b) => {
      const va = sortBy === 'open_date' ? (a.open_date || '') : (a.last_message || a.open_date || '')
      const vb = sortBy === 'open_date' ? (b.open_date || '') : (b.last_message || b.open_date || '')
      return new Date(vb).getTime() - new Date(va).getTime()
    })
    return result
  }, [tickets, filterProgress, filterProject, sortBy])

  if (userLoading) return <div className="ticket-loading">Loading...</div>

  const name = discordUser?.display_name || discordUser?.username || discordId

  return (
    <div className="ticket-user-profile">
      <button className="ticket-detail-back" onClick={onBack}>← Back to Users</button>

      {/* Profile header — same as mod page */}
      <div className="discord-profile-header">
        <div className="discord-profile-avatar">
          {discordUser?.avatar_url
            ? <img src={discordUser.avatar_url} alt="" />
            : name[0]?.toUpperCase()
          }
        </div>
        <div>
          <div className="discord-profile-name" style={discordUser?.is_mod ? { color: '#b15d14' } : undefined}>
            {name}
          </div>
          {discordUser?.username && (
            <div className="discord-profile-username">@{discordUser.username}</div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="discord-profile-stats">
        <div className="discord-profile-stat">
          <div className="discord-profile-stat-value">{stats?.tickets_opened ?? 0}</div>
          <div className="discord-profile-stat-label">Tickets Opened</div>
        </div>
        <div className="discord-profile-stat">
          <div className="discord-profile-stat-value">{stats?.tickets_assigned ?? 0}</div>
          <div className="discord-profile-stat-label">Tickets Assigned</div>
        </div>
        <div className="discord-profile-stat">
          <div className="discord-profile-stat-value">{stats?.messages_sent ?? 0}</div>
          <div className="discord-profile-stat-label">Messages Sent</div>
        </div>
      </div>

      {/* Ticket table with header */}
      <div className="discord-profile-tickets">
        <div className="discord-profile-tickets-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span>{filtered.length} Tickets</span>
          <div className="ticket-user-history-filters">
            <select className="ticket-editable-field" value={filterProgress} onChange={e => setFilterProgress(e.target.value)} style={{ width: 'auto', fontSize: '12px' }}>
              <option value="">All Progress</option>
              <option value="new">New</option>
              <option value="waiting">Waiting</option>
              <option value="escalated">Escalated</option>
              <option value="solved">Solved</option>
            </select>
            <select className="ticket-editable-field" value={filterProject} onChange={e => setFilterProject(e.target.value)} style={{ width: 'auto', fontSize: '12px' }}>
              <option value="">All Projects</option>
              <option value="SoDEX">SoDEX</option>
              <option value="SoSoValue">SoSoValue</option>
              <option value="SSI">SSI</option>
            </select>
            <select className="ticket-editable-field" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: 'auto', fontSize: '12px' }}>
              <option value="last_message">Last Message</option>
              <option value="open_date">Open Date</option>
            </select>
          </div>
        </div>
        {ticketsLoading ? (
          <div className="ticket-loading">Loading tickets...</div>
        ) : filtered.length === 0 ? (
          <div className="ticket-empty">No tickets found</div>
        ) : (
          filtered.map(t => (
            <div
              key={t.id}
              className="discord-profile-ticket-row"
              onClick={() => router.push(`/tickets/${t.id}`)}
            >
              {(() => {
                const tag = getTicketTag(t)
                return (
                  <span className={`ticket-progress ${tag}`}>
                    {tag}
                  </span>
                )
              })()}
              <span className="discord-profile-ticket-name">
                {t.channel_name || t.channel_id}
              </span>
              <span className="ticket-users-extra">{t.status}</span>
              <span className="discord-profile-ticket-date">
                {formatDate(t.last_message || t.open_date)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function TicketUsers() {
  const { isMod } = useSessionContext()
  const { data: responders, isLoading: respondersLoading } = useModResponders()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const pageSize = 10

  const { data: searchResults, isLoading: searchLoading } = useSearchTicketOpeners(searchQuery, statusFilter, page, pageSize)

  // Reset page when search or status changes
  useEffect(() => {
    setPage(0)
  }, [searchQuery, statusFilter])

  // If a user is selected, show full profile
  if (selectedUser) {
    return (
      <div className="ticket-users-page">
        <UserProfileView discordId={selectedUser} onBack={() => setSelectedUser(null)} />
      </div>
    )
  }

  const totalCount = searchResults?.[0]?.total_count || 0
  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="ticket-users-page">
      {/* Mods side by side: Responses (mod message leaderboard) + Tickets (tickets responded to) */}
      <div className="ticket-users-columns">
        {/* Left: Responses (ordered by message_count) */}
        <div className="ticket-users-column">
          <h3 className="ticket-users-section-title">Responses</h3>
          {respondersLoading ? (
            <div className="ticket-users-list"><div className="ticket-loading">Loading...</div></div>
          ) : !responders?.length ? (
            <div className="ticket-users-list"><div className="ticket-empty">No mod data</div></div>
          ) : (
            <ScrollList
              items={[...responders].sort((a, b) => (Number(b.message_count) || 0) - (Number(a.message_count) || 0))}
              pageSize={10}
              renderItem={(r) => (
                <Link key={r.id} href={`/tickets/mod/${r.id}`} className="ticket-users-row">
                  <UserAvatar user={{ ...r, is_mod: true }} />
                  <span className="ticket-users-name" style={{ color: '#b15d14' }}>
                    {r.display_name || r.username || r.id}
                  </span>
                  <span className="ticket-users-extra">{Number(r.message_count) || 0}</span>
                </Link>
              )}
            />
          )}
        </div>

        {/* Right: Tickets Assigned — mod only */}
        {isMod && (
          <div className="ticket-users-column">
            <h3 className="ticket-users-section-title">Tickets Assigned</h3>
            {respondersLoading ? (
              <div className="ticket-users-list"><div className="ticket-loading">Loading...</div></div>
            ) : !responders?.length ? (
              <div className="ticket-users-list"><div className="ticket-empty">No mod data</div></div>
            ) : (
              <ScrollList
                items={[...responders].sort((a, b) => (Number(b.tickets_assigned) || 0) - (Number(a.tickets_assigned) || 0))}
                pageSize={10}
                renderItem={(r) => (
                  <Link key={r.id} href={`/tickets/mod/${r.id}`} className="ticket-users-row">
                    <UserAvatar user={{ ...r, is_mod: true }} />
                    <span className="ticket-users-name" style={{ color: '#b15d14' }}>
                      {r.display_name || r.username || r.id}
                    </span>
                    <span className="ticket-users-extra">{Number(r.tickets_assigned) || 0}</span>
                  </Link>
                )}
              />
            )}
          </div>
        )}
      </div>

      {/* Search / All Users */}
      <div className="ticket-users-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
          <h3 className="ticket-users-section-title" style={{ margin: 0 }}>Users</h3>
          <div style={{ display: 'flex', gap: 8, flex: 1, maxWidth: 400 }}>
            <input
              type="text"
              className="ticket-filter-input"
              placeholder="Search users..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ flex: 1 }}
            />
            <select
              className="ticket-editable-field"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ width: 'auto', fontSize: '12px' }}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="starred">Starred</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div className="ticket-users-list">
          {searchLoading ? (
            <div className="ticket-loading">Loading users...</div>
          ) : (!searchResults || searchResults.length === 0) ? (
            <div className="ticket-empty">No users found</div>
          ) : (
            <>
              {(searchResults || []).map(user => (
                <div
                  key={user.id}
                  className="ticket-users-row"
                  onClick={() => setSelectedUser(user.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <UserAvatar user={user} />
                  <span className="ticket-users-name" style={user.is_mod ? { color: '#b15d14' } : undefined}>
                    {user.display_name || user.username || user.id}
                  </span>
                  <span className="ticket-users-extra">{user.ticket_count} tickets</span>
                </div>
              ))}

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="ticket-pagination" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '16px', borderTop: '1px solid var(--color-border-subtle)' }}>
                  <button
                    className="ticket-nav-btn"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    ‹
                  </button>
                  <span className="ticket-nav-counter" style={{ margin: 0 }}>
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    className="ticket-nav-btn"
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    ›
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
