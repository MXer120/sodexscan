'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

const DEFAULT_HOTKEY_MAP = {
  prevPage: 'ArrowLeft',
  nextPage: 'ArrowRight',
  prevPageAlt: 'ArrowUp',
  nextPageAlt: 'ArrowDown',
  perfMode: 'p',
  editMode: 'e',
  assistant: 'a',
  tutorial: 't',
  sidebar: 's',
}

const HOTKEY_ROWS = [
  { key: 'prevPage', label: 'Previous Page' },
  { key: 'nextPage', label: 'Next Page' },
  { key: 'prevPageAlt', label: 'Previous Page (Alt)' },
  { key: 'nextPageAlt', label: 'Next Page (Alt)' },
  { key: 'perfMode', label: 'Performance Mode' },
  { key: 'editMode', label: 'Edit Mode' },
  { key: 'assistant', label: 'Assistant' },
  { key: 'tutorial', label: 'Tutorial' },
  { key: 'sidebar', label: 'Sidebar' },
]

function formatKey(key) {
  if (!key) return ''
  if (key.startsWith('Arrow')) return key.replace('Arrow', '') + ' Arrow'
  return key.toUpperCase()
}

export default function HotkeySettings({ hotkeyMap, onSave, onClose }) {
  const [local, setLocal] = useState({ ...DEFAULT_HOTKEY_MAP, ...hotkeyMap })
  const [listening, setListening] = useState(null) // key name being captured

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (listening) {
          setListening(null)
        } else {
          onClose()
        }
      }
    }
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.body.style.overflow = 'unset'
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose, listening])

  const startListening = useCallback((keyName) => {
    setListening(keyName)
  }, [])

  useEffect(() => {
    if (!listening) return
    const handler = (e) => {
      e.preventDefault()
      e.stopPropagation()
      // Ignore modifier-only keys
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return
      setLocal(prev => ({ ...prev, [listening]: e.key }))
      setListening(null)
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [listening])

  const handleReset = () => {
    setLocal({ ...DEFAULT_HOTKEY_MAP })
    setListening(null)
  }

  const handleSave = () => {
    onSave(local)
    onClose()
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="agg-modal-overlay" onClick={() => { if (!listening) onClose() }}>
      <div className="agg-modal" style={{ maxWidth: 440, width: '100%' }} onClick={e => e.stopPropagation()}>
        <div className="agg-modal-header">
          <h2>Hotkeys</h2>
          <button className="agg-modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div style={{ padding: '0 24px 24px' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 16, paddingTop: 16 }}>
            Click a key binding to reassign it. Press the new key to capture it.
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500, paddingBottom: 8, borderBottom: '1px solid var(--color-overlay-subtle)' }}>Action</th>
                <th style={{ textAlign: 'right', fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500, paddingBottom: 8, borderBottom: '1px solid var(--color-overlay-subtle)' }}>Key</th>
              </tr>
            </thead>
            <tbody>
              {HOTKEY_ROWS.map(({ key, label }) => {
                const isListening = listening === key
                return (
                  <tr key={key} style={{ borderBottom: '1px solid var(--color-overlay-faint)' }}>
                    <td style={{ padding: '10px 0', fontSize: 13, color: 'var(--color-text-main)' }}>{label}</td>
                    <td style={{ textAlign: 'right', padding: '10px 0' }}>
                      <button
                        onClick={() => startListening(key)}
                        style={{
                          background: isListening ? 'var(--color-accent)' : 'var(--color-overlay-subtle)',
                          color: isListening ? '#fff' : 'var(--color-text-main)',
                          border: isListening ? '1px solid var(--color-accent)' : '1px solid var(--color-overlay-subtle)',
                          borderRadius: 4,
                          padding: '3px 10px',
                          fontSize: 12,
                          fontFamily: 'monospace',
                          cursor: 'pointer',
                          minWidth: 80,
                          transition: 'background 0.15s',
                        }}
                      >
                        {isListening ? 'Press key...' : formatKey(local[key])}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
            <button
              className="agg-nav-link-btn cancel"
              onClick={handleReset}
            >
              Reset to defaults
            </button>
            <button
              className="agg-modal-add-btn"
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
