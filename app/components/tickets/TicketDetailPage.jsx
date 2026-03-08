'use client'

import React, { useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTickets } from '../../hooks/useTickets'
import { useTicketMessages } from '../../hooks/useTicketMessages'
import { useToggleStar } from '../../hooks/useTicketStars'
import { useDiscordUsers } from '../../hooks/useDiscordUser'
import TicketChat from './TicketChat'
import TicketRightPanel from './TicketRightPanel'
import TicketSidebar from './TicketSidebar'
import '../../styles/TicketDetail.css'
import { SkeletonCard } from '../Skeleton'
import '../../styles/TicketsPage.css'

export default function TicketDetailPage({ ticketId }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = parseInt(ticketId, 10)
  const toggleStar = useToggleStar()

  // Get the section user came from (default to 'active')
  const fromSection = searchParams.get('from') || 'active'

  // Find ticket from all lists
  const activeQ = useTickets('active')
  const archivedQ = useTickets('archived')
  const inactiveQ = useTickets('inactive')
  const starredQ = useTickets('starred')

  const counts = useMemo(() => ({
    starred: starredQ.data?.length || 0,
    active: activeQ.data?.length || 0,
    inactive: inactiveQ.data?.length || 0,
    archived: archivedQ.data?.length || 0,
  }), [starredQ.data, activeQ.data, inactiveQ.data, archivedQ.data])

  // Get the list for current section to compute prev/next
  const sectionTickets = useMemo(() => {
    const listMap = {
      starred: starredQ.data,
      active: activeQ.data,
      inactive: inactiveQ.data,
      archived: archivedQ.data,
    }
    return listMap[fromSection] || activeQ.data || []
  }, [fromSection, starredQ.data, activeQ.data, inactiveQ.data, archivedQ.data])

  const currentIndex = useMemo(() => {
    if (!sectionTickets) return -1
    return sectionTickets.findIndex(t => t.id === id)
  }, [sectionTickets, id])

  const prevTicket = currentIndex > 0 ? sectionTickets[currentIndex - 1] : null
  const nextTicket = currentIndex >= 0 && currentIndex < (sectionTickets?.length || 0) - 1 ? sectionTickets[currentIndex + 1] : null

  // Build deduplicated ticket lookup
  const ticket = useMemo(() => {
    const all = [
      ...(activeQ.data || []),
      ...(archivedQ.data || []),
      ...(inactiveQ.data || []),
      ...(starredQ.data || []),
    ]
    const seen = new Set()
    return all.find(t => {
      if (seen.has(t.id)) return false
      seen.add(t.id)
      return t.id === id
    })
  }, [activeQ.data, archivedQ.data, inactiveQ.data, starredQ.data, id])

  const { data: messages, isLoading: msgsLoading } = useTicketMessages(id)

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

  // Navigate to different section from sidebar
  const handleFilterChange = (section) => {
    router.push(`/tickets?section=${section}`)
  }

  const navPrev = () => {
    if (prevTicket) router.push(`/tickets/${prevTicket.id}?from=${fromSection}`)
  }
  const navNext = () => {
    if (nextTicket) router.push(`/tickets/${nextTicket.id}?from=${fromSection}`)
  }
  const navBackToSection = () => {
    router.push(`/tickets?section=${fromSection}`)
  }

  if (isLoading) {
    return (
      <div className="ticket-detail-container">
        <div className="ticket-loading"><SkeletonCard count={2} /></div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="ticket-detail-container">
        <div className="tickets-layout">
          <TicketSidebar activeFilter={fromSection} onFilterChange={handleFilterChange} counts={counts} />
          <div className="ticket-content">
            <button className="ticket-detail-back" onClick={navBackToSection}>
              ← Back to Tickets
            </button>
            <div className="ticket-empty">Ticket not found</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="ticket-detail-container">
      <div className="tickets-layout">
        <TicketSidebar activeFilter={fromSection} onFilterChange={handleFilterChange} counts={counts} />
        <div className="ticket-content" style={{ flex: 1, minWidth: 0 }}>
          {/* Prev/Next navigation */}
          <div className="ticket-detail-nav">
            <button
              className="ticket-nav-btn"
              onClick={navPrev}
              disabled={!prevTicket}
              title="Previous ticket"
            >
              ‹
            </button>
            <button
              className="ticket-nav-btn"
              onClick={navNext}
              disabled={!nextTicket}
              title="Next ticket"
            >
              ›
            </button>
            {sectionTickets?.length > 0 && (
              <span className="ticket-nav-counter">
                {currentIndex + 1} / {sectionTickets.length}
              </span>
            )}
            <button
              className="ticket-nav-section-btn"
              onClick={navBackToSection}
              title={`Back to ${fromSection}`}
            >
              ← {fromSection.charAt(0).toUpperCase() + fromSection.slice(1)}
            </button>
          </div>

          <div className="ticket-detail-header">
            <h1 className="ticket-detail-title">
              {ticket.channel_name || ticket.channel_id}
              <a
                href={`https://discord.com/channels/1009323027256848405/${ticket.channel_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ticket-discord-link"
                title="Open in Discord"
                onClick={e => e.stopPropagation()}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
              </a>
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

          <div className="ticket-detail-layout" style={{ padding: 0, margin: 0, maxWidth: 'none' }}>
            <div className="ticket-chat-area">
              <TicketChat messages={messages} loading={msgsLoading} discordUsers={discordUsers} />
            </div>
            <TicketRightPanel ticket={ticket} lastMessage={lastMessage} discordUsers={discordUsers} />
          </div>
        </div>
      </div>
    </div>
  )
}
