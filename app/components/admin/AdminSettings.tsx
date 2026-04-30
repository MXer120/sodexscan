'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const CMS_BTN_KEY = '__cms_edit_visible'

export default function AdminSettings() {
  const [cmsVisible, setCmsVisible] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)

  useEffect(() => {
    supabase
      .from('cms_content')
      .select('content')
      .eq('key', CMS_BTN_KEY)
      .single()
      .then(({ data }) => {
        if (data) setCmsVisible(data.content !== 'false')
      })
  }, [])

  const toggle = async (val) => {
    setCmsVisible(val)
    setSaving(true)
    await supabase
      .from('cms_content')
      .upsert({ key: CMS_BTN_KEY, content: String(val), updated_at: new Date().toISOString() })
    setSaving(false)
    setStatus('Saved')
    setTimeout(() => setStatus(null), 2000)
  }

  return (
    <>
      <h2>Owner Settings</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label className="admin-toggle">
            <input
              type="checkbox"
              checked={cmsVisible}
              onChange={e => toggle(e.target.checked)}
              disabled={saving}
            />
            <span className="admin-toggle-track">
              <span className="admin-toggle-thumb" />
            </span>
          </label>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-main)', fontWeight: 500 }}>
              CMS Edit Button
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              Show the live-edit toggle button for mods
            </div>
          </div>
          {status && <span className="admin-status-ok">{status}</span>}
        </div>
      </div>
    </>
  )
}
