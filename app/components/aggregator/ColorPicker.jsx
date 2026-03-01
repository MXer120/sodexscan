'use client'

import React, { useState, useRef, useEffect } from 'react'

const DEFAULT_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ffffff', '#a1a1aa']

function getThemePrimary() {
  if (typeof window === 'undefined') return '#48cbff'
  return getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#48cbff'
}

export default function ColorPicker({ value, onChange, recentColors = [], onAddRecent }) {
  const [isOpen, setIsOpen] = useState(false)
  const [hexInput, setHexInput] = useState(value || getThemePrimary())
  const ref = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  useEffect(() => {
    setHexInput(value || getThemePrimary())
  }, [value])

  const allSwatches = [...new Set([...recentColors, ...DEFAULT_COLORS])].slice(0, 8)

  const applyColor = (color) => {
    onChange(color)
    if (onAddRecent) onAddRecent(color)
    setHexInput(color)
  }

  const handleHexChange = (e) => {
    const v = e.target.value
    setHexInput(v)
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      applyColor(v)
    }
  }

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="agg-color-input"
        style={{ background: value || getThemePrimary() }}
        title={value || getThemePrimary()}
      />
      {isOpen && (
        <div className="agg-color-picker-popover">
          {/* Recent / preset swatches */}
          <div className="agg-color-recent">
            {allSwatches.map(c => (
              <button
                key={c}
                className={`agg-color-swatch ${c === value ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => applyColor(c)}
                title={c}
              />
            ))}
          </div>
          {/* Hex input + native picker */}
          <div className="agg-color-hex-row">
            <input
              type="text"
              value={hexInput}
              onChange={handleHexChange}
              className="agg-color-hex-input"
              placeholder={getThemePrimary()}
              maxLength={7}
            />
            <input
              type="color"
              value={value || getThemePrimary()}
              onChange={(e) => applyColor(e.target.value)}
              style={{ width: 28, height: 28, border: 'none', cursor: 'pointer', padding: 0, background: 'transparent' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
