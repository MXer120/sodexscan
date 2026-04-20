'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import '../styles/AlertsPage.css'

async function authFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''
  return fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers ?? {}) },
  })
}

// ─── Alert type catalogue ────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'all',           label: 'All Alerts',     icon: '◈' },
  { id: 'price',         label: 'Price',          icon: '📈' },
  { id: 'listings',      label: 'Listings',       icon: '✦' },
  { id: 'wallet',        label: 'Wallet Activity',icon: '👁' },
  { id: 'pnl',           label: 'PnL',            icon: '💰' },
  { id: 'announcements', label: 'Announcements',  icon: '📢' },
]

const TYPE_META = {
  price_movement:    { cat: 'price',         label: 'Price Movement',     desc: '% change threshold' },
  price_level:       { cat: 'price',         label: 'Price Level',        desc: 'Crosses above / below value' },
  new_listing:       { cat: 'listings',      label: 'New Listing',        desc: 'New coin listed on SoDEX' },
  new_incoming:      { cat: 'listings',      label: 'New Incoming',       desc: 'New coin in Incoming' },
  wallet_deposit:    { cat: 'wallet',        label: 'Deposit',            desc: 'Funds received by wallet' },
  wallet_withdrawal: { cat: 'wallet',        label: 'Withdrawal',         desc: 'Funds sent from wallet' },
  wallet_fill:       { cat: 'wallet',        label: 'Trade Fill',         desc: 'Position opened or closed' },
  position_open:     { cat: 'wallet',        label: 'Position Opened',    desc: 'New perp position' },
  position_close:    { cat: 'wallet',        label: 'Position Closed',    desc: 'Position fully closed' },
  order_placed:      { cat: 'wallet',        label: 'Order Placed',       desc: 'New order created' },
  order_cancelled:   { cat: 'wallet',        label: 'Order Cancelled',    desc: 'Order removed' },
  daily_pnl:         { cat: 'pnl',           label: 'Daily PnL',          desc: 'Daily P&L threshold' },
  weekly_pnl:        { cat: 'pnl',           label: 'Weekly PnL',         desc: 'Weekly P&L threshold' },
  total_pnl:         { cat: 'pnl',           label: 'Total PnL',          desc: 'Cumulative P&L threshold' },
  sodex_announcement:{ cat: 'announcements', label: 'SoDEX Announcement', desc: 'Official updates (coming soon)' },
}

const CAT_COLORS = {
  price: '#f59e0b', listings: '#6366f1', wallet: '#22c55e',
  pnl: '#f26b1f', announcements: '#a78bfa',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function thresholdSummary(type, thresholds) {
  if (!thresholds) return ''
  if (type === 'price_movement') return thresholds.pct ? `±${thresholds.pct}%` : ''
  if (type === 'price_level') {
    const dir = thresholds.direction === 'below' ? '↓' : '↑'
    return thresholds.price ? `${dir} $${Number(thresholds.price).toLocaleString()}` : ''
  }
  if (['wallet_deposit','wallet_withdrawal'].includes(type)) {
    if (thresholds.min && thresholds.max) return `$${thresholds.min} – $${thresholds.max}`
    if (thresholds.min) return `≥ $${thresholds.min}`
    return ''
  }
  if (['daily_pnl','weekly_pnl','total_pnl'].includes(type)) {
    const dir = thresholds.direction === 'below' ? '↓' : '↑'
    return thresholds.value ? `${dir} $${Number(thresholds.value).toLocaleString()}` : ''
  }
  return ''
}

function defaultDraft(type) {
  return { type, target: '', thresholds: {}, channels: { telegram: true }, label: '' }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AlertCard({ alert, onEdit, onDuplicate, onDelete, onToggle }) {
  const meta = TYPE_META[alert.type] ?? { cat: 'all', label: alert.type, desc: '' }
  const color = CAT_COLORS[meta.cat] ?? '#888'
  const summary = thresholdSummary(alert.type, alert.thresholds)

  return (
    <div className={`alp-card ${alert.enabled ? '' : 'alp-card--disabled'}`}>
      <div className="alp-card-accent" style={{ background: color }} />
      <div className="alp-card-body">
        <div className="alp-card-top">
          <div className="alp-card-info">
            <span className="alp-card-type" style={{ color }}>{meta.label}</span>
            {alert.label && <span className="alp-card-label">{alert.label}</span>}
          </div>
          <label className="alp-toggle" title={alert.enabled ? 'Disable' : 'Enable'}>
            <input type="checkbox" checked={alert.enabled} onChange={() => onToggle(alert)} />
            <span className="alp-toggle-track" />
          </label>
        </div>
        <div className="alp-card-mid">
          {alert.target && alert.target !== '__any__' && (
            <span className="alp-chip alp-chip--target">{alert.target}</span>
          )}
          {summary && <span className="alp-chip alp-chip--threshold">{summary}</span>}
          {alert.channels?.telegram && <span className="alp-chip alp-chip--ch">TG</span>}
          {alert.channels?.discord && <span className="alp-chip alp-chip--ch">Discord</span>}
        </div>
        <div className="alp-card-desc">{meta.desc}</div>
      </div>
      <div className="alp-card-actions">
        <button className="alp-action-btn" onClick={() => onEdit(alert)} title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button className="alp-action-btn" onClick={() => onDuplicate(alert)} title="Duplicate">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
        <button className="alp-action-btn alp-action-btn--danger" onClick={() => onDelete(alert)} title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
    </div>
  )
}

// ─── Drawer form fields ───────────────────────────────────────────────────────

function DrawerFields({ draft, onChange }) {
  const set = (key, val) => onChange({ ...draft, [key]: val })
  const setT = (key, val) => onChange({ ...draft, thresholds: { ...draft.thresholds, [key]: val } })
  const setC = (key, val) => onChange({ ...draft, channels: { ...draft.channels, [key]: val } })

  const isPriceType    = ['price_movement', 'price_level'].includes(draft.type)
  const isWalletType   = ['wallet_deposit','wallet_withdrawal','wallet_fill','position_open','position_close','order_placed','order_cancelled'].includes(draft.type)
  const isPnlType      = ['daily_pnl','weekly_pnl','total_pnl'].includes(draft.type)
  const isListingsType = ['new_listing','new_incoming'].includes(draft.type)
  const isAnnouncement = draft.type === 'sodex_announcement'

  return (
    <div className="alp-drawer-fields">
      <div className="alp-field">
        <label className="alp-field-label">Name <span className="alp-field-opt">(optional)</span></label>
        <input className="alp-input" placeholder="My BTC alert…" value={draft.label} onChange={e => set('label', e.target.value)} />
      </div>

      {isPriceType && (
        <>
          <div className="alp-field">
            <label className="alp-field-label">Symbol</label>
            <input className="alp-input" placeholder="BTC-USDT" value={draft.target} onChange={e => set('target', e.target.value.toUpperCase())} />
          </div>
          {draft.type === 'price_movement' && (
            <div className="alp-field">
              <label className="alp-field-label">Threshold (%)</label>
              <div className="alp-input-row">
                <span className="alp-input-pre">±</span>
                <input className="alp-input alp-input--no-left" type="number" min="0.1" step="0.1" placeholder="5" value={draft.thresholds.pct ?? ''} onChange={e => setT('pct', e.target.value)} />
                <span className="alp-input-suf">%</span>
              </div>
              <p className="alp-field-hint">Alert fires when price moves by this % in either direction.</p>
            </div>
          )}
          {draft.type === 'price_level' && (
            <>
              <div className="alp-field">
                <label className="alp-field-label">Direction</label>
                <div className="alp-seg">
                  {['above','below'].map(d => (
                    <button key={d} className={`alp-seg-btn ${draft.thresholds.direction === d ? 'active' : ''}`} onClick={() => setT('direction', d)}>
                      {d === 'above' ? '↑ Above' : '↓ Below'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="alp-field">
                <label className="alp-field-label">Target Price (USD)</label>
                <div className="alp-input-row">
                  <span className="alp-input-pre">$</span>
                  <input className="alp-input alp-input--no-left" type="number" min="0" step="any" placeholder="50000" value={draft.thresholds.price ?? ''} onChange={e => setT('price', e.target.value)} />
                </div>
              </div>
            </>
          )}
        </>
      )}

      {isWalletType && (
        <>
          <div className="alp-field">
            <label className="alp-field-label">Wallet Address</label>
            <input className="alp-input alp-input--mono" placeholder="0x…" value={draft.target} onChange={e => set('target', e.target.value)} />
            <p className="alp-field-hint">Watch any tracked wallet or your own.</p>
          </div>
          {['wallet_deposit','wallet_withdrawal'].includes(draft.type) && (
            <div className="alp-field">
              <label className="alp-field-label">Amount Range (USD)</label>
              <div className="alp-input-row">
                <span className="alp-input-pre">Min $</span>
                <input className="alp-input alp-input--no-left" type="number" min="0" placeholder="0" value={draft.thresholds.min ?? ''} onChange={e => setT('min', e.target.value)} />
                <span className="alp-input-sep">–</span>
                <span className="alp-input-pre">Max $</span>
                <input className="alp-input alp-input--no-left" type="number" min="0" placeholder="any" value={draft.thresholds.max ?? ''} onChange={e => setT('max', e.target.value)} />
              </div>
              <p className="alp-field-hint">Leave Max blank to alert on all amounts above Min.</p>
            </div>
          )}
          {['wallet_fill','position_open','position_close','order_placed','order_cancelled'].includes(draft.type) && (
            <div className="alp-field">
              <label className="alp-field-label">Symbol Filter <span className="alp-field-opt">(optional)</span></label>
              <input className="alp-input" placeholder="BTC-USDT or leave blank for all" value={draft.thresholds.symbol ?? ''} onChange={e => setT('symbol', e.target.value.toUpperCase())} />
            </div>
          )}
        </>
      )}

      {isPnlType && (
        <>
          <div className="alp-field">
            <label className="alp-field-label">Wallet Address</label>
            <input className="alp-input alp-input--mono" placeholder="0x… or your own wallet" value={draft.target} onChange={e => set('target', e.target.value)} />
          </div>
          <div className="alp-field">
            <label className="alp-field-label">Direction</label>
            <div className="alp-seg">
              {['above','below'].map(d => (
                <button key={d} className={`alp-seg-btn ${draft.thresholds.direction === d ? 'active' : ''}`} onClick={() => setT('direction', d)}>
                  {d === 'above' ? '↑ Profit above' : '↓ Loss below'}
                </button>
              ))}
            </div>
          </div>
          <div className="alp-field">
            <label className="alp-field-label">PnL Threshold (USD)</label>
            <div className="alp-input-row">
              <span className="alp-input-pre">$</span>
              <input className="alp-input alp-input--no-left" type="number" step="any" placeholder="1000" value={draft.thresholds.value ?? ''} onChange={e => setT('value', e.target.value)} />
            </div>
          </div>
        </>
      )}

      {isListingsType && (
        <div className="alp-field">
          <label className="alp-field-label">Keyword Filter <span className="alp-field-opt">(optional)</span></label>
          <input className="alp-input" placeholder="e.g. SOL, MEME…" value={draft.target === '__any__' ? '' : draft.target} onChange={e => set('target', e.target.value || '__any__')} />
          <p className="alp-field-hint">Alert on any new coin, or only if the name contains this keyword.</p>
        </div>
      )}

      {isAnnouncement && (
        <div className="alp-banner alp-banner--info">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          SoDEX announcement data stream is not yet available. This alert type will activate once the feed is live.
        </div>
      )}

      <div className="alp-field">
        <label className="alp-field-label">Delivery Channels</label>
        <div className="alp-channels">
          {[['telegram','Telegram'],['discord','Discord']].map(([ch, lbl]) => (
            <label key={ch} className={`alp-ch-item ${draft.channels[ch] ? 'active' : ''}`}>
              <input type="checkbox" checked={!!draft.channels[ch]} onChange={e => setC(ch, e.target.checked)} />
              <span>{lbl}</span>
            </label>
          ))}
        </div>
        <p className="alp-field-hint">Connect channels in Profile → Alerts settings.</p>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const [alerts, setAlerts]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [cat, setCat]           = useState('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing]   = useState(null)   // null = new, object = existing
  const [draft, setDraft]       = useState(defaultDraft('price_movement'))
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)

  useEffect(() => { document.title = 'Alerts | CommunityScan SoDEX' }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/alerts')
      const json = await res.json()
      setAlerts(json.alerts ?? [])
    } catch { setAlerts([]) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditing(null)
    setDraft(defaultDraft('price_movement'))
    setError(null)
    setDrawerOpen(true)
  }

  const openEdit = (alert) => {
    setEditing(alert)
    setDraft({ type: alert.type, target: alert.target, thresholds: alert.thresholds ?? {}, channels: alert.channels ?? { telegram: true }, label: alert.label ?? '' })
    setError(null)
    setDrawerOpen(true)
  }

  const openDuplicate = (alert) => {
    setEditing(null)
    setDraft({ type: alert.type, target: alert.target, thresholds: alert.thresholds ?? {}, channels: alert.channels ?? { telegram: true }, label: alert.label ? `${alert.label} (copy)` : '' })
    setError(null)
    setDrawerOpen(true)
  }

  const handleSave = async () => {
    setError(null)
    if (!draft.type) return
    const target = draft.target.trim() || '__any__'
    setSaving(true)
    try {
      const url = editing ? `/api/alerts/${editing.id}` : '/api/alerts'
      const method = editing ? 'PATCH' : 'POST'
      const res = await authFetch(url, { method, body: JSON.stringify({ ...draft, target }) })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Save failed'); setSaving(false); return }
      setDrawerOpen(false)
      await load()
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  const handleDelete = async (alert) => {
    if (!confirm(`Delete alert "${alert.label || TYPE_META[alert.type]?.label}"?`)) return
    await authFetch(`/api/alerts/${alert.id}`, { method: 'DELETE' })
    setAlerts(prev => prev.filter(a => a.id !== alert.id))
  }

  const handleToggle = async (alert) => {
    await authFetch(`/api/alerts/${alert.id}`, { method: 'PATCH', body: JSON.stringify({ enabled: !alert.enabled }) })
    setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, enabled: !a.enabled } : a))
  }

  const visible = cat === 'all' ? alerts : alerts.filter(a => TYPE_META[a.type]?.cat === cat)
  const typesForCat = cat === 'all'
    ? Object.entries(TYPE_META).map(([id]) => id)
    : Object.entries(TYPE_META).filter(([, m]) => m.cat === cat).map(([id]) => id)

  return (
    <div className="page-content alp-root">
      <div className="alp-layout">

        {/* Sidebar */}
        <aside className="alp-sidebar">
          <div className="alp-sidebar-header">
            <span className="alp-sidebar-title">Categories</span>
          </div>
          <nav className="alp-nav">
            {CATEGORIES.map(c => {
              const count = c.id === 'all' ? alerts.length : alerts.filter(a => TYPE_META[a.type]?.cat === c.id).length
              return (
                <button key={c.id} className={`alp-nav-item ${cat === c.id ? 'active' : ''}`} onClick={() => setCat(c.id)}>
                  <span className="alp-nav-icon">{c.icon}</span>
                  <span className="alp-nav-label">{c.label}</span>
                  {count > 0 && <span className="alp-nav-count">{count}</span>}
                </button>
              )
            })}
          </nav>
          <div className="alp-sidebar-footer">
            <a href="/profile" className="alp-sidebar-link">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              Channel Settings
            </a>
          </div>
        </aside>

        {/* Main content */}
        <main className="alp-main">
          <div className="alp-topbar">
            <div>
              <h1 className="alp-page-title">Alerts</h1>
              <p className="alp-page-sub">Real-time notifications for price, wallet activity, listings, and PnL.</p>
            </div>
            <button className="alp-btn-new" onClick={openNew}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Alert
            </button>
          </div>

          {loading ? (
            <div className="alp-loading">
              {[...Array(3)].map((_, i) => <div key={i} className="alp-skeleton" />)}
            </div>
          ) : visible.length === 0 ? (
            <div className="alp-empty">
              <div className="alp-empty-icon">◈</div>
              <div className="alp-empty-title">No alerts yet</div>
              <div className="alp-empty-sub">Create your first alert to get notified via Telegram or Discord.</div>
              <button className="alp-btn-new" onClick={openNew}>New Alert</button>
            </div>
          ) : (
            <div className="alp-list">
              {visible.map(a => (
                <AlertCard key={a.id} alert={a}
                  onEdit={openEdit}
                  onDuplicate={openDuplicate}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Drawer overlay */}
      {drawerOpen && (
        <div className="alp-overlay" onClick={() => setDrawerOpen(false)}>
          <div className="alp-drawer" onClick={e => e.stopPropagation()}>
            <div className="alp-drawer-header">
              <h2 className="alp-drawer-title">{editing ? 'Edit Alert' : 'New Alert'}</h2>
              <button className="alp-drawer-close" onClick={() => setDrawerOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Type picker (only when creating new) */}
            {!editing && (
              <div className="alp-drawer-section">
                <label className="alp-field-label">Alert Type</label>
                <div className="alp-type-grid">
                  {typesForCat.map(tid => {
                    const m = TYPE_META[tid]
                    if (!m) return null
                    return (
                      <button key={tid} className={`alp-type-tile ${draft.type === tid ? 'active' : ''}`} onClick={() => setDraft({ ...defaultDraft(tid), label: draft.label })} style={{ '--tile-color': CAT_COLORS[m.cat] }}>
                        <span className="alp-type-tile-name">{m.label}</span>
                        <span className="alp-type-tile-desc">{m.desc}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="alp-drawer-body">
              <DrawerFields draft={draft} onChange={setDraft} />
            </div>

            {error && <div className="alp-drawer-error">{error}</div>}

            <div className="alp-drawer-footer">
              <button className="alp-btn-ghost" onClick={() => setDrawerOpen(false)}>Cancel</button>
              <button className="alp-btn-save" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Alert'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
