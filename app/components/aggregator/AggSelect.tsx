'use client'

import React, { useState, useRef, useEffect } from 'react'

export default function AggSelect({ value, onChange, options = [], className = '' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const handleEsc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [open])

  const selected = options.find(o => String(o.value) === String(value))

  return (
    <div className={`agg-custom-select ${className}`} ref={ref}>
      <button
        className="agg-custom-select-trigger"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span>{selected?.label || String(value)}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="agg-custom-select-overlay">
          {options.map((opt) => (
            <button
              key={String(opt.value)}
              className={`agg-custom-select-option ${String(opt.value) === String(value) ? 'active' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              type="button"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
