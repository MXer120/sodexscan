'use client'

import { CSSProperties, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import '../styles/MaintenancePage.css'

// Allow CSS custom properties in inline styles
type CSSWithVars = CSSProperties & { [key: `--${string}`]: string | number }

export default function MaintenancePage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/maintenance-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Sign in failed.')
        setSubmitting(false)
        return
      }

      // Also sign into Supabase so app auth is established in the same step
      await supabase.auth.signInWithPassword({ email, password })

      // Cookie is set server-side (httpOnly, 24h) — hard reload so middleware re-checks
      window.location.href = '/'
    } catch {
      setError('Network error. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="mnt-root mnt-root--in">
      <div className="mnt-body">

        <div className="mnt-center">
          <div className="mnt-icon mnt-stagger" style={{ '--i': 0 } as CSSWithVars}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
          <h1 className="mnt-title mnt-stagger" style={{ '--i': 1 } as CSSWithVars}>Upgrade in progress</h1>
          <p className="mnt-sub mnt-stagger" style={{ '--i': 2 } as CSSWithVars}>
            CommunityScan SoDEX is currently offline while we roll out the latest upgrades.
            <br />We'll be back shortly.
          </p>
          <div className="mnt-pulse mnt-stagger" style={{ '--i': 3 } as CSSWithVars}>
            <span /><span /><span />
          </div>
          <p className="mnt-tagline mnt-stagger" style={{ '--i': 4 } as CSSWithVars}>CommunityScan SoDEX · Data Intelligence Layer</p>
        </div>

        <form className="mnt-form mnt-stagger" style={{ '--i': 5 } as CSSWithVars} onSubmit={handleLogin}>
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
