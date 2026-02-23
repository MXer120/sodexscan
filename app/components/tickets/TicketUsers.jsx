'use client'

import React from 'react'
import Link from 'next/link'
import { useAllMods, useTopTicketOpeners, useRecentTicketOpeners } from '../../hooks/useDiscordUser'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

function UserRow({ user, extra, link }) {
  const name = user.display_name || user.username || user.id
  return (
    <Link href={link} className="ticket-users-row">
      <div className="ticket-users-avatar">
        {user.avatar_url
          ? <img src={user.avatar_url} alt="" />
          : name[0]?.toUpperCase() || '?'
        }
      </div>
      <span className={`ticket-users-name ${user.is_mod ? 'mod' : ''}`}>{name}</span>
      {extra && <span className="ticket-users-extra">{extra}</span>}
    </Link>
  )
}

export default function TicketUsers() {
  const { data: mods, isLoading: modsLoading } = useAllMods()
  const { data: topOpeners, isLoading: topLoading } = useTopTicketOpeners(15)
  const { data: recentOpeners, isLoading: recentLoading } = useRecentTicketOpeners(15)

  return (
    <div className="ticket-users-page">
      {/* Mods */}
      <div className="ticket-users-section">
        <h3 className="ticket-users-section-title">Moderators</h3>
        <div className="ticket-users-list">
          {modsLoading ? (
            <div className="ticket-loading">Loading...</div>
          ) : !mods?.length ? (
            <div className="ticket-empty">No mods found</div>
          ) : (
            mods.map(mod => (
              <UserRow
                key={mod.id}
                user={{ ...mod, is_mod: true }}
                extra={`${mod.message_count} msgs · ${mod.ticket_count} tickets`}
                link={`/tickets/mod/${mod.id}`}
              />
            ))
          )}
        </div>
      </div>

      {/* Recent ticket openers */}
      <div className="ticket-users-section">
        <h3 className="ticket-users-section-title">Recent Ticket Openers</h3>
        <div className="ticket-users-list">
          {recentLoading ? (
            <div className="ticket-loading">Loading...</div>
          ) : !recentOpeners?.length ? (
            <div className="ticket-empty">No recent openers</div>
          ) : (
            recentOpeners.map((opener, i) => (
              <Link
                key={`${opener.id}-${i}`}
                href={`/tickets/${opener.ticket_id}`}
                className="ticket-users-row"
              >
                <div className="ticket-users-avatar">
                  {opener.avatar_url
                    ? <img src={opener.avatar_url} alt="" />
                    : (opener.display_name || opener.username || '?')[0]?.toUpperCase()
                  }
                </div>
                <span className="ticket-users-name">
                  {opener.display_name || opener.username || opener.id}
                </span>
                <span className="ticket-users-ticket-name">{opener.ticket_name}</span>
                <span className="ticket-users-extra">{formatDate(opener.open_date)}</span>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Top ticket openers */}
      <div className="ticket-users-section">
        <h3 className="ticket-users-section-title">Top Ticket Openers</h3>
        <div className="ticket-users-list">
          {topLoading ? (
            <div className="ticket-loading">Loading...</div>
          ) : !topOpeners?.length ? (
            <div className="ticket-empty">No openers found</div>
          ) : (
            topOpeners.map(opener => (
              <UserRow
                key={opener.id}
                user={opener}
                extra={`${opener.ticket_count} tickets`}
                link={`/tickets/user/${opener.id}`}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
