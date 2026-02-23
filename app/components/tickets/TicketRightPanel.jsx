'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useDiscordUser } from '../../hooks/useDiscordUser'
import { useUpdateTicket } from '../../hooks/useUpdateTicket'

const PROJECT_OPTIONS = ['SoDEX', 'SoSoValue', 'SSI']
const PROGRESS_OPTIONS = ['new', 'waiting', 'escalated', 'solved']

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function EditableField({ label, value, field, ticketId }) {
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
          {value || <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Click to set</span>}
        </div>
      )}
    </div>
  )
}

function SelectField({ label, value, field, ticketId, options }) {
  const updateTicket = useUpdateTicket()

  const handleChange = (e) => {
    const val = e.target.value
    updateTicket.mutate({ ticketId, fields: { [field]: val || null } })
  }

  return (
    <div className="ticket-right-section">
      <div className="ticket-right-label">{label}</div>
      <select
        className="ticket-editable-field"
        value={value || ''}
        onChange={handleChange}
      >
        <option value="">— Select —</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
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

  if (!ticket) return null

  const respondingMods = ticket.responding_mods || ticket.assigned || []

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
            <div className="ticket-right-value">{ticket.opener_discord_id || '—'}</div>
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

        {/* Progress (select) */}
        <SelectField label="Progress" value={ticket.progress} field="progress" ticketId={ticket.id} options={PROGRESS_OPTIONS} />

        {/* Project (select) */}
        <SelectField label="Project" value={ticket.project} field="project" ticketId={ticket.id} options={PROJECT_OPTIONS} />

        {/* Issue Type (editable text) */}
        <EditableField label="Issue Type" value={ticket.issue_type} field="issue_type" ticketId={ticket.id} />

        <hr className="ticket-right-divider" />

        {/* Wallet / TX */}
        <EditableField label="Wallet Address" value={ticket.wallet_address} field="wallet_address" ticketId={ticket.id} />

        {ticket.wallet_address && (
          <div className="ticket-right-section" style={{ marginTop: -12 }}>
            <Link
              href={`/tracker/${ticket.wallet_address}`}
              className="ticket-right-value"
              style={{ color: 'var(--color-primary)', fontSize: '12px' }}
            >
              View in Scanner →
            </Link>
          </div>
        )}

        <EditableField label="Account ID" value={ticket.account_id} field="account_id" ticketId={ticket.id} />
        <EditableField label="TX ID" value={ticket.tx_id} field="tx_id" ticketId={ticket.id} />

        <hr className="ticket-right-divider" />

        <div className="ticket-right-section">
          <div className="ticket-right-label">Details</div>
          <div className="ticket-right-value" style={{ whiteSpace: 'pre-wrap', fontSize: '13px' }}>
            {ticket.details || '—'}
          </div>
        </div>
      </div>
    </div>
  )
}
