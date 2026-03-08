'use client'

import { useState } from 'react'
import { THEME_COLORS } from '../lib/themeColors'
import { supabase } from '../lib/supabaseClient'

export const Auth = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  const handleSignUp = async () => {
    setLoading(true)
    setMessage('')

    if (password !== confirmPassword) {
      setMessage('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Check your email for confirmation!')
    }
    setLoading(false)
  }

  const handleLogin = async () => {
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage(error.message)
    }
    setLoading(false)
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setMessage('')
    const next = window.location.pathname === '/auth/callback' ? '/' : window.location.pathname
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` }
    })
    if (error) {
      setMessage(error.message)
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '300px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '700',
          color: 'var(--color-text-main)',
          margin: '0 0 8px 0'
        }}>
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p style={{
          fontSize: '13px',
          color: 'var(--color-text-secondary)',
          margin: 0
        }}>
          {isSignUp ? 'Sign up to get started' : 'Sign in to your account'}
        </p>
      </div>

      {/* Form Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{
            padding: '12px 14px',
            background: 'var(--color-bg-input)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: '6px',
            color: 'var(--color-text-main)',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.2s'
          }}
          onFocus={(e) => e.target.style.borderColor = THEME_COLORS.primary}
          onBlur={(e) => e.target.style.borderColor = 'var(--color-border-subtle)'}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{
            padding: '12px 14px',
            background: 'var(--color-bg-input)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: '6px',
            color: 'var(--color-text-main)',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.2s'
          }}
          onFocus={(e) => e.target.style.borderColor = THEME_COLORS.primary}
          onBlur={(e) => e.target.style.borderColor = 'var(--color-border-subtle)'}
        />
        {isSignUp && (
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            style={{
              padding: '12px 14px',
              background: 'var(--color-bg-input)',
              border: `1px solid ${confirmPassword && password !== confirmPassword ? 'rgba(244, 67, 54, 0.5)' : 'var(--color-border-subtle)'}`,
              borderRadius: '6px',
              color: 'var(--color-text-main)',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = confirmPassword && password !== confirmPassword ? 'rgba(244, 67, 54, 0.7)' : THEME_COLORS.primary}
            onBlur={(e) => e.target.style.borderColor = confirmPassword && password !== confirmPassword ? 'rgba(244, 67, 54, 0.5)' : 'var(--color-border-subtle)'}
          />
        )}
      </div>

      {/* Error/Success Message */}
      {message && (
        <div style={{
          padding: '10px 12px',
          background: message.includes('Check your email') ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
          border: `1px solid ${message.includes('Check your email') ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)'}`,
          borderRadius: '6px',
          color: message.includes('Check your email') ? '#4CAF50' : '#f44336',
          fontSize: '13px',
          textAlign: 'center'
        }}>
          {message}
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={isSignUp ? handleSignUp : handleLogin}
        disabled={loading || (isSignUp && (!email || !password || !confirmPassword || password !== confirmPassword))}
        style={{
          padding: '12px 16px',
          background: THEME_COLORS.primary,
          border: 'none',
          borderRadius: '6px',
          color: 'var(--color-text-main)',
          fontSize: '15px',
          fontWeight: '600',
          cursor: loading || (isSignUp && (!email || !password || !confirmPassword || password !== confirmPassword)) ? 'not-allowed' : 'pointer',
          opacity: loading || (isSignUp && (!email || !password || !confirmPassword || password !== confirmPassword)) ? 0.5 : 1,
          transition: 'opacity 0.2s',
          marginTop: '4px'
        }}
      >
        {loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
      </button>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0' }}>
        <div style={{ flex: 1, height: '1px', background: 'var(--color-border-subtle)' }} />
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>or</span>
        <div style={{ flex: 1, height: '1px', background: 'var(--color-border-subtle)' }} />
      </div>

      {/* Google Button */}
      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '11px 16px',
          background: '#fff',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: '6px',
          color: '#1f1f1f',
          fontSize: '14px',
          fontWeight: '600',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
          transition: 'opacity 0.2s'
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      {/* Toggle Link */}
      <div style={{
        textAlign: 'center',
        marginTop: '8px',
        paddingTop: '16px',
        borderTop: '1px solid var(--color-border-subtle)'
      }}>
        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
        </span>
        <button
          onClick={() => {
            setIsSignUp(!isSignUp)
            setConfirmPassword('')
            setMessage('')
          }}
          style={{
            background: 'none',
            border: 'none',
            color: THEME_COLORS.primary,
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            padding: 0,
            textDecoration: 'underline'
          }}
        >
          {isSignUp ? 'Sign in' : 'Create account'}
        </button>
      </div>
    </div>
  )
}

export default Auth
