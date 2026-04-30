'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import '../styles/MaintenancePage.css'

async function resolveAdmin() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return false
    const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
    return data?.role === 'mod' || data?.role === 'owner'
  } catch { return false }
}

export default function MaintenanceGate({ children }) {
  // Start as false — show upgrade screen instantly, no spinner
  const [isAdmin, setIsAdmin] = useState(false)
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    resolveAdmin().then(setIsAdmin)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      resolveAdmin().then(setIsAdmin)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password })
    if (authErr) { setError(authErr.message); setSubmitting(false) }
    // onAuthStateChange handles success → resolveAdmin → setIsAdmin(true)
  }

  if (isAdmin) return children

  return (
    <div className={`mnt-root ${mounted ? 'mnt-root--in' : ''}`}>
      <div className="mnt-body">

        <div className="mnt-center" style={{ '--stagger': 0 } as React.CSSProperties}>
          <div className="mnt-icon mnt-stagger" style={{ '--i': 0 } as React.CSSProperties}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
          <h1 className="mnt-title mnt-stagger" style={{ '--i': 1 } as React.CSSProperties}>Upgrade in progress</h1>
          <p className="mnt-sub mnt-stagger" style={{ '--i': 2 } as React.CSSProperties}>
            CommunityScan SoDEX is currently offline while we roll out the latest upgrades.
            <br />We'll be back shortly.
          </p>
          <div className="mnt-pulse mnt-stagger" style={{ '--i': 3 } as React.CSSProperties}>
            <span /><span /><span />
          </div>
          <p className="mnt-tagline mnt-stagger" style={{ '--i': 4 } as React.CSSProperties}>CommunityScan SoDEX · Data Intelligence Layer</p>
        </div>

        <form className="mnt-form mnt-stagger" style={{ '--i': 5 } as React.CSSProperties} onSubmit={handleLogin}>
          <p className="mnt-form-hint">Administrator access</p>
          <div className="mnt-fields">
            <input
              className="mnt-input"
              type="email"
              placeholder="Email"
              autoComplete="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              required
            />
            <input
              className="mnt-input"
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
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
