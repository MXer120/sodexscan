'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTickets } from '../../hooks/useTickets'
import TicketSidebar from './TicketSidebar'
import TicketTable from './TicketTable'
import TicketOverview from './TicketOverview'
import TicketUsers from './TicketUsers'
import TicketExport from './TicketExport'
import '../../styles/TicketsPage.css'

export default function TicketsPage() {
  const searchParams = useSearchParams()
  const initialSection = searchParams.get('section') || 'overview'
  const [filter, setFilter] = useState(initialSection)

  // Sync filter when URL changes (back navigation)
  useEffect(() => {
    const section = searchParams.get('section')
    if (section && section !== filter) setFilter(section)
  }, [searchParams])

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
    export: 'Export',
  }

  const renderContent = () => {
    if (filter === 'overview') {
      return <TicketOverview counts={counts} tickets={allTickets} onFilterChange={setFilter} />
    }
    if (filter === 'users') {
      return <TicketUsers />
    }
    if (filter === 'export') {
      const sectionData = {
        starred: starred.data || [],
        active: active.data || [],
        inactive: inactive.data || [],
        archived: archived.data || [],
      }
      return <TicketExport allTickets={allTickets} sectionData={sectionData} currentFilter={filter} />
    }
    return (
      <TicketTable
        tickets={current?.data || []}
        loading={current?.isLoading}
        currentFilter={filter}
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
