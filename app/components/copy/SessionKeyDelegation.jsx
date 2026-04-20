'use client'
/**
 * Stub UI: EIP-712 session-key delegation flow.
 * Visualizes the proposed user-consent UX — no real signing until Sodex confirms primitives.
 * See docs/research/sodex-session-keys.md for research status.
 */
import { useState } from 'react'

const STEPS = [
  { id: 'connect', label: 'Connect wallet', desc: 'Connect your Sodex wallet. We never store your key.' },
  { id: 'scope',   label: 'Set scope', desc: 'Choose symbol, max size, max price, and expiry (max 5 min).' },
  { id: 'sign',    label: 'Sign permit', desc: 'Sign one EIP-712 permit in your wallet. No withdrawal permission is ever included.' },
  { id: 'relay',   label: 'Relay & done', desc: 'We relay the permit to Sodex for this single trade. Permit is never stored.' },
]

export default function SessionKeyDelegation({ onComplete }) {
  const [step, setStep] = useState(0)
  const [scope, setScope] = useState({ symbol: 'BTC-USDT', side: 'long', maxSize: 100, expiry: 270 })

  return (
    <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', fontSize: 11, color: '#60a5fa', lineHeight: 1.5 }}>
        🔬 Research preview — delegation requires Sodex on-chain primitive confirmation. See{' '}
        <code style={{ fontSize: 10 }}>docs/research/sodex-session-keys.md</code>.
      </div>

      {/* Step progress */}
      <div style={{ display: 'flex', gap: 0 }}>
        {STEPS.map((s, i) => (
          <div key={s.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700,
              background: i < step ? '#22c55e' : i === step ? 'var(--accent)' : 'var(--bg-hover)',
              color: i <= step ? '#fff' : 'var(--text-secondary)',
              border: i === step ? '2px solid var(--accent)' : 'none',
              transition: 'all 0.2s',
            }}>{i < step ? '✓' : i + 1}</div>
            <span style={{ fontSize: 10, color: i === step ? 'var(--text-primary)' : 'var(--text-secondary)', textAlign: 'center' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Step content */}
      <div style={{ padding: '18px 20px', borderRadius: 10, background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>{STEPS[step].label}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>{STEPS[step].desc}</div>

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              Symbol
              <select value={scope.symbol} onChange={e => setScope(s => ({ ...s, symbol: e.target.value }))}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text-primary)', fontSize: 13 }}>
                {['BTC-USDT', 'ETH-USDT', 'SOL-USDT'].map(sym => <option key={sym}>{sym}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              Side
              <select value={scope.side} onChange={e => setScope(s => ({ ...s, side: e.target.value }))}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text-primary)', fontSize: 13 }}>
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </label>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              Max notional (USD)
              <input type="number" value={scope.maxSize} min={1} onChange={e => setScope(s => ({ ...s, maxSize: +e.target.value }))}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text-primary)', fontSize: 13 }} />
            </label>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Permit expires in 4 min 30 s. No withdrawal permission included. One-use only.
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ fontFamily: 'monospace', fontSize: 11, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: 12, color: 'var(--text-secondary)' }}>
            {JSON.stringify({ domain: 'SodexPerps (chain TBD)', ...scope, noWithdraw: true, expiry: 'now+270s', nonce: '(auto)' }, null, 2)}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: 'var(--bg-hover)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
            Back
          </button>
        )}
        <button
          onClick={() => step < STEPS.length - 1 ? setStep(s => s + 1) : onComplete?.()}
          style={{ flex: 2, padding: '10px 0', borderRadius: 8, background: 'var(--accent)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#fff' }}
        >
          {step === STEPS.length - 1 ? 'Done (stub)' : step === 2 ? 'Sign with wallet (stub)' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
