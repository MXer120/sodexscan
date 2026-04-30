'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SearchBarSettings { filterType?: string; placeholder?: string }

export default function SearchBarWidget({ settings = {} }: { settings?: SearchBarSettings }) {
  const filterType = settings.filterType || 'all'
  const placeholder = settings.placeholder || 'Search wallet, tag, ...'
  const [value, setValue] = useState('')
  const router = useRouter()

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    const url = filterType === 'address'
      ? `/tracker?q=${encodeURIComponent(trimmed)}&filter=address`
      : `/tracker?q=${encodeURIComponent(trimmed)}`
    router.push(url)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%', padding: '0 4px', gap: 6 }}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{
          flex: 1,
          padding: '8px 12px',
          background: 'var(--color-overlay-subtle)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 8,
          color: 'var(--color-text-main)',
          fontSize: 13,
          outline: 'none',
          minWidth: 0,
        }}
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim()}
        title="Search"
        style={{
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36,
          background: 'var(--color-primary)',
          border: 'none',
          borderRadius: 8,
          cursor: value.trim() ? 'pointer' : 'default',
          opacity: value.trim() ? 1 : 0.5,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>
    </div>
  )
}
