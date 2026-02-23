'use client'

import React, { useState, useMemo } from 'react'
import { useDiscordUsers } from '../../hooks/useDiscordUser'

function resolveModNames(modIds, discordUsers) {
  if (!modIds || !discordUsers) return ''
  return modIds.map(id => {
    const u = discordUsers.find(du => du.id === id)
    return u?.display_name || u?.username || id
  }).join('; ')
}

function doExport(tickets, discordUsers, format) {
  if (format === 'csv') {
    const headers = ['Ticket', 'Open Date', 'Close Date', 'Details', 'Project', 'Type', 'Wallet', 'Account ID', 'TX ID', 'Progress', 'Assigned']
    const rows = tickets.map(t => [
      t.channel_name || t.channel_id,
      t.open_date || '',
      t.close_date || '',
      (t.details || '').replace(/"/g, '""'),
      t.project || '',
      t.issue_type || '',
      t.wallet_address || '',
      t.account_id || '',
      t.tx_id || '',
      t.progress || '',
      resolveModNames(t.responding_mods, discordUsers),
    ])
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tickets_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } else {
    const blob = new Blob([JSON.stringify(tickets, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tickets_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
}

export default function TicketExport({ allTickets, sectionData, currentFilter }) {
  const [scope, setScope] = useState('full')
  const [sectionFilter, setSectionFilter] = useState('')
  const [format, setFormat] = useState('csv')
  const [projectFilter, setProjectFilter] = useState('')

  const allModIds = useMemo(() => {
    const ids = new Set()
    ;(allTickets || []).forEach(t => {
      (t.responding_mods || []).forEach(id => ids.add(id))
    })
    return [...ids]
  }, [allTickets])

  const { data: discordUsers } = useDiscordUsers(allModIds)

  const projects = useMemo(() => {
    const set = new Set()
    ;(allTickets || []).forEach(t => { if (t.project) set.add(t.project) })
    return [...set].sort()
  }, [allTickets])

  const ticketsToExport = useMemo(() => {
    let base = allTickets || []
    if (scope === 'section' && sectionFilter && sectionData?.[sectionFilter]) {
      base = sectionData[sectionFilter] || []
    }
    if (scope === 'project' && projectFilter) base = base.filter(t => t.project === projectFilter)
    return base
  }, [scope, allTickets, sectionData, sectionFilter, projectFilter])

  return (
    <div className="ticket-export-page">
      <div className="ticket-export-card">
        <h3 className="ticket-export-title">Export Tickets</h3>

        <div className="ticket-export-option">
          <div className="ticket-right-label">Scope</div>
          <div className="ticket-export-choices">
            {[
              { value: 'full', label: 'Full Documentation' },
              { value: 'section', label: 'By Section' },
              { value: 'project', label: 'By Project' },
            ].map(opt => (
              <button
                key={opt.value}
                className={`ticket-export-choice ${scope === opt.value ? 'active' : ''}`}
                onClick={() => setScope(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {scope === 'section' && (
          <div className="ticket-export-option">
            <div className="ticket-right-label">Section</div>
            <div className="ticket-export-choices">
              {['starred', 'active', 'inactive', 'archived'].map(s => (
                <button
                  key={s}
                  className={`ticket-export-choice ${sectionFilter === s ? 'active' : ''}`}
                  onClick={() => setSectionFilter(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {scope === 'project' && (
          <div className="ticket-export-option">
            <div className="ticket-right-label">Project</div>
            <div className="ticket-export-choices">
              {projects.map(p => (
                <button
                  key={p}
                  className={`ticket-export-choice ${projectFilter === p ? 'active' : ''}`}
                  onClick={() => setProjectFilter(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="ticket-export-option">
          <div className="ticket-right-label">Format</div>
          <div className="ticket-export-choices">
            <button className={`ticket-export-choice ${format === 'csv' ? 'active' : ''}`} onClick={() => setFormat('csv')}>CSV</button>
            <button className={`ticket-export-choice ${format === 'json' ? 'active' : ''}`} onClick={() => setFormat('json')}>JSON</button>
          </div>
        </div>

        <div className="ticket-export-summary">
          {ticketsToExport.length} tickets will be exported
        </div>

        <button
          className="ticket-export-download-btn"
          onClick={() => doExport(ticketsToExport, discordUsers, format)}
          disabled={ticketsToExport.length === 0}
        >
          Download {format.toUpperCase()}
        </button>
      </div>
    </div>
  )
}
