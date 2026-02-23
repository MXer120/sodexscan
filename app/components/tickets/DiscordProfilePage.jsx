'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useDiscordUser, useDiscordUserStats } from '../../hooks/useDiscordUser'
import { useTickets } from '../../hooks/useTickets'
import '../../styles/TicketDetail.css'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function DiscordProfilePage({ discordId }) {
  const router = useRouter()
  const { data: discordUser, isLoading } = useDiscordUser(discordId)
  const { data: stats } = useDiscordUserStats(discordId)
  const { data: allTickets } = useTickets('active')
  const { data: archivedTickets } = useTickets('archived')

  const userTickets = React.useMemo(() => {
    const all = [...(allTickets || []), ...(archivedTickets || [])]
    const seen = new Set()
    return all.filter(t => {
      if (seen.has(t.id)) return false
      seen.add(t.id)
      return t.opener_discord_id === discordId || t.assigned === discordId
    })
  }, [allTickets, archivedTickets, discordId])

  if (isLoading) {
    return (
      <div className="discord-profile-container">
        <div className="ticket-loading">Loading...</div>
      </div>
    )
  }

  return (
    <div className="discord-profile-container">
      <div className="discord-profile-content">
        <button className="ticket-detail-back" onClick={() => router.push('/tickets')}>
          ← Back to Tickets
        </button>

        <div className="discord-profile-header">
          <div className="discord-profile-avatar">
            {discordUser?.avatar_url
              ? <img src={discordUser.avatar_url} alt="" />
              : (discordUser?.display_name || discordUser?.username || '?')[0]?.toUpperCase()
            }
          </div>
          <div>
            <div className="discord-profile-name">
              {discordUser?.display_name || discordUser?.username || discordId}
              {discordUser?.is_mod && <span className="discord-profile-mod-badge">MOD</span>}
            </div>
            {discordUser?.username && (
              <div className="discord-profile-username">@{discordUser.username}</div>
            )}
          </div>
        </div>

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

        <div className="discord-profile-tickets">
          <div className="discord-profile-tickets-title">Ticket History</div>
          {userTickets.length === 0 ? (
            <div className="ticket-empty">No tickets</div>
          ) : (
            userTickets.map(t => (
              <div
                key={t.id}
                className="discord-profile-ticket-row"
                onClick={() => router.push(`/tickets/${t.id}`)}
              >
                <span className={`ticket-progress ${(t.progress || 'new').replace(/\s+/g, '-').toLowerCase()}`}>
                  {t.status}
                </span>
                <span className="discord-profile-ticket-name">
                  {t.channel_name || t.channel_id}
                </span>
                <span className="discord-profile-ticket-date">
                  {formatDate(t.open_date)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
