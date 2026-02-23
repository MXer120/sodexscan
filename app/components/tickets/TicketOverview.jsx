'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

export default function TicketOverview({ counts, tickets }) {
  const router = useRouter()

  // Calculate unanswered: open tickets where no mod has responded
  const unanswered = (tickets || []).filter(t =>
    t.status === 'open' &&
    (!t.responding_mods || t.responding_mods.length === 0)
  )

  // ToDo: active tickets sorted by newest
  const todoTickets = (tickets || []).filter(t => t.status === 'open')
    .sort((a, b) => new Date(b.last_message || b.open_date || 0).getTime() - new Date(a.last_message || a.open_date || 0).getTime())
    .slice(0, 10)

  return (
    <div className="ticket-overview">
      {/* Stats cards */}
      <div className="ticket-overview-stats">
        <div className="ticket-overview-stat-card">
          <div className="ticket-overview-stat-value">{counts.active || 0}</div>
          <div className="ticket-overview-stat-label">Active</div>
        </div>
        <div className="ticket-overview-stat-card warning">
          <div className="ticket-overview-stat-value">{counts.inactive || 0}</div>
          <div className="ticket-overview-stat-label">Inactive</div>
        </div>
        <div className="ticket-overview-stat-card error">
          <div className="ticket-overview-stat-value">{unanswered.length}</div>
          <div className="ticket-overview-stat-label">Unanswered</div>
        </div>
        <div className="ticket-overview-stat-card muted">
          <div className="ticket-overview-stat-value">{counts.archived || 0}</div>
          <div className="ticket-overview-stat-label">Archived</div>
        </div>
      </div>

      {/* ToDo list */}
      <div className="ticket-overview-section">
        <h3 className="ticket-overview-section-title">ToDo — Recent Open Tickets</h3>
        <div className="ticket-overview-list">
          {todoTickets.length === 0 ? (
            <div className="ticket-empty">No open tickets</div>
          ) : (
            todoTickets.map(t => (
              <div
                key={t.id}
                className="ticket-overview-row"
                onClick={() => router.push(`/tickets/${t.id}`)}
              >
                <span className="ticket-overview-row-name">{t.channel_name || t.channel_id}</span>
                <span className={`ticket-progress ${(t.progress || 'new').toLowerCase()}`}>
                  {t.progress || 'new'}
                </span>
                <span className="ticket-overview-row-mods">
                  {t.responding_mods?.length
                    ? `${t.responding_mods.length} mod${t.responding_mods.length > 1 ? 's' : ''}`
                    : <span style={{ color: '#ef4444' }}>unanswered</span>
                  }
                </span>
                <span className="ticket-overview-row-time">
                  {t.last_message
                    ? new Date(t.last_message).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : '—'
                  }
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
