'use client'

import React, { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTickets } from '../../hooks/useTickets'
import { useTicketMessages } from '../../hooks/useTicketMessages'
import { useToggleStar } from '../../hooks/useTicketStars'
import { useDiscordUsers } from '../../hooks/useDiscordUser'
import TicketChat from './TicketChat'
import TicketRightPanel from './TicketRightPanel'
import '../../styles/TicketDetail.css'

export default function TicketDetailPage({ ticketId }) {
  const router = useRouter()
  const id = parseInt(ticketId, 10)
  const toggleStar = useToggleStar()

  // Find ticket from the active/archived list
  const activeQ = useTickets('active')
  const archivedQ = useTickets('archived')
  const inactiveQ = useTickets('inactive')
  const starredQ = useTickets('starred')

  const ticket = useMemo(() => {
    const all = [
      ...(activeQ.data || []),
      ...(archivedQ.data || []),
      ...(inactiveQ.data || []),
      ...(starredQ.data || []),
    ]
    // Deduplicate by id
    const seen = new Set()
    return all.find(t => {
      if (seen.has(t.id)) return false
      seen.add(t.id)
      return t.id === id
    })
  }, [activeQ.data, archivedQ.data, inactiveQ.data, starredQ.data, id])

  const { data: messages, isLoading: msgsLoading } = useTicketMessages(id)

  // Get unique author IDs to fetch discord users (for mod detection)
  const authorIds = useMemo(() => {
    if (!messages) return []
    return [...new Set(messages.map(m => m.author_id))]
  }, [messages])
  const { data: discordUsers } = useDiscordUsers(authorIds)

  const lastMessage = useMemo(() => {
    if (!messages || messages.length === 0) return null
    return messages[messages.length - 1]?.timestamp
  }, [messages])

  const isLoading = activeQ.isLoading && archivedQ.isLoading

  if (isLoading) {
    return (
      <div className="ticket-detail-container">
        <div className="ticket-loading">Loading...</div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="ticket-detail-container">
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
          <button className="ticket-detail-back" onClick={() => router.push('/tickets')}>
            ← Back to Tickets
          </button>
          <div className="ticket-empty">Ticket not found</div>
        </div>
      </div>
    )
  }

  return (
    <div className="ticket-detail-container">
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>
        <button className="ticket-detail-back" onClick={() => router.push('/tickets')}>
          ← Back to Tickets
        </button>

        <div className="ticket-detail-header">
          <h1 className="ticket-detail-title">
            {ticket.channel_name || ticket.channel_id}
          </h1>
          <span className={`ticket-detail-status ${ticket.status}`}>
            {ticket.status}
          </span>
          <button
            className={`ticket-star-btn ${ticket.is_starred ? 'starred' : ''}`}
            onClick={() => toggleStar.mutate({ ticketId: ticket.id, isStarred: ticket.is_starred })}
            style={{ fontSize: '20px' }}
          >
            {ticket.is_starred ? '★' : '☆'}
          </button>
        </div>
      </div>

      <div className="ticket-detail-layout">
        <div className="ticket-chat-area">
          <TicketChat messages={messages} loading={msgsLoading} discordUsers={discordUsers} />
        </div>
        <TicketRightPanel ticket={ticket} lastMessage={lastMessage} discordUsers={discordUsers} />
      </div>
    </div>
  )
}
