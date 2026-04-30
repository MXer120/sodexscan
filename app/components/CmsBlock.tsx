'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useCmsContent } from '../hooks/useCmsContent'
import { useSessionContext } from '../lib/SessionContext'
import { useCmsEdit } from '../lib/CmsEditContext'
import { supabase } from '../lib/supabaseClient'

interface CmsBlockProps {
  cmsKey: string
  fallback?: string
  tag?: keyof React.JSX.IntrinsicElements
  className?: string
}

export default function CmsBlock({ cmsKey, fallback, tag: Tag = 'span', className }: CmsBlockProps) {
  const { getContent, loading, refresh } = useCmsContent()
  const { isMod } = useSessionContext()
  const { editMode } = useCmsEdit()
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const editRef = useRef(null)

  const content = loading ? (fallback ?? '') : getContent(cmsKey, fallback ?? '')

  // Exit editing if edit mode turned off globally
  useEffect(() => {
    if (!editMode) setEditing(false)
  }, [editMode])

  // Set initial content + focus when edit starts
  useEffect(() => {
    if (!editing || !editRef.current) return
    editRef.current.textContent = content
    editRef.current.focus()
    const range = document.createRange()
    range.selectNodeContents(editRef.current)
    range.collapse(false)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }, [editing]) // eslint-disable-line react-hooks/exhaustive-deps

  const startEdit = useCallback((e) => {
    if (!editMode || !isMod) return
    e.preventDefault()
    e.stopPropagation()
    setEditing(true)
  }, [editMode, isMod])

  const handleSave = useCallback(async () => {
    if (!editRef.current || saving) return
    const newContent = editRef.current.textContent ?? ''
    setSaving(true)
    const { error } = await supabase
      .from('cms_content')
      .upsert({ key: cmsKey, content: newContent, updated_at: new Date().toISOString() })
    if (!error) await refresh()
    setSaving(false)
    setEditing(false)
  }, [cmsKey, saving, refresh])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() }
    if (e.key === 'Escape') { setEditing(false) }
  }

  // Plain render when not a mod or edit mode off
  if (!isMod || !editMode) {
    return <Tag className={className}>{content}</Tag>
  }

  const hoverStyles = hovered && !editing ? {
    outline: '2px solid var(--color-primary)',
    background: 'rgba(var(--color-primary-rgb), 0.08)',
    borderRadius: 'var(--theme-radius-sm, 6px)',
    cursor: 'pointer',
  } : {}

  const editingStyles = {
    outline: '2px solid var(--color-primary)',
    background: 'rgba(var(--color-primary-rgb), 0.12)',
    borderRadius: 'var(--theme-radius-sm, 6px)',
    display: 'inline-block',
    minWidth: '20px',
    whiteSpace: 'pre-wrap',
  }

  return (
    <span style={{ position: 'relative', display: 'inline' }}>
      {editing ? (
        <span
          ref={editRef}
          contentEditable
          suppressContentEditableWarning
          style={editingStyles}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <Tag
          className={className}
          style={hoverStyles}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={startEdit}
          title={`Edit: ${cmsKey}`}
        >
          {content}
        </Tag>
      )}

      {editing && (
        <span style={{
          position: 'absolute',
          bottom: '-22px',
          left: 0,
          fontSize: '10px',
          color: 'var(--color-primary)',
          background: 'var(--color-bg-secondary)',
          padding: '2px 8px',
          borderRadius: 'var(--theme-radius-sm, 6px)',
          whiteSpace: 'nowrap',
          zIndex: 100,
          border: '1px solid var(--color-border-subtle)',
          pointerEvents: 'none',
        }}>
          {saving ? 'Saving…' : '↵ save · Esc cancel'}
        </span>
      )}
    </span>
  )
}
