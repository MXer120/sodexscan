'use client'

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import TryIt from './TryIt'
import { toolHttpExamples } from '../../lib/tools/client'

const DETAIL_MODE_KEY = 'tool_detail_mode'

function loadMode(): 'popup' | 'sidebar' {
  try {
    const v = localStorage.getItem(DETAIL_MODE_KEY)
    if (v === 'popup' || v === 'sidebar') return v
  } catch {}
  return 'popup'
}

function saveMode(m: 'popup' | 'sidebar') {
  try { localStorage.setItem(DETAIL_MODE_KEY, m) } catch {}
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className={`tm-copy${copied ? ' copied' : ''}`}
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1400) } catch {}
      }}
    >{copied ? 'Copied' : 'Copy'}</button>
  )
}

function Code({ children }) {
  const text = typeof children === 'string' ? children : String(children)
  return (
    <div style={{ position: 'relative' }}>
      <pre className="tm-code">{text}</pre>
      <CopyBtn text={text} />
    </div>
  )
}

function Chips({ tool }) {
  const kind = tool.mutates ? 'Write' : 'Read'
  return (
    <div className="tp-card-chips" style={{ marginTop: 0 }}>
      <span className={`tp-chip tp-chip--${tool.status}`}>{tool.status === 'available' ? 'Available' : 'Planned'}</span>
      <span className={`tp-chip tp-chip--${tool.tier ?? 'public'}`}>{tool.tier ?? 'public'}</span>
      <span className={`tp-chip tp-chip--${kind.toLowerCase()}`}>{kind}</span>
      {tool.destructive && <span className="tp-chip tp-chip--destructive">destructive</span>}
    </div>
  )
}

function ParamsTable({ params }) {
  if (!params?.length) return <p className="tm-p">No parameters.</p>
  return (
    <table className="tm-table">
      <thead>
        <tr><th>Name</th><th>Type</th><th>Required</th><th>Default</th><th>Description</th></tr>
      </thead>
      <tbody>
        {params.map(p => (
          <tr key={p.name}>
            <td><code>{p.name}</code></td>
            <td>
              <code>{p.type}{p.type === 'array' && p.itemType ? `<${p.itemType}>` : ''}</code>
              {p.enum ? <div style={{ marginTop: 4, color: 'var(--ds-text-tertiary)' }}>{p.enum.join(' | ')}</div> : null}
              {p.pattern ? <div style={{ marginTop: 4, color: 'var(--ds-text-tertiary)', fontFamily: 'ui-monospace, SF Mono, Menlo, monospace', fontSize: 11 }}>{p.pattern}</div> : null}
            </td>
            <td>{p.required ? <span className="tm-req">yes</span> : 'no'}</td>
            <td>{p.default !== undefined ? <code>{String(p.default)}</code> : '—'}</td>
            <td>{p.description || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const MARKET_LABELS = { spot: 'Spot', perps: 'Perps', evm: 'EVM' }

function SupportedTokens({ tokens }) {
  const markets = Object.keys(tokens).filter(k => tokens[k])
  const [active, setActive] = useState(markets[0] ?? 'spot')
  const [search, setSearch] = useState('')
  const current = tokens[active]

  const filterPills = (arr) => {
    if (!search) return arr
    const q = search.toLowerCase()
    return arr.filter(t => t.toLowerCase().includes(q))
  }

  const evmCount = (tokens.evm
    ? (tokens.evm.native?.length ?? 0) + (tokens.evm.staked?.length ?? 0) +
      (tokens.evm.lp_vaults?.length ?? 0) + (tokens.evm.tokens?.length ?? 0)
    : 0)

  return (
    <div className="tm-section">
      <h3 className="tm-section-title">Supported tokens</h3>
      <div className="tm-tok-tabs">
        {markets.map(m => (
          <button key={m} className={`tm-tok-tab${active === m ? ' active' : ''}`}
            onClick={() => { setActive(m); setSearch('') }}>
            {MARKET_LABELS[m] ?? m}
            <span className="tm-tok-count">
              {m === 'spot' ? tokens.spot?.length :
               m === 'perps' ? tokens.perps?.length : evmCount}
            </span>
          </button>
        ))}
      </div>
      <input
        className="tm-tok-search"
        placeholder="Search tokens…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      {active === 'evm' && current && typeof current === 'object' ? (
        <div className="tm-tok-evm">
          {[
            { label: 'Native', key: 'native' },
            { label: 'Staked', key: 'staked' },
            { label: 'LP Vaults', key: 'lp_vaults' },
            { label: 'Tokens', key: 'tokens' },
          ].map(({ label, key }) => {
            const items = filterPills(current[key] ?? [])
            if (!items.length) return null
            return (
              <div key={key} className="tm-tok-group">
                <div className="tm-tok-group-label">{label}</div>
                <div className="tm-tok-grid">{items.map(t => <span key={t} className="tm-tok-pill">{t}</span>)}</div>
              </div>
            )
          })}
        </div>
      ) : Array.isArray(current) ? (
        <div className="tm-tok-grid">
          {filterPills(current).map(t => <span key={t} className="tm-tok-pill">{t}</span>)}
        </div>
      ) : null}
    </div>
  )
}

// ─── Mode toggle button ───────────────────────────────────────────────────────

function ModeToggle({ mode, onChange }: { mode: 'popup' | 'sidebar'; onChange: (m: 'popup' | 'sidebar') => void }) {
  return (
    <button
      onClick={() => onChange(mode === 'popup' ? 'sidebar' : 'popup')}
      title={mode === 'popup' ? 'Switch to sidebar' : 'Switch to popup'}
      style={{
        padding: '4px 10px',
        borderRadius: 6,
        border: '1px solid var(--ds-border-subtle)',
        background: 'var(--ds-bg-2)',
        color: 'var(--ds-text-secondary)',
        fontSize: 11,
        fontWeight: 500,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        flexShrink: 0,
      }}
    >
      {mode === 'popup' ? (
        // sidebar icon
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <line x1="15" y1="3" x2="15" y2="21"/>
        </svg>
      ) : (
        // popup/center icon
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="5" y="5" width="14" height="14" rx="2"/>
          <path d="M5 12h3M16 12h3M12 5v3M12 16v3"/>
        </svg>
      )}
      {mode === 'popup' ? 'Sidebar' : 'Popup'}
    </button>
  )
}

// ─── Backdrop with blur tint ──────────────────────────────────────────────────

function Backdrop({ onClick }: { onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        zIndex: 900,
      }}
    />
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function ToolDetailModal({ tool, onClose, onSwitchTool }) {
  const [mounted, setMounted] = useState(false)
  const [mode, setMode] = useState<'popup' | 'sidebar'>('popup')

  useEffect(() => {
    setMounted(true)
    setMode(loadMode())
  }, [])

  const handleModeChange = (m: 'popup' | 'sidebar') => {
    setMode(m)
    saveMode(m)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const pickRelated = useCallback((id: string) => {
    if (onSwitchTool) onSwitchTool(id)
  }, [onSwitchTool])

  if (!mounted || !tool) return null

  const http = toolHttpExamples(tool)
  const requestExample = tool.examples?.[0]?.request ?? Object.fromEntries((tool.params ?? []).filter(p => p.default !== undefined).map(p => [p.name, p.default]))
  const responseExample = tool.examples?.[0]?.response

  const panelStyle: React.CSSProperties = mode === 'popup'
    ? {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(92vw, 760px)',
        maxHeight: '88vh',
        borderRadius: 16,
        right: 'auto',
        bottom: 'auto',
        zIndex: 901,
        overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        background: 'var(--ds-bg-2)',
        border: '1px solid var(--ds-border-subtle)',
        animation: 'tp-fade-in .15s ease',
      }
    : {
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 'min(90vw, 560px)',
        zIndex: 901,
        overflowY: 'auto',
        borderRadius: 0,
        borderLeft: '1px solid var(--ds-border-subtle)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
      }

  const body = (
    <>
      <Backdrop onClick={onClose} />
      <div className="tm-panel" role="dialog" aria-label={tool.name} style={panelStyle}>
        <div className="tm-header">
          <div className="tm-title-group">
            <h2 className="tm-title">{tool.name}</h2>
            <div className="tm-sub-id">{tool.id} · {tool.category}</div>
            <div style={{ marginTop: 8 }}>
              <Chips tool={tool} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexShrink: 0 }}>
            <ModeToggle mode={mode} onChange={handleModeChange} />
            <button className="tm-close" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        <div className="tm-body">
          <div className="tm-section">
            <h3 className="tm-section-title">Overview</h3>
            <p className="tm-p">{tool.longDescription || tool.shortDescription || '—'}</p>
            {tool.features?.length > 0 && (
              <ul className="tm-list">{tool.features.map(f => <li key={f}>{f}</li>)}</ul>
            )}
            {tool.limits && <p className="tm-p" style={{ color: 'var(--ds-text-tertiary)' }}>Limits: {tool.limits}</p>}
            {tool.plannedFeatures && (
              <ul className="tm-list">{tool.plannedFeatures.map(f => <li key={f}>{f}</li>)}</ul>
            )}
          </div>

          {tool.status === 'available' ? (
            <div className="tm-section">
              <h3 className="tm-section-title">Try it</h3>
              <TryIt tool={tool} />
            </div>
          ) : (
            <div className="tm-section">
              <h3 className="tm-section-title">Try it</h3>
              <p className="tm-p">Planned — ETA {tool.eta || 'TBD'}. Follow #tools announcements.</p>
            </div>
          )}

          <div className="tm-section">
            <h3 className="tm-section-title">Endpoint</h3>
            <Code>{`${http.method} ${http.url}`}</Code>
          </div>

          <div className="tm-section">
            <h3 className="tm-section-title">Parameters</h3>
            <ParamsTable params={tool.params} />
          </div>

          {tool.returns && (
            <div className="tm-section">
              <h3 className="tm-section-title">Returns</h3>
              <Code>{JSON.stringify(tool.returns, null, 2)}</Code>
            </div>
          )}

          <div className="tm-section">
            <h3 className="tm-section-title">Example</h3>
            <div style={{ fontSize: 11, color: 'var(--ds-text-tertiary)', marginBottom: 4 }}>Request</div>
            <Code>{JSON.stringify(requestExample ?? {}, null, 2)}</Code>
            {responseExample && (
              <>
                <div style={{ fontSize: 11, color: 'var(--ds-text-tertiary)', margin: '8px 0 4px' }}>Response</div>
                <Code>{JSON.stringify(responseExample, null, 2)}</Code>
              </>
            )}
          </div>

          <div className="tm-section">
            <h3 className="tm-section-title">cURL</h3>
            <Code>{http.curl}</Code>
          </div>

          {tool.errors && Object.keys(tool.errors).length > 0 && (
            <div className="tm-section">
              <h3 className="tm-section-title">Errors</h3>
              <table className="tm-table">
                <thead><tr><th>Code</th><th>Meaning</th></tr></thead>
                <tbody>
                  {Object.entries(tool.errors).map(([c, m]) => (
                    <tr key={c}><td><code>{c}</code></td><td>{m as React.ReactNode}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tool.supportedTokens && <SupportedTokens tokens={tool.supportedTokens} />}

          {tool.relatedTools?.length > 0 && (
            <div className="tm-section">
              <h3 className="tm-section-title">Related tools</h3>
              <div className="tm-related">
                {tool.relatedTools.map(id => (
                  <button key={id} className="tm-related-chip" onClick={() => pickRelated(id)}>{id}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )

  return createPortal(body, document.body)
}
