'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import '../styles/MaintenancePage.css'

export default function MaintenanceGate({ children }) {
  const [status, setStatus] = useState('loading') // loading | maintenance | admin
  const [email, setEmail]   = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]   = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { setStatus('maintenance'); return }
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      const role = data?.role ?? 'user'
      setStatus(role === 'mod' || role === 'owner' ? 'admin' : 'maintenance')
    }).catch(() => setStatus('maintenance'))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (!session?.user) { setStatus('maintenance'); return }
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      const role = data?.role ?? 'user'
      setStatus(role === 'mod' || role === 'owner' ? 'admin' : 'maintenance')
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password })
    if (authErr) { setError(authErr.message); setSubmitting(false); return }
    // onAuthStateChange above will update status
    setSubmitting(false)
  }

  if (status === 'loading') {
    return (
      <div className="mnt-root">
        <div className="mnt-spinner" />
      </div>
    )
  }

  if (status === 'admin') return children

  return (
    <div className="mnt-root">
      <div className="mnt-body">
        <div className="mnt-center">
          <div className="mnt-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h1 className="mnt-title">Down for maintenance</h1>
          <p className="mnt-sub">
            CommunityScan SoDEX is currently offline while we roll out upgrades.<br />
            We'll be back shortly.
          </p>
          <div className="mnt-divider" />
          <p className="mnt-tagline">CommunityScan SoDEX — Data Intelligence Layer</p>
        </div>

        <form className="mnt-form" onSubmit={handleLogin}>
          <p className="mnt-form-hint">Administrator access</p>
          <div className="mnt-fields">
            <input
              className="mnt-input"
              type="email"
              placeholder="Email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <input
              className="mnt-input"
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="mnt-error">{error}</p>}
          <button className="mnt-submit" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
