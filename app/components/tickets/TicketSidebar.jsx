'use client'

import React from 'react'

const OverviewIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
  </svg>
)

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

const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

export default function TicketSidebar({ activeFilter, onFilterChange, counts }) {
  return (
    <aside className="ticket-sidebar">
      {/* Overview */}
      <div className="ticket-sidebar-title">Dashboard</div>
      <nav className="ticket-sidebar-nav">
        <button
          className={`ticket-sidebar-link ${activeFilter === 'overview' ? 'active' : ''}`}
          onClick={() => onFilterChange('overview')}
        >
          <OverviewIcon />
          Overview
        </button>
      </nav>

      {/* Tickets */}
      <div className="ticket-sidebar-title" style={{ marginTop: 20 }}>Tickets</div>
      <nav className="ticket-sidebar-nav">
        {[
          { id: 'starred', label: 'Starred', icon: <StarIcon /> },
          { id: 'active', label: 'Active', icon: <ActiveIcon /> },
          { id: 'inactive', label: 'Inactive', icon: <InactiveIcon /> },
          { id: 'archived', label: 'Archived', icon: <ArchiveIcon /> },
        ].map(f => (
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

      {/* Users */}
      <div className="ticket-sidebar-title" style={{ marginTop: 20 }}>People</div>
      <nav className="ticket-sidebar-nav">
        <button
          className={`ticket-sidebar-link ${activeFilter === 'users' ? 'active' : ''}`}
          onClick={() => onFilterChange('users')}
        >
          <UsersIcon />
          Users
        </button>
      </nav>
    </aside>
  )
}
