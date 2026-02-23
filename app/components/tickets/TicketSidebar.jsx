'use client'

import React from 'react'

const StarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

const ActiveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

const InactiveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
)

const ArchiveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="21 8 21 21 3 21 3 8" />
    <rect x="1" y="3" width="22" height="5" />
    <line x1="10" y1="12" x2="14" y2="12" />
  </svg>
)

const FILTERS = [
  { id: 'starred', label: 'Starred', icon: <StarIcon /> },
  { id: 'active', label: 'Active', icon: <ActiveIcon /> },
  { id: 'inactive', label: 'Inactive', icon: <InactiveIcon /> },
  { id: 'archived', label: 'Archived', icon: <ArchiveIcon /> },
]

export default function TicketSidebar({ activeFilter, onFilterChange, counts }) {
  return (
    <aside className="ticket-sidebar">
      <div className="ticket-sidebar-title">Tickets</div>
      <nav className="ticket-sidebar-nav">
        {FILTERS.map(f => (
          <button
            key={f.id}
            className={`ticket-sidebar-link ${activeFilter === f.id ? 'active' : ''}`}
            onClick={() => onFilterChange(f.id)}
          >
            {f.icon}
            {f.label}
            {counts[f.id] !== undefined && (
              <span className="ticket-sidebar-count">{counts[f.id]}</span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  )
}
