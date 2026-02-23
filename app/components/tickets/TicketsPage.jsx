'use client'

import React, { useState, useMemo } from 'react'
import { useTickets } from '../../hooks/useTickets'
import TicketSidebar from './TicketSidebar'
import TicketTable from './TicketTable'
import TicketOverview from './TicketOverview'
import TicketUsers from './TicketUsers'
import '../../styles/TicketsPage.css'

export default function TicketsPage() {
  const [filter, setFilter] = useState('overview')

  // Fetch all filters to get counts
  const starred = useTickets('starred')
  const active = useTickets('active')
  const inactive = useTickets('inactive')
  const archived = useTickets('archived')

  const counts = useMemo(() => ({
    starred: starred.data?.length || 0,
    active: active.data?.length || 0,
    inactive: inactive.data?.length || 0,
    archived: archived.data?.length || 0,
  }), [starred.data, active.data, inactive.data, archived.data])

  // All tickets for overview
  const allTickets = useMemo(() => {
    const seen = new Set()
    const all = [
      ...(active.data || []),
      ...(inactive.data || []),
      ...(archived.data || []),
      ...(starred.data || []),
    ]
    return all.filter(t => {
      if (seen.has(t.id)) return false
      seen.add(t.id)
      return true
    })
  }, [active.data, inactive.data, archived.data, starred.data])

  const current = { starred, active, inactive, archived }[filter]

  const titles = {
    overview: 'Overview',
    starred: 'Starred Tickets',
    active: 'Active Tickets',
    inactive: 'Inactive Tickets',
    archived: 'Archived Tickets',
    users: 'Users',
  }

  const renderContent = () => {
    if (filter === 'overview') {
      return <TicketOverview counts={counts} tickets={allTickets} />
    }
    if (filter === 'users') {
      return <TicketUsers />
    }
    return (
      <TicketTable
        tickets={current?.data || []}
        loading={current?.isLoading}
      />
    )
  }

  return (
    <div className="tickets-container">
      <div className="tickets-layout">
        <TicketSidebar
          activeFilter={filter}
          onFilterChange={setFilter}
          counts={counts}
        />
        <div className="ticket-content">
          <h1 className="ticket-content-title">{titles[filter]}</h1>
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
