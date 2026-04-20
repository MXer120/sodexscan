'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const DISCLAIMER = 'We never hold your keys or execute trades for you. You choose if and when to trade. Simulated rankings use hypothetical past performance — not indicative of future results. Not financial advice.'

export default function FollowModal({ leaderWallet, onClose, onSuccess }) {
  const [copyRatio, setCopyRatio] = useState(0.1)
  const [maxNotional, setMaxNotional] = useState('')
  const [channels, setChannels] = useState({ telegram: true, discord: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Please log in first')

      const { error: err } = await supabase.from('leader_subscriptions').upsert({
        user_id: user.id,
        leader_wallet: leaderWallet.toLowerCase(),
        copy_ratio: copyRatio,
        max_notional: maxNotional ? parseFloat(maxNotional) : null,
        channels,
        enabled: true,
      }, { onConflict: 'user_id,leader_wallet' })

      if (err) throw err
      onSuccess?.()
      onClose?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
        padding: 28, width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Follow for Signals</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', fontSize: 11, color: '#ca8a04', lineHeight: 1.5 }}>
          ⚠ {DISCLAIMER}
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Wallet: <code style={{ fontSize: 11 }}>{leaderWallet.slice(0, 10)}…{leaderWallet.slice(-8)}</code>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Copy ratio — simulated position size relative to leader ({(copyRatio * 100).toFixed(0)}%)
            </span>
            <input
              type="range" min="0.01" max="1" step="0.01"
              value={copyRatio}
              onChange={e => setCopyRatio(parseFloat(e.target.value))}
              style={{ accentColor: 'var(--accent)' }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'right' }}>{(copyRatio * 100).toFixed(0)}%</span>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Max notional per trade (USD, optional)</span>
            <input
              type="number" min="1" step="1" placeholder="e.g. 500"
              value={maxNotional}
              onChange={e => setMaxNotional(e.target.value)}
              style={{ background: 'var(--bg-input, var(--bg-hover))', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', color: 'var(--text-primary)', fontSize: 13, width: '100%', boxSizing: 'border-box' }}
            />
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Signal delivery channels</span>
            <div style={{ display: 'flex', gap: 16 }}>
              {Object.keys(channels).map(ch => (
                <label key={ch} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={channels[ch]} onChange={e => setChannels(prev => ({ ...prev, [ch]: e.target.checked }))} />
                  {ch.charAt(0).toUpperCase() + ch.slice(1)}
                </label>
              ))}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>Configure channel addresses in your Profile → Alerts settings.</p>
          </div>

          {error && <div style={{ fontSize: 12, color: '#ef4444' }}>{error}</div>}

          <button
            type="submit" disabled={saving}
            style={{
              background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8,
              padding: '10px 0', fontWeight: 600, fontSize: 14, cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Follow for signals'}
          </button>
        </form>
      </div>
    </div>
  )
}
