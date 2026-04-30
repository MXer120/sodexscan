'use client'

import { useEffect, useState } from 'react'
import { useSessionContext } from '../lib/SessionContext'
import { useCmsEdit } from '../lib/CmsEditContext'
import { supabase } from '../lib/supabaseClient'

export default function CmsEditToggle() {
  const { isMod } = useSessionContext()
  const { editMode, toggleEditMode } = useCmsEdit()
  const [enabled, setEnabled] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!isMod) return
    supabase
      .from('cms_content')
      .select('content')
      .eq('key', '__cms_edit_visible')
      .single()
      .then(({ data }) => {
        setEnabled(!data || data.content !== 'false')
        setLoaded(true)
      })
  }, [isMod])

  if (!isMod || !loaded || !enabled) return null

  return (
    <button
      onClick={toggleEditMode}
      title={editMode ? 'Exit CMS edit mode' : 'Enable CMS edit mode'}
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '20px',
        zIndex: 9990,
        width: '38px',
        height: '38px',
        borderRadius: '50%',
        border: editMode
          ? '2px solid var(--color-primary)'
          : '1px solid var(--color-border-subtle)',
        background: editMode ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
        color: editMode ? 'var(--color-bg-main)' : 'var(--color-text-secondary)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '15px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
        transition: 'all 0.15s',
      }}
    >
      ✏
    </button>
  )
}
