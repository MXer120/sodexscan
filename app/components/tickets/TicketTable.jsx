'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useToggleStar } from '../../hooks/useTicketStars'
import { useDiscordUsers } from '../../hooks/useDiscordUser'

const DISCORD_GUILD = '1009323027256848405'

const ALL_COLUMNS = [
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

const PROJECT_COLORS = {
  sodex: { bg: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' },
  sosovalue: { bg: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' },
  ssi: { bg: 'rgba(249, 115, 22, 0.15)', color: '#fb923c' },
}

function truncateWallet(addr) {
  if (!addr) return '—'
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`
}

function CopyableWallet({ value }) {
  const [copied, setCopied] = useState(false)
  if (!value) return <span>—</span>
  const handleCopy = (e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <span className="ticket-wallet-cell" title={value}>
      {truncateWallet(value)}
      <span className="ticket-wallet-copy" onClick={handleCopy}>
        {copied ? '✓' : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        )}
      </span>
    </span>
  )
}

function DiscordLinkIcon({ channelId }) {
  return (
    <a
      href={`https://discord.com/channels/${DISCORD_GUILD}/${channelId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="ticket-discord-link"
      title="Open in Discord"
      onClick={e => e.stopPropagation()}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
    </a>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

function truncate(str, len = 30) {
  if (!str) return '—'
  return str.length > len ? str.slice(0, len) + '...' : str
}

/** Resolve mod usernames for CSV export */
function resolveModNames(modIds, discordUsers) {
  if (!modIds || !discordUsers) return ''
  return modIds.map(id => {
    const u = discordUsers.find(du => du.id === id)
    return u?.display_name || u?.username || id
  }).join('; ')
}

function exportCSV(tickets, discordUsers) {
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

/** Overlapping mod avatar stack */
function ModAvatarStack({ modIds, discordUsers }) {
  if (!modIds || modIds.length === 0) return <span style={{ color: 'var(--color-text-muted)' }}>—</span>

  return (
    <div className="mod-avatar-stack" onClick={e => e.stopPropagation()}>
      {modIds.slice(0, 5).map((modId, i) => {
        const mod = discordUsers?.find(u => u.id === modId)
        const name = mod?.display_name || mod?.username || modId
        return (
          <div
            key={modId}
            className="mod-avatar-stack-item"
            style={{ zIndex: modIds.length - i }}
            title={name}
          >
            {mod?.avatar_url ? (
              <img src={mod.avatar_url} alt="" />
            ) : (
              <span>{name[0]?.toUpperCase()}</span>
            )}
          </div>
        )
      })}
      {modIds.length > 5 && (
        <div className="mod-avatar-stack-item mod-avatar-stack-more" style={{ zIndex: 0 }}>
          +{modIds.length - 5}
        </div>
      )}
    </div>
  )
}

export default function TicketTable({ tickets, loading, currentFilter }) {
  const router = useRouter()
  const toggleStar = useToggleStar()
  const [sortKey, setSortKey] = useState('open_date')
  const [sortDir, setSortDir] = useState('desc')
  const [filterText, setFilterText] = useState('')

  // Hide 'closed' column in active section
  const COLUMNS = useMemo(() => {
    if (currentFilter === 'active') return ALL_COLUMNS.filter(c => c.key !== 'close_date')
    return ALL_COLUMNS
  }, [currentFilter])

  // Collect all unique mod IDs across tickets for batch fetch
  const allModIds = useMemo(() => {
    const ids = new Set()
    ;(tickets || []).forEach(t => {
      (t.responding_mods || []).forEach(id => ids.add(id))
    })
    return [...ids]
  }, [tickets])

  const { data: discordUsers } = useDiscordUsers(allModIds)

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
                <tr key={ticket.id} onClick={() => router.push(`/tickets/${ticket.id}?from=${currentFilter || 'active'}`)}>
                  <td onClick={e => e.stopPropagation()}>
                    <button
                      className={`ticket-star-btn ${ticket.is_starred ? 'starred' : ''}`}
                      onClick={() => toggleStar.mutate({ ticketId: ticket.id, isStarred: ticket.is_starred })}
                    >
                      {ticket.is_starred ? '★' : '☆'}
                    </button>
                  </td>
                  <td className="ticket-name">
                    {ticket.channel_name || ticket.channel_id}
                    <DiscordLinkIcon channelId={ticket.channel_id} />
                  </td>
                  <td className="ticket-date">{formatDate(ticket.open_date)}</td>
                  {currentFilter !== 'active' && (
                    <td className="ticket-date">{formatDate(ticket.close_date)}</td>
                  )}
                  <td>{truncate(ticket.details)}</td>
                  <td>
                    {ticket.project ? (
                      <span className={`ticket-project-badge ${ticket.project.toLowerCase().replace(/\s+/g, '')}`}>
                        {ticket.project}
                      </span>
                    ) : '—'}
                  </td>
                  <td>{ticket.issue_type || '—'}</td>
                  <td><CopyableWallet value={ticket.wallet_address || ticket.account_id} /></td>
                  <td>{truncate(ticket.tx_id, 16)}</td>
                  <td>
                    <span className={`ticket-progress ${(ticket.progress || 'new').replace(/\s+/g, '-').toLowerCase()}`}>
                      {ticket.progress || 'new'}
                    </span>
                  </td>
                  <td>
                    <ModAvatarStack modIds={ticket.responding_mods} discordUsers={discordUsers} />
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
