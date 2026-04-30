'use client'

import { useEffect, useState } from 'react'
import { useSessionContext } from '../lib/SessionContext'
import { Auth } from './Auth'

export default function AuthModal() {
  const [show, setShow] = useState(false)
  const { user, setAuthModalCallback } = useSessionContext()

  useEffect(() => {
    setAuthModalCallback(() => () => setShow(true))
    return () => setAuthModalCallback(null)
  }, [setAuthModalCallback])

  useEffect(() => {
    const handler = () => setShow(true)
    window.addEventListener('openAuthModal', handler)
    return () => window.removeEventListener('openAuthModal', handler)
  }, [])

  // Auto-close when user signs in
  useEffect(() => {
    if (user) setShow(false)
  }, [user])

  if (!show || user) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={() => setShow(false)} />
      <div style={{ position: 'relative', background: 'var(--color-bg-modal, #1a1a1a)', border: '1px solid var(--color-border-visible, rgba(255,255,255,0.1))', borderRadius: '16px', padding: '32px', maxWidth: '420px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <button onClick={() => setShow(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>×</button>
        <Auth />
      </div>
    </div>
  )
}
