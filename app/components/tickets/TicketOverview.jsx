'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useUpdateTicket } from '../../hooks/useUpdateTicket'

const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000

/** 
 * Effective tag logic:
 * 1. No mod response AND opener wrote message -> unattended (Red)
 * 2. No mod response AND opener NO message -> new (Blue)
 * 3. Mod responded -> use t.progress (waiting, attended, etc)
 */
function getTicketTag(t) {
  const hasMod = t.responding_mods && t.responding_mods.length > 0
  const hasOpener = !!t.last_opener_message

  if (!hasMod) {
    return hasOpener ? 'unattended' : 'new'
  }
  return (t.progress || 'new').toLowerCase()
}

/** Sort order: unattended(0) → waiting(1) → new(2) → attended(3) → escalated(4) → solved(5) */
function todoSortOrder(ticket) {
  const tag = getTicketTag(ticket)
  const order = { unattended: 0, waiting: 1, new: 2, attended: 3, escalated: 4, solved: 5 }
  return order[tag] ?? 99
}

export default function TicketOverview({ counts, tickets, onFilterChange }) {
  const router = useRouter()
  const updateTicket = useUpdateTicket()
  const [todoSort, setTodoSort] = useState('progress') // 'progress' | 'time' | 'name'
  const [todoDir, setTodoDir] = useState('asc')

  // Unattended: open tickets where opener wrote but no mod has responded
  const unattendedTickets = (tickets || []).filter(t =>
    t.status === 'open' &&
    (!t.responding_mods || t.responding_mods.length === 0) &&
    !!t.last_opener_message
  )

  // Inactive: open + last non-mod msg > 48h
  const now = Date.now()
  const inactiveTickets = useMemo(() =>
    (tickets || []).filter(t => {
      if (t.status !== 'open') return false
      if (!t.last_non_mod_message) return false
      return now - new Date(t.last_non_mod_message).getTime() > FORTY_EIGHT_HOURS
    }).sort((a, b) => new Date(a.last_non_mod_message || 0).getTime() - new Date(b.last_non_mod_message || 0).getTime())
      .slice(0, 10)
    , [tickets])

  // ToDo: open tickets, default sort: unanswered → waiting → new → escalated → solved
  const todoTickets = useMemo(() => {
    const open = (tickets || []).filter(t => t.status === 'open')
    return [...open].sort((a, b) => {
      let cmp = 0
      if (todoSort === 'progress') {
        cmp = todoSortOrder(a) - todoSortOrder(b)
      } else if (todoSort === 'time') {
        const ta = new Date(a.last_message || a.open_date || 0).getTime()
        const tb = new Date(b.last_message || b.open_date || 0).getTime()
        cmp = ta - tb
      } else if (todoSort === 'name') {
        cmp = (a.channel_name || '').localeCompare(b.channel_name || '')
      }
      return todoDir === 'asc' ? cmp : -cmp
    }).slice(0, 15)
  }, [tickets, todoSort, todoDir])

  const handleTodoSort = (key) => {
    if (todoSort === key) setTodoDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setTodoSort(key); setTodoDir('asc') }
  }

  const handleReadyToClose = (e, ticketId) => {
    e.stopPropagation()
    updateTicket.mutate({ ticketId, fields: { progress: 'solved' } })
  }

  // Waiting: open tickets where it's the customer's turn to speak (progress === 'waiting')
  const waitingCount = (tickets || []).filter(t =>
    t.status === 'open' && t.progress === 'waiting'
  ).length

  const statCards = [
    { label: 'Active', value: counts.active || 0, filter: 'active', className: 'active' },
    { label: 'Waiting', value: waitingCount, filter: 'active', className: 'waiting' },
    { label: 'Unattended', value: unattendedTickets.length, filter: 'active', className: 'error' },
    { label: 'Inactive', value: counts.inactive || 0, filter: 'inactive', className: 'inactive' },
  ]

  return (
    <div className="ticket-overview">
      {/* Stats cards */}
      <div className="ticket-overview-stats">
        {statCards.map(card => (
          <div
            key={card.label}
            className={`ticket-overview-stat-card ${card.className}`}
            onClick={() => onFilterChange?.(card.filter)}
            style={{ cursor: 'pointer' }}
          >
            <div className="ticket-overview-stat-value">{card.value}</div>
            <div className="ticket-overview-stat-label">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Two tables side by side */}
      <div className="ticket-overview-tables">
        {/* ToDo list */}
        <div className="ticket-overview-section ticket-overview-todo">
          <h3 className="ticket-overview-section-title">ToDo</h3>
          <div className="ticket-overview-list">
            <div className="ticket-overview-table-header">
              <span className="ticket-overview-th" style={{ flex: 1 }} onClick={() => handleTodoSort('name')}>
                Ticket {todoSort === 'name' && (todoDir === 'asc' ? '↑' : '↓')}
              </span>
              <span className="ticket-overview-th" style={{ width: 80 }} onClick={() => handleTodoSort('progress')}>
                Status {todoSort === 'progress' && (todoDir === 'asc' ? '↑' : '↓')}
              </span>
              <span className="ticket-overview-th" style={{ width: 80, textAlign: 'right' }} onClick={() => handleTodoSort('time')}>
                Last {todoSort === 'time' && (todoDir === 'asc' ? '↑' : '↓')}
              </span>
            </div>
            {todoTickets.length === 0 ? (
              <div className="ticket-empty">No open tickets</div>
            ) : (
              todoTickets.map(t => {
                const tag = getTicketTag(t)
                return (
                  <div key={t.id} className="ticket-overview-row" onClick={() => router.push(`/tickets/${t.id}?from=overview`)}>
                    <span className="ticket-overview-row-name">{t.channel_name || t.channel_id}</span>
                    <span className={`ticket-progress ${tag}`}>
                      {tag}
                    </span>
                    <span className="ticket-overview-row-time">
                      {t.last_message ? new Date(t.last_message).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Inactive — Ready to close? */}
        <div className="ticket-overview-section ticket-overview-inactive">
          <h3 className="ticket-overview-section-title">Inactive — Ready to close?</h3>
          <div className="ticket-overview-list">
            {inactiveTickets.length === 0 ? (
              <div className="ticket-empty">No inactive tickets</div>
            ) : (
              inactiveTickets.map(t => {
                const tag = getTicketTag(t)
                return (
                  <div key={t.id} className="ticket-overview-row" onClick={() => router.push(`/tickets/${t.id}?from=inactive`)}>
                    <span className="ticket-overview-row-name">{t.channel_name || t.channel_id}</span>
                    <span className={`ticket-progress ${tag}`}>
                      {tag}
                    </span>
                    <span className="ticket-overview-row-time">
                      {t.last_non_mod_message ? new Date(t.last_non_mod_message).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                    </span>
                    <button
                      className="ticket-ready-close-btn"
                      onClick={(e) => handleReadyToClose(e, t.id)}
                      title="Mark as solved"
                    >
                      ✓ Close
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
