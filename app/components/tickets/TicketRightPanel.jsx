'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useDiscordUser } from '../../hooks/useDiscordUser'
import { useUpdateTicket } from '../../hooks/useUpdateTicket'
import { getSodexIdFromWallet } from '../../lib/accountResolver'

const PROJECT_OPTIONS = ['SoDEX', 'SoSoValue', 'SSI']
const PROGRESS_OPTIONS = ['new', 'waiting', 'attended', 'escalated', 'solved']

const OPTION_COLORS = {
  // Progress
  new: { bg: 'rgba(96, 165, 250, 0.25)', color: '#60a5fa' },
  waiting: { bg: 'rgba(251, 191, 36, 0.25)', color: '#fbbf24' },
  attended: { bg: 'rgba(134, 239, 172, 0.2)', color: '#86efac' },
  escalated: { bg: 'rgba(248, 113, 113, 0.25)', color: '#f87171' },
  solved: { bg: 'rgba(74, 222, 128, 0.25)', color: '#4ade80' },
  closed: { bg: 'rgba(168, 162, 158, 0.25)', color: '#a8a29e' },
  // Projects
  sodex: { bg: 'rgba(129, 140, 248, 0.25)', color: '#818cf8' },
  sosovalue: { bg: 'rgba(74, 222, 128, 0.25)', color: '#4ade80' },
  ssi: { bg: 'rgba(251, 146, 60, 0.25)', color: '#fb923c' },
}

function getOptionColor(val) {
  if (!val) return null
  return OPTION_COLORS[val.toLowerCase().replace(/\s+/g, '')] || null
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

/** Extract username from ticket channel name: "ticket-ghormesabzi" → "ghormesabzi" */
function extractOpenerName(channelName) {
  if (!channelName) return null
  const match = channelName.match(/^ticket-(.+)$/i)
  return match ? match[1] : null
}

function EditableField({ label, value, field, ticketId, truncate = false, compact = false }) {
  const [editing, setEditing] = useState(false)
  const [localVal, setLocalVal] = useState(value || '')
  const updateTicket = useUpdateTicket()

  const save = () => {
    if (localVal !== (value || '')) {
      updateTicket.mutate({ ticketId, fields: { [field]: localVal || null } })
    }
    setEditing(false)
  }

  const displayValue = (truncate && value && value.length > 20)
    ? `${value.slice(0, 6)}...${value.slice(-4)}`
    : value;

  return (
    <div className={`ticket-right-section ${compact ? 'compact' : ''}`}>
      <div className="ticket-right-label">{label}</div>
      {editing ? (
        <input
          className="ticket-editable-field"
          value={localVal}
          onChange={e => setLocalVal(e.target.value)}
          onBlur={save}
          onKeyDown={e => e.key === 'Enter' && save()}
          autoFocus
        />
      ) : (
        <div
          className="ticket-right-value"
          style={{ cursor: 'pointer', minHeight: '20px' }}
          onClick={() => { setLocalVal(value || ''); setEditing(true) }}
          title="Click to edit"
        >
          {displayValue || <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Click to set</span>}
        </div>
      )}
    </div>
  )
}

function EditableTextArea({ label, value, field, ticketId }) {
  const [editing, setEditing] = useState(false)
  const [localVal, setLocalVal] = useState(value || '')
  const updateTicket = useUpdateTicket()

  const save = () => {
    if (localVal !== (value || '')) {
      updateTicket.mutate({ ticketId, fields: { [field]: localVal || null } })
    }
    setEditing(false)
  }

  return (
    <div className="ticket-right-section">
      <div className="ticket-right-label">{label}</div>
      {editing ? (
        <textarea
          className="ticket-editable-field"
          value={localVal}
          onChange={e => setLocalVal(e.target.value)}
          onBlur={save}
          autoFocus
          rows={4}
          style={{ resize: 'vertical', minHeight: '60px' }}
        />
      ) : (
        <div
          className="ticket-right-value"
          style={{ cursor: 'pointer', minHeight: '20px', whiteSpace: 'pre-wrap', fontSize: '13px' }}
          onClick={() => { setLocalVal(value || ''); setEditing(true) }}
          title="Click to edit"
        >
          {value || <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Click to set details</span>}
        </div>
      )}
    </div>
  )
}

function SelectField({ label, value, field, ticketId, options, allowNone = false, multi = false }) {
  const updateTicket = useUpdateTicket()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // For multi-select, value is comma-separated string
  const selected = multi ? (value || '').split(',').map(s => s.trim()).filter(Boolean) : []

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = (val) => {
    if (multi) {
      let next
      if (val === '') {
        next = ''
      } else if (selected.includes(val)) {
        next = selected.filter(s => s !== val).join(',')
      } else {
        next = [...selected, val].join(',')
      }
      updateTicket.mutate({ ticketId, fields: { [field]: next || null } })
    } else {
      updateTicket.mutate({ ticketId, fields: { [field]: val || null } })
      setOpen(false)
    }
  }

  const currentColor = getOptionColor(value)

  return (
    <div className="ticket-right-section">
      <div className="ticket-right-label">{label}</div>
      <div className="ticket-custom-select" ref={ref}>
        <div
          className="ticket-custom-select-trigger"
          onClick={() => setOpen(!open)}
        >
          {multi && selected.length > 0 ? (
            <span className="ticket-custom-select-multi">
              {selected.map(s => {
                const c = getOptionColor(s)
                return (
                  <span key={s} className="ticket-custom-select-badge" style={c ? { background: c.bg, color: c.color } : undefined}>
                    {s}
                  </span>
                )
              })}
            </span>
          ) : value && !multi ? (
            <span className="ticket-custom-select-badge" style={currentColor ? { background: currentColor.bg, color: currentColor.color } : undefined}>
              {value}
            </span>
          ) : (
            <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>— Select —</span>
          )}
          <svg className="ticket-custom-select-arrow" width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 12L2 6h12z" /></svg>
        </div>
        {open && (
          <div className="ticket-custom-select-dropdown">
            {allowNone && (
              <div className="ticket-custom-select-option" onClick={() => handleSelect('')}>
                <span style={{ color: 'var(--color-text-muted)' }}>— None —</span>
              </div>
            )}
            {options.map(opt => {
              const c = getOptionColor(opt)
              const isActive = multi ? selected.includes(opt) : value === opt
              return (
                <div key={opt} className={`ticket-custom-select-option ${isActive ? 'active' : ''}`} onClick={() => handleSelect(opt)}>
                  {multi && <span className="ticket-custom-select-check">{isActive ? '✓' : ''}</span>}
                  <span className="ticket-custom-select-badge" style={c ? { background: c.bg, color: c.color } : undefined}>
                    {opt}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const SCANNER_EAAS = [
  { name: 'BscScan', root: 'bscscan.com' },
  { name: 'Polygonscan', root: 'polygonscan.com' },
  { name: 'Arbiscan', root: 'arbiscan.io' },
  { name: 'Optimism', root: 'optimistic.etherscan.io' },
  { name: 'Snowscan', root: 'snowscan.xyz' },
  { name: 'Lineascan', root: 'lineascan.build' },
  { name: 'Scrollscan', root: 'scrollscan.com' },
  { name: 'Ftmscan', root: 'ftmscan.com' },
  { name: 'Moonscan', root: 'moonscan.io' },
  { name: 'Celoscan', root: 'celoscan.io' },
  { name: 'Gnosisscan', root: 'gnosisscan.io' },
  { name: 'Cronoscan', root: 'cronoscan.com' },
  { name: 'Blastscan', root: 'blastscan.io' },
  { name: 'Taikoscan', root: 'taikoscan.io' },
  { name: 'Sonicscan', root: 'sonicscan.org' },
  { name: 'Uniscan', root: 'uniscan.xyz' },
]

function ScannerLinks({ address, txId }) {
  const [showMore, setShowMore] = useState(false)
  const moreRef = useRef(null)

  useEffect(() => {
    function click(e) { if (moreRef.current && !moreRef.current.contains(e.target)) setShowMore(false) }
    document.addEventListener('mousedown', click)
    return () => document.removeEventListener('mousedown', click)
  }, [])

  if (!address && !txId) return null

  const mainScanners = [
    {
      name: 'CommunityScan',
      url: address ? `https://www.communityscan-sodex.com/tracker/${address}` : null,
      icon: <img src="/favicon.png" alt="CommunityScan" style={{ width: 14, height: 14, borderRadius: 2 }} />
    },
    {
      name: 'Blockscan',
      url: address ? `https://blockscan.com/address/${address}` : (txId ? `https://blockscan.com/tx/${txId}` : null),
      icon: <img src="/icons/blockscan.svg" alt="Blockscan" style={{ width: 14, height: 14 }} />
    },
    {
      name: 'Etherscan',
      url: address ? `https://etherscan.io/address/${address}` : (txId ? `https://etherscan.io/tx/${txId}` : null),
      icon: <img src="/icons/etherscan.svg" alt="Etherscan" style={{ width: 14, height: 14 }} />
    },
    {
      name: 'Basescan',
      url: address ? `https://basescan.org/address/${address}` : (txId ? `https://basescan.org/tx/${txId}` : null),
      icon: <img src="/icons/basescan.svg" alt="Basescan" style={{ width: 14, height: 14 }} />
    },
  ]

  return (
    <div className="ticket-scanner-row">
      {mainScanners.map(s => s.url && (
        <a key={s.name} href={s.url} target="_blank" rel="noreferrer" className="ticket-scanner-icon" title={s.name}>
          {s.icon}
        </a>
      ))}
      <div className="ticket-scanner-more" onClick={() => setShowMore(!showMore)} ref={moreRef}>
        More <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M8 12L2 6h12z" /></svg>
        {showMore && (
          <div className="ticket-scanner-dropdown">
            {SCANNER_EAAS.map(s => (
              <a
                key={s.name}
                href={address ? `https://${s.root}/address/${address}` : `https://${s.root}/tx/${txId}`}
                target="_blank"
                rel="noreferrer"
                className="ticket-scanner-dropdown-item"
              >
                {s.name}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ModChip({ modId, discordUsers }) {
  const mod = discordUsers?.find(u => u.id === modId)
  const name = mod?.display_name || mod?.username || modId
  return (
    <Link href={`/tickets/mod/${modId}`} className="ticket-mod-chip">
      {mod?.avatar_url ? (
        <img src={mod.avatar_url} alt="" className="ticket-mod-chip-avatar" />
      ) : (
        <span className="ticket-mod-chip-initial">{name[0]?.toUpperCase()}</span>
      )}
      <span>{name}</span>
    </Link>
  )
}

export default function TicketRightPanel({ ticket, lastMessage, discordUsers }) {
  const { data: opener } = useDiscordUser(ticket?.opener_discord_id)
  const updateTicket = useUpdateTicket()

  useEffect(() => {
    if (ticket?.wallet_address && !ticket.account_id) {
      getSodexIdFromWallet(ticket.wallet_address).then(id => {
        if (id && id !== ticket.account_id) {
          updateTicket.mutate({
            ticketId: ticket.id,
            fields: { account_id: id }
          })
        }
      })
    }
  }, [ticket?.wallet_address, ticket?.id, ticket?.account_id, updateTicket])

  if (!ticket) return null

  const respondingMods = ticket.responding_mods || ticket.assigned || []

  // Extract opener name from channel name if no discord user found
  const openerName = opener
    ? (opener.display_name || opener.username || 'Unknown')
    : extractOpenerName(ticket.channel_name) || ticket.opener_discord_id || '—'

  return (
    <div className="ticket-right-panel">
      <div className="ticket-right-card">
        {/* Opener info */}
        <div className="ticket-right-section">
          <div className="ticket-right-label">Opened By</div>
          {opener ? (
            <Link href={`/tickets/user/${opener.id}`} className="ticket-right-user-link">
              <div className="ticket-right-user">
                <div className="ticket-right-user-avatar">
                  {opener.avatar_url
                    ? <img src={opener.avatar_url} alt="" />
                    : (opener.display_name || opener.username || '?')[0]?.toUpperCase()
                  }
                </div>
                <span className="ticket-right-user-name">
                  {opener.display_name || opener.username || 'Unknown'}
                </span>
              </div>
            </Link>
          ) : (
            <div className="ticket-right-value">{openerName}</div>
          )}
        </div>

        {/* Last message */}
        <div className="ticket-right-section">
          <div className="ticket-right-label">Last Message</div>
          <div className="ticket-right-value">{formatDate(lastMessage)}</div>
        </div>

        <hr className="ticket-right-divider" />

        {/* Assigned (auto-detected responding mods) */}
        <div className="ticket-right-section">
          <div className="ticket-right-label">Responding Mods</div>
          {respondingMods.length > 0 ? (
            <div className="ticket-mod-chips">
              {respondingMods.map(modId => (
                <ModChip key={modId} modId={modId} discordUsers={discordUsers} />
              ))}
            </div>
          ) : (
            <div className="ticket-right-value" style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              No mods responded
            </div>
          )}
        </div>

        {/* Progress (select — no None option) */}
        <SelectField label="Progress" value={ticket.progress} field="progress" ticketId={ticket.id} options={PROGRESS_OPTIONS} />

        {/* Project (select — allow None + multi-select) */}
        <SelectField label="Project" value={ticket.project} field="project" ticketId={ticket.id} options={PROJECT_OPTIONS} allowNone multi />

        {/* Issue Type (editable text) */}
        <EditableField label="Issue Type" value={ticket.issue_type} field="issue_type" ticketId={ticket.id} />

        <hr className="ticket-right-divider" />

        {/* Details (editable textarea) */}
        <EditableTextArea label="Details" value={ticket.details} field="details" ticketId={ticket.id} />

        <hr className="ticket-right-divider" />

        {/* Wallet / TX */}
        <EditableField label="Wallet Address" value={ticket.wallet_address} field="wallet_address" ticketId={ticket.id} truncate={true} compact={true} />

        <ScannerLinks address={ticket.wallet_address} />

        <div style={{ height: '12px' }} />

        <EditableField label="Account ID" value={ticket.account_id} field="account_id" ticketId={ticket.id} truncate={true} />
        <EditableField label="TX ID" value={ticket.tx_id} field="tx_id" ticketId={ticket.id} truncate={true} compact={true} />

        <ScannerLinks txId={ticket.tx_id} />
      </div>
    </div>
  )
}
