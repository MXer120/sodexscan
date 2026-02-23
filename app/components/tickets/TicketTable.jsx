'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useToggleStar } from '../../hooks/useTicketStars'

const COLUMNS = [
  { key: 'star', label: '', sortable: false, width: '40px' },
  { key: 'channel_name', label: 'Ticket', sortable: true },
  { key: 'open_date', label: 'Opened', sortable: true },
  { key: 'close_date', label: 'Closed', sortable: true },
  { key: 'details', label: 'Details', sortable: true },
  { key: 'project', label: 'Project', sortable: true },
  { key: 'issue_type', label: 'Type', sortable: true },
  { key: 'wallet_address', label: 'Wallet/Account', sortable: true },
  { key: 'tx_id', label: 'TX ID', sortable: true },
  { key: 'progress', label: 'Progress', sortable: true },
  { key: 'assigned', label: 'Assigned', sortable: true },
]

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

function truncate(str, len = 30) {
  if (!str) return '—'
  return str.length > len ? str.slice(0, len) + '...' : str
}

function exportCSV(tickets) {
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
    (Array.isArray(t.assigned) ? t.assigned.join('; ') : t.assigned) || '',
  ])
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `tickets_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function exportJSON(tickets) {
  const blob = new Blob([JSON.stringify(tickets, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `tickets_${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export default function TicketTable({ tickets, loading }) {
  const router = useRouter()
  const toggleStar = useToggleStar()
  const [sortKey, setSortKey] = useState('open_date')
  const [sortDir, setSortDir] = useState('desc')
  const [filterText, setFilterText] = useState('')

  const handleSort = (key) => {
    if (!COLUMNS.find(c => c.key === key)?.sortable) return
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const filtered = useMemo(() => {
    if (!tickets) return []
    if (!filterText.trim()) return tickets
    const q = filterText.toLowerCase()
    return tickets.filter(t =>
      (t.channel_name || '').toLowerCase().includes(q) ||
      (t.details || '').toLowerCase().includes(q) ||
      (t.project || '').toLowerCase().includes(q) ||
      (t.issue_type || '').toLowerCase().includes(q) ||
      (t.wallet_address || '').toLowerCase().includes(q) ||
      (t.tx_id || '').toLowerCase().includes(q) ||
      (Array.isArray(t.assigned) ? t.assigned.join(' ') : (t.assigned || '')).toLowerCase().includes(q)
    )
  }, [tickets, filterText])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va = a[sortKey]
      let vb = b[sortKey]
      if (va == null) va = ''
      if (vb == null) vb = ''
      if (sortKey.includes('date') || sortKey === 'last_message') {
        va = va ? new Date(va).getTime() : 0
        vb = vb ? new Date(vb).getTime() : 0
      }
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered, sortKey, sortDir])

  return (
    <div>
      <div className="ticket-content-header">
        <div className="ticket-filter-row" style={{ flex: 1, padding: 0, border: 'none' }}>
          <input
            type="text"
            className="ticket-filter-input"
            placeholder="Filter tickets..."
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
          />
        </div>
        <div className="ticket-export-btns">
          <button className="ticket-export-btn" onClick={() => exportCSV(sorted)}>CSV</button>
          <button className="ticket-export-btn" onClick={() => exportJSON(sorted)}>JSON</button>
        </div>
      </div>

      <div className="ticket-table-wrapper">
        {loading ? (
          <div className="ticket-loading">Loading tickets...</div>
        ) : sorted.length === 0 ? (
          <div className="ticket-empty">No tickets found</div>
        ) : (
          <table className="ticket-table">
            <thead>
              <tr>
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    className={sortKey === col.key ? 'sorted' : ''}
                    onClick={() => handleSort(col.key)}
                    style={col.width ? { width: col.width } : undefined}
                  >
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      <span className="sort-arrow">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(ticket => (
                <tr key={ticket.id} onClick={() => router.push(`/tickets/${ticket.id}`)}>
                  <td onClick={e => e.stopPropagation()}>
                    <button
                      className={`ticket-star-btn ${ticket.is_starred ? 'starred' : ''}`}
                      onClick={() => toggleStar.mutate({ ticketId: ticket.id, isStarred: ticket.is_starred })}
                    >
                      {ticket.is_starred ? '★' : '☆'}
                    </button>
                  </td>
                  <td className="ticket-name">{ticket.channel_name || ticket.channel_id}</td>
                  <td className="ticket-date">{formatDate(ticket.open_date)}</td>
                  <td className="ticket-date">{formatDate(ticket.close_date)}</td>
                  <td>{truncate(ticket.details)}</td>
                  <td>{ticket.project || '—'}</td>
                  <td>{ticket.issue_type || '—'}</td>
                  <td>{truncate(ticket.wallet_address || ticket.account_id, 16)}</td>
                  <td>{truncate(ticket.tx_id, 16)}</td>
                  <td>
                    <span className={`ticket-progress ${(ticket.progress || 'new').replace(/\s+/g, '-').toLowerCase()}`}>
                      {ticket.progress || 'new'}
                    </span>
                  </td>
                  <td>
                    {Array.isArray(ticket.responding_mods) && ticket.responding_mods.length > 0
                      ? `${ticket.responding_mods.length} mod${ticket.responding_mods.length > 1 ? 's' : ''}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
