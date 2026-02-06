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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '300px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '700',
          color: '#fff',
          margin: '0 0 8px 0'
        }}>
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p style={{
          fontSize: '13px',
          color: 'rgba(255, 255, 255, 0.6)',
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
            background: '#1a1a1a',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.2s'
          }}
          onFocus={(e) => e.target.style.borderColor = THEME_COLORS.primary}
          onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{
            padding: '12px 14px',
            background: '#1a1a1a',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.2s'
          }}
          onFocus={(e) => e.target.style.borderColor = THEME_COLORS.primary}
          onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
        />
        {isSignUp && (
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            style={{
              padding: '12px 14px',
              background: '#1a1a1a',
              border: `1px solid ${confirmPassword && password !== confirmPassword ? 'rgba(244, 67, 54, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = confirmPassword && password !== confirmPassword ? 'rgba(244, 67, 54, 0.7)' : THEME_COLORS.primary}
            onBlur={(e) => e.target.style.borderColor = confirmPassword && password !== confirmPassword ? 'rgba(244, 67, 54, 0.5)' : 'rgba(255, 255, 255, 0.1)'}
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
          color: '#fff',
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

      {/* Toggle Link */}
      <div style={{
        textAlign: 'center',
        marginTop: '8px',
        paddingTop: '16px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)' }}>
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
