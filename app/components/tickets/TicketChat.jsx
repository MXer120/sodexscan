'use client'

import React from 'react'

function isImageUrl(url) {
  if (!url) return false
  return /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url)
}

function formatTimestamp(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function linkify(text) {
  if (!text) return ''
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      return <a key={i} href={part} target="_blank" rel="noopener noreferrer">{part}</a>
    }
    return part
  })
}

export default function TicketChat({ messages, loading, discordUsers }) {
  if (loading) {
    return <div className="ticket-loading">Loading messages...</div>
  }

  if (!messages || messages.length === 0) {
    return <div className="ticket-empty">No messages yet</div>
  }

  // Build mod set from discord_users data
  const modSet = new Set()
  if (discordUsers) {
    discordUsers.forEach(u => { if (u.is_mod) modSet.add(u.id) })
  }

  return (
    <div className="ticket-chat-messages">
      {messages.map(msg => {
        const isMod = modSet.has(msg.author_id)
        return (
          <div key={msg.id} className="chat-msg">
            <div className={`chat-msg-avatar ${isMod ? 'mod' : ''}`}>
              {msg.author_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="chat-msg-body">
              <div className="chat-msg-header">
                <span className={`chat-msg-author ${isMod ? 'mod' : ''}`}>
                  {msg.author_name}
                </span>
                {isMod && <span className="chat-msg-mod-badge">MOD</span>}
                <span className="chat-msg-time">{formatTimestamp(msg.timestamp)}</span>
                {msg.is_edit && <span className="chat-msg-edit-badge">(edited)</span>}
              </div>
              {msg.is_deleted ? (
                <div className="chat-msg-deleted">Message deleted</div>
              ) : (
                <>
                  {msg.content && (
                    <div className="chat-msg-content">{linkify(msg.content)}</div>
                  )}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="chat-msg-attachments">
                      {msg.attachments.map((att, i) => {
                        if (isImageUrl(att.url) || (att.content_type && att.content_type.startsWith('image/'))) {
                          return (
                            <a key={i} href={att.url} target="_blank" rel="noopener noreferrer">
                              <img
                                src={att.url}
                                alt={att.filename || 'attachment'}
                                className="chat-msg-image"
                                loading="lazy"
                              />
                            </a>
                          )
                        }
                        return (
                          <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="chat-msg-file">
                            📎 {att.filename || 'file'}
                          </a>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
