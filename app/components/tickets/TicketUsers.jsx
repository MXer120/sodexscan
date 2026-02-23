'use client'

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSessionContext } from '../../lib/SessionContext'
import { useAllMods, useModResponders, useSearchTicketOpeners, useTopTicketOpeners, useUserTickets, useDiscordUser, useDiscordUserStats } from '../../hooks/useDiscordUser'
import '../../styles/TicketDetail.css'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
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
function ScrollList({ items, renderItem, pageSize = 10 }) {
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const listRef = useRef(null)

  const handleScroll = useCallback((e) => {
    const el = e.target
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    if (nearBottom) {
      setVisibleCount(prev => Math.min(prev + pageSize, items.length))
    }
  }, [items.length, pageSize])

  useEffect(() => { setVisibleCount(pageSize) }, [items, pageSize])

  const visible = items.slice(0, visibleCount)

  return (
    <div
      className="ticket-users-list ticket-users-scroll-list"
      ref={listRef}
      onScroll={handleScroll}
    >
      {visible.map((item, i) => renderItem(item, i))}
      {visibleCount < items.length && (
        <div className="ticket-users-load-hint" onClick={() => setVisibleCount(prev => Math.min(prev + pageSize, items.length))}>
          ↓ Scroll for more ({items.length - visibleCount} remaining)
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
              <span className={`ticket-progress ${(t.progress || 'new').replace(/\s+/g, '-').toLowerCase()}`}>
                {t.progress || 'new'}
              </span>
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
  const { data: topOpeners, isLoading: openersLoading } = useTopTicketOpeners(20)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const { data: searchResults, isLoading: searchLoading } = useSearchTicketOpeners(searchQuery)

  // If a user is selected, show full profile
  if (selectedUser) {
    return (
      <div className="ticket-users-page">
        <UserProfileView discordId={selectedUser} onBack={() => setSelectedUser(null)} />
      </div>
    )
  }

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
            <div className="ticket-users-list"><div className="ticket-empty">No data</div></div>
          ) : (
            <ScrollList
              items={[...responders].sort((a, b) => (b.message_count || 0) - (a.message_count || 0))}
              pageSize={5}
              renderItem={(r) => (
                <Link key={r.id} href={`/tickets/mod/${r.id}`} className="ticket-users-row">
                  <UserAvatar user={{ ...r, is_mod: true }} />
                  <span className="ticket-users-name" style={{ color: '#b15d14' }}>
                    {r.display_name || r.username || r.id}
                  </span>
                  <span className="ticket-users-extra">{r.message_count || 0}</span>
                </Link>
              )}
            />
          )}
        </div>

        {/* Right: Tickets (ordered by tickets_responded) — mod only */}
        {isMod && (
          <div className="ticket-users-column">
            <h3 className="ticket-users-section-title">Tickets Assigned</h3>
            {respondersLoading ? (
              <div className="ticket-users-list"><div className="ticket-loading">Loading...</div></div>
            ) : !responders?.length ? (
              <div className="ticket-users-list"><div className="ticket-empty">No data</div></div>
            ) : (
              <ScrollList
                items={[...responders].sort((a, b) => (b.tickets_responded || 0) - (a.tickets_responded || 0))}
                pageSize={5}
                renderItem={(r) => (
                  <Link key={r.id} href={`/tickets/mod/${r.id}`} className="ticket-users-row">
                    <UserAvatar user={{ ...r, is_mod: true }} />
                    <span className="ticket-users-name" style={{ color: '#b15d14' }}>
                      {r.display_name || r.username || r.id}
                    </span>
                    <span className="ticket-users-extra">{r.tickets_responded || 0}</span>
                  </Link>
                )}
              />
            )}
          </div>
        )}
      </div>

      {/* Top ticket openers (default visible) + Search */}
      <div className="ticket-users-section">
        <h3 className="ticket-users-section-title">Search Users</h3>
        <input
          type="text"
          className="ticket-filter-input"
          placeholder="Search by username or display name..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        {searchQuery.length > 0 ? (
          <div className="ticket-users-list">
            {searchLoading ? (
              <div className="ticket-loading">Searching...</div>
            ) : !searchResults?.length ? (
              <div className="ticket-empty">No users found</div>
            ) : (
              searchResults.map(user => (
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
              ))
            )}
          </div>
        ) : (
          /* Show top 20 openers by default */
          <div className="ticket-users-list">
            {openersLoading ? (
              <div className="ticket-loading">Loading top users...</div>
            ) : !topOpeners?.length ? (
              <div className="ticket-empty">No ticket openers</div>
            ) : (
              topOpeners.map(user => (
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
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
