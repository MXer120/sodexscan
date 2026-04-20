'use client'

import React, { useState, useEffect, useRef } from 'react'
import '../styles/DesignSystemPage.css'

// ─── Token data ───────────────────────────────────────────────────────────────

const COLOR_GROUPS = [
  {
    label: 'Backgrounds',
    tokens: [
      { name: '--ds-bg-0', value: '#141414', desc: 'Page base' },
      { name: '--ds-bg-1', value: '#1a1a1a', desc: 'App shell' },
      { name: '--ds-bg-2', value: '#1f1f1f', desc: 'Sidebar / containers' },
      { name: '--ds-bg-3', value: '#242424', desc: 'Cards / inner boxes' },
      { name: '--ds-bg-4', value: '#2a2a2a', desc: 'Hover states' },
      { name: '--ds-bg-5', value: '#2e2e2e', desc: 'Borders / active chips' },
    ],
  },
  {
    label: 'Borders',
    tokens: [
      { name: '--ds-border-subtle', value: '#2a2a2a', desc: 'Lightest divider' },
      { name: '--ds-border-default', value: '#333333', desc: 'Standard border' },
      { name: '--ds-border-strong', value: '#3d3d3d', desc: 'Emphasized border' },
    ],
  },
  {
    label: 'Text',
    tokens: [
      { name: '--ds-text-primary', value: '#f5f5f5', desc: 'Headings / values' },
      { name: '--ds-text-secondary', value: '#a8a8a8', desc: 'Labels / subtitles' },
      { name: '--ds-text-tertiary', value: '#777777', desc: 'Placeholders' },
      { name: '--ds-text-muted', value: '#555555', desc: 'Disabled / hints' },
    ],
  },
  {
    label: 'Accent',
    tokens: [
      { name: '--ds-accent', value: '#f26b1f', desc: 'Primary action' },
      { name: '--ds-accent-hover', value: '#ff7d33', desc: 'Hover state' },
      { name: '--ds-accent-dim', value: '#c85614', desc: 'Pressed / dark' },
      { name: '--ds-accent-soft', value: 'rgba(242,107,31,0.15)', display: '#f26b1f26', desc: 'Tinted fill' },
    ],
  },
  {
    label: 'Semantic',
    tokens: [
      { name: '--ds-success', value: '#22c55e', desc: 'Completed / positive' },
      { name: '--ds-warning', value: '#f59e0b', desc: 'Pending / caution' },
      { name: '--ds-danger-red', value: '#ef4444', desc: 'Negative / error' },
    ],
  },
  {
    label: 'Chart Pixels',
    tokens: [
      { name: '--ds-pixel-off', value: '#252525', desc: 'Empty cell' },
      { name: '--ds-pixel-low', value: '#ff8844', desc: 'Low fill' },
      { name: '--ds-pixel-high', value: '#f26b1f', desc: 'Peak fill' },
    ],
  },
]

const TYPE_SCALE = [
  { name: 'Display', size: '32px', weight: '600', font: 'mono', sample: '12,847.39' },
  { name: 'Heading', size: '24px', weight: '600', font: 'sans', sample: 'Dashboard Overview' },
  { name: 'Subheading', size: '18px', weight: '600', font: 'sans', sample: 'Revenue Breakdown' },
  { name: 'Body', size: '14px', weight: '400', font: 'sans', sample: 'Customer details and activity' },
  { name: 'Label', size: '13px', weight: '500', font: 'sans', sample: 'Total Revenue' },
  { name: 'Caption', size: '11px', weight: '500', font: 'sans', sample: 'LAST 30 DAYS' },
  { name: 'Mono Code', size: '12px', weight: '400', font: 'mono', sample: 'TXN-00184-A' },
  { name: 'Tiny Label', size: '10px', weight: '500', font: 'sans', sample: 'JAN FEB MAR' },
]

const SPACING_SCALE = [
  { token: '--ds-s-1', value: '4px' },
  { token: '--ds-s-2', value: '8px' },
  { token: '--ds-s-3', value: '12px' },
  { token: '--ds-s-4', value: '16px' },
  { token: '--ds-s-5', value: '20px' },
  { token: '--ds-s-6', value: '24px' },
  { token: '--ds-s-8', value: '32px' },
]

const RADIUS_SCALE = [
  { token: '--ds-r-sm', value: '6px', label: 'Small' },
  { token: '--ds-r-md', value: '8px', label: 'Medium' },
  { token: '--ds-r-lg', value: '12px', label: 'Large' },
  { token: '--ds-r-xl', value: '16px', label: 'XL' },
]

// ─── Canvas wrapper ───────────────────────────────────────────────────────────

function Canvas({ id, title, desc, children }) {
  return (
    <div className="ds-canvas" id={id}>
      <div className="ds-canvas-header">
        <h2 className="ds-canvas-title">{title}</h2>
        {desc && <p className="ds-canvas-desc">{desc}</p>}
      </div>
      <div className="ds-canvas-body">{children}</div>
    </div>
  )
}

// ─── Scroll-tracking sidebar ──────────────────────────────────────────────────

function DsSidebar({ sections, activeId }) {
  return (
    <nav className="ds-sidenav">
      <span className="ds-sidenav-label">On this page</span>
      {sections.map(s => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className={`ds-sidenav-item ${activeId === s.id ? 'active' : ''}`}
          onClick={e => {
            e.preventDefault()
            document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
        >
          {s.label}
        </a>
      ))}
    </nav>
  )
}

function TabWithSidebar({ sections, children }) {
  const [activeId, setActiveId] = useState(sections[0]?.id)

  useEffect(() => {
    const observers = sections.map(s => {
      const el = document.getElementById(s.id)
      if (!el) return null
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveId(s.id) },
        { rootMargin: '-10% 0px -80% 0px', threshold: 0 }
      )
      obs.observe(el)
      return obs
    })
    return () => observers.forEach(o => o?.disconnect())
  }, [sections])

  return (
    <div className="ds-tab-layout">
      <DsSidebar sections={sections} activeId={activeId} />
      <div className="ds-main-content">{children}</div>
    </div>
  )
}

// ─── Token section components ─────────────────────────────────────────────────

function ColorPalette() {
  const [copied, setCopied] = useState(null)
  const copy = (val) => {
    navigator.clipboard?.writeText(val)
    setCopied(val)
    setTimeout(() => setCopied(null), 1200)
  }
  return (
    <div className="ds-color-groups">
      {COLOR_GROUPS.map(g => (
        <div key={g.label} className="ds-color-group">
          <h3 className="ds-color-group-label">{g.label}</h3>
          <div className="ds-color-row">
            {g.tokens.map(t => (
              <button
                key={t.name}
                className={`ds-color-chip ${copied === t.value ? 'copied' : ''}`}
                onClick={() => copy(t.value)}
                title={`Click to copy ${t.value}`}
              >
                <div className="ds-color-swatch" style={{ background: t.value }} />
                <div className="ds-color-info">
                  <span className="ds-color-name">{t.name}</span>
                  <span className="ds-color-value">{t.value}</span>
                  <span className="ds-color-desc">{t.desc}</span>
                </div>
                {copied === t.value && <span className="ds-copied-badge">Copied!</span>}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function TypographyTable() {
  return (
    <div className="ds-type-table">
      {TYPE_SCALE.map(t => (
        <div key={t.name} className="ds-type-row">
          <div className="ds-type-meta">
            <span className="ds-type-name">{t.name}</span>
            <span className="ds-type-spec">{t.size} · {t.weight} · {t.font === 'mono' ? 'JetBrains Mono' : 'Inter'}</span>
          </div>
          <div
            className="ds-type-sample"
            style={{
              fontSize: t.size,
              fontWeight: t.weight,
              fontFamily: t.font === 'mono' ? "'JetBrains Mono', monospace" : "'Inter', sans-serif",
              letterSpacing: t.font === 'mono' ? '0' : '-0.005em',
            }}
          >
            {t.sample}
          </div>
        </div>
      ))}
    </div>
  )
}

function SpacingVis() {
  return (
    <div className="ds-spacing-section">
      <div className="ds-spacing-list">
        {SPACING_SCALE.map(s => (
          <div key={s.token} className="ds-spacing-row">
            <span className="ds-spacing-token">{s.token}</span>
            <div className="ds-spacing-bar-wrap">
              <div className="ds-spacing-bar" style={{ width: s.value, minWidth: '4px' }} />
            </div>
            <span className="ds-spacing-value">{s.value}</span>
          </div>
        ))}
      </div>
      <div className="ds-radius-row">
        {RADIUS_SCALE.map(r => (
          <div key={r.token} className="ds-radius-chip">
            <div className="ds-radius-box" style={{ borderRadius: r.value }} />
            <span className="ds-radius-label">{r.label}</span>
            <span className="ds-radius-value">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── SVG icon helpers ─────────────────────────────────────────────────────────

const IcoDashboard = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
const IcoCustomers = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/></svg>
const IcoAnalytics = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
const IcoReports = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg>
const IcoSettings = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
const IcoHelp = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>

// ─── Component section components ─────────────────────────────────────────────

function KpiCardsDemo() {
  const [hovered, setHovered] = useState(null)
  const cards = [
    { label: 'Total Revenue', value: '$48,295', suffix: 'usd', delta: '+0.94%', deltaLabel: 'last year', positive: true },
    { label: 'Active Customers', value: '2,841', suffix: '', delta: '+12.3%', deltaLabel: 'last month', positive: true },
    { label: 'Avg Order Value', value: '$127', suffix: '', delta: '-2.1%', deltaLabel: 'last week', positive: false },
    { label: 'Refund Rate', value: '1.4', suffix: '%', delta: '+0.2%', deltaLabel: 'last month', positive: false },
  ]
  const sparkHeights = [30, 55, 40, 70, 50, 80, 65, 90]
  return (
    <div className="ds-kpi-grid">
      {cards.map((c, idx) => (
        <div
          key={c.label}
          className={`ds-kpi-card${hovered === idx ? ' hovered' : ''}`}
          onMouseEnter={() => setHovered(idx)}
          onMouseLeave={() => setHovered(null)}
        >
          <div className="ds-kpi-inner">
            <div className="ds-kpi-label-row">
              <span className="ds-kpi-label">{c.label}</span>
            </div>
            <div className="ds-kpi-value-row">
              <span className="ds-kpi-value">{c.value}</span>
              {c.suffix && <span className="ds-kpi-suffix">{c.suffix}</span>}
            </div>
            <div className="ds-kpi-sparkline">
              {sparkHeights.map((h, i) => (
                <div key={i} className={`ds-spark-bar ${i === sparkHeights.length - 1 ? 'peak' : ''}`} style={{ height: h + '%' }} />
              ))}
            </div>
          </div>
          {/* Footer: info icon LEFT, delta% + label RIGHT */}
          <div className="ds-kpi-footer">
            <span className="ds-info-icon" title={`About ${c.label}`}>i</span>
            <div className="ds-kpi-footer-right">
              <span className={`ds-kpi-delta ${c.positive ? 'up' : 'down'}`}>{c.delta}</span>
              <span className="ds-kpi-delta-label">{c.deltaLabel}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function PixelChartDemo() {
  const COLS = 24
  const ROWS = 12
  const [hoveredCol, setHoveredCol] = useState(null)
  const getHeight = (col) => Math.round(3 + Math.sin(col * 0.4) * 2 + (col * 7 % 4))
  const cols = Array.from({ length: COLS }, (_, i) => ({
    filled: Math.min(ROWS, getHeight(i)),
    peak: i === 18,
  }))
  return (
    <div className="ds-pixel-demo">
      <div className="ds-pixel-grid" style={{ '--cols': COLS, '--rows': ROWS }}>
        {cols.map((col, ci) => (
          <div
            key={ci}
            className={`ds-pixel-col ${col.peak ? 'peak' : ''} ${hoveredCol === ci ? 'hov' : ''}`}
            onMouseEnter={() => setHoveredCol(ci)}
            onMouseLeave={() => setHoveredCol(null)}
          >
            {Array.from({ length: ROWS }, (_, ri) => {
              const fromBottom = ROWS - 1 - ri
              const filled = fromBottom < col.filled
              const high = filled && fromBottom < Math.ceil(col.filled * 0.4)
              return (
                <div key={ri} className={`ds-pixel-cell ${filled ? (high ? 'high' : 'low') : ''}`} />
              )
            })}
          </div>
        ))}
      </div>
      <div className="ds-pixel-legend">
        <span><span className="ds-swatch" style={{ background: '#f26b1f' }} /> Filled (high)</span>
        <span><span className="ds-swatch" style={{ background: '#ff8844' }} /> Filled (low)</span>
        <span><span className="ds-swatch" style={{ background: '#252525' }} /> Empty</span>
        {hoveredCol !== null && <span style={{ color: 'var(--ds-accent)', marginLeft: 'auto' }}>Col {hoveredCol + 1} · {cols[hoveredCol].filled}/{ROWS} filled</span>}
      </div>
    </div>
  )
}

function ButtonsDemo() {
  const [clicked, setClicked] = useState(null)
  const [notifOn, setNotifOn] = useState(false)
  const flash = (id) => { setClicked(id); setTimeout(() => setClicked(null), 600) }
  return (
    <div className="ds-component-row">
      <div className="ds-component-group">
        <span className="ds-component-label">Primary</span>
        <div className="ds-flex-row">
          <button
            className={`ds-btn ds-btn-primary${clicked === 'save' ? ' pressed' : ''}`}
            onClick={() => flash('save')}
          >
            {clicked === 'save' ? 'Saved ✓' : 'Save Changes'}
          </button>
          <button className="ds-btn ds-btn-primary" disabled>Disabled</button>
        </div>
      </div>
      <div className="ds-component-group">
        <span className="ds-component-label">Secondary</span>
        <div className="ds-flex-row">
          <button
            className={`ds-btn ds-btn-secondary${clicked === 'export' ? ' pressed' : ''}`}
            onClick={() => flash('export')}
          >
            {clicked === 'export' ? 'Exported ✓' : 'Export'}
          </button>
          <button className="ds-btn ds-btn-secondary" onClick={() => flash('add')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Transaction
          </button>
        </div>
      </div>
      <div className="ds-component-group">
        <span className="ds-component-label">Ghost</span>
        <div className="ds-flex-row">
          <button className="ds-btn ds-btn-ghost" onClick={() => flash('cancel')}>
            {clicked === 'cancel' ? '✕ Cancelled' : 'Cancel'}
          </button>
          <button className="ds-btn ds-btn-ghost" onClick={() => flash('view')}>View All</button>
        </div>
      </div>
      <div className="ds-component-group">
        <span className="ds-component-label">Icon Button</span>
        <div className="ds-flex-row">
          <button className="ds-icon-btn" title="More options" onClick={() => flash('dots')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
          </button>
          <button
            className={`ds-icon-btn${notifOn ? ' ds-icon-btn-active' : ''}`}
            title={notifOn ? 'Mute notifications' : 'Enable notifications'}
            onClick={() => setNotifOn(v => !v)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function StatusPillsDemo() {
  const [selected, setSelected] = useState(null)
  const statuses = [
    { label: 'Completed', cls: 'success' },
    { label: 'Pending', cls: 'pending' },
    { label: 'Refunded', cls: 'refunded' },
    { label: 'Active', cls: 'active' },
    { label: 'Inactive', cls: 'inactive' },
    { label: 'VIP', cls: 'vip' },
  ]
  return (
    <div>
      <div className="ds-flex-row ds-wrap">
        {statuses.map(s => (
          <button
            key={s.label}
            className={`ds-status-pill ${s.cls}${selected === s.label ? ' ring' : ''}`}
            onClick={() => setSelected(v => v === s.label ? null : s.label)}
            style={{ cursor: 'pointer', border: 'none', background: undefined }}
          >
            {s.label}
          </button>
        ))}
      </div>
      {selected && (
        <p style={{ marginTop: 12, fontSize: 12, color: 'var(--ds-text-tertiary)' }}>
          Selected: <span style={{ color: 'var(--ds-text-secondary)' }}>{selected}</span> — click again to deselect
        </p>
      )}
    </div>
  )
}

function FormControlsDemo() {
  const [seg, setSeg] = useState('Daily')
  const [activeChip, setActiveChip] = useState('All')
  const [checks, setChecks] = useState([true, false, false])
  const [searchVal, setSearchVal] = useState('')
  const toggleCheck = (i) => setChecks(c => c.map((v, idx) => idx === i ? !v : v))
  return (
    <div>
      <div className="ds-form-row">
        <div className="ds-form-group">
          <label className="ds-label">Search</label>
          <div className="ds-input-box">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input placeholder="Search…" value={searchVal} onChange={e => setSearchVal(e.target.value)} />
            <span className="ds-kbd">⌘K</span>
          </div>
        </div>
        <div className="ds-form-group">
          <label className="ds-label">Text Input</label>
          <input className="ds-input" placeholder="Enter value…" />
        </div>
        <div className="ds-form-group">
          <label className="ds-label">Segmented Control</label>
          <div className="ds-segmented">
            {['Daily', 'Weekly', 'Monthly'].map(v => (
              <button key={v} className={seg === v ? 'active' : ''} onClick={() => setSeg(v)}>{v}</button>
            ))}
          </div>
        </div>
        <div className="ds-form-group">
          <label className="ds-label">Split Control</label>
          <div className="ds-split-control">
            <button>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {seg}
            </button>
            <div className="ds-divider" />
            <button>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Apr 1 – Apr 30
            </button>
          </div>
        </div>
      </div>
      <div className="ds-form-row" style={{ marginTop: 16 }}>
        <div className="ds-form-group">
          <label className="ds-label">Filter Chips</label>
          <div className="ds-flex-row">
            {['All', 'Completed', 'Pending', 'VIP'].map(v => (
              <button
                key={v}
                className={`ds-chip${activeChip === v ? ' active' : ''}`}
                onClick={() => setActiveChip(v)}
              >{v}</button>
            ))}
          </div>
        </div>
        <div className="ds-form-group">
          <label className="ds-label">Checkbox</label>
          <div className="ds-flex-row" style={{ gap: 12 }}>
            {['Notify me', 'Remember', 'Auto-save'].map((lbl, i) => (
              <label key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 12, color: 'var(--ds-text-secondary)' }}>
                <div
                  className={`ds-checkbox${checks[i] ? ' checked' : ''}`}
                  onClick={() => toggleCheck(i)}
                  role="checkbox"
                  aria-checked={checks[i]}
                  tabIndex={0}
                  onKeyDown={e => e.key === ' ' && toggleCheck(i)}
                />
                {lbl}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function AiInsightPillDemo() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const click = () => {
    if (loading || done) return
    setLoading(true)
    setTimeout(() => { setLoading(false); setDone(true) }, 1800)
    setTimeout(() => setDone(false), 4000)
  }
  return (
    <button className={`ds-ai-pill${loading ? ' loading' : ''}${done ? ' done' : ''}`} onClick={click}>
      <div className="ds-ai-pill-icon">{loading ? '⟳' : done ? '✓' : '✦'}</div>
      <span>{loading ? 'Analyzing…' : done ? 'Revenue up 12% vs last quarter' : 'Get AI insights for better analysis'}</span>
      <div className="ds-ai-pill-arrow">{done ? '✓' : '→'}</div>
    </button>
  )
}

function TableDemo() {
  const allRows = [
    { id: 'TXN-00184', customer: 'Alex Chen', email: 'alex@example.com', amount: 240.00, amountFmt: '$240.00', status: 'success', date: 'Apr 19, 2026' },
    { id: 'TXN-00183', customer: 'Sarah Kim', email: 'sarah@example.com', amount: 89.50, amountFmt: '$89.50', status: 'pending', date: 'Apr 18, 2026' },
    { id: 'TXN-00182', customer: 'Marcus Webb', email: 'marcus@example.com', amount: 312.00, amountFmt: '$312.00', status: 'refunded', date: 'Apr 17, 2026' },
  ]
  const [search, setSearch] = useState('')
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [sortDir, setSortDir] = useState(1)
  const [page, setPage] = useState(1)

  const rows = allRows
    .filter(r => !search || r.customer.toLowerCase().includes(search.toLowerCase()) || r.id.includes(search))
    .sort((a, b) => (a.amount - b.amount) * sortDir)

  const toggleRow = (id) => setSelectedRows(prev => {
    const n = new Set(prev)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  return (
    <div className="ds-table-card">
      <div className="ds-table-topstrip">
        <div className="ds-table-search">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input placeholder="Search transactions…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="ds-table-tools">
          {selectedRows.size > 0 && (
            <span style={{ fontSize: 12, color: 'var(--ds-accent)', marginRight: 4 }}>{selectedRows.size} selected</span>
          )}
          <button className="ds-btn ds-btn-secondary" style={{ fontSize: '12px', padding: '6px 10px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add
          </button>
          <button className="ds-icon-btn" title="Sort by amount" onClick={() => setSortDir(d => d * -1)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div className="ds-table-inner">
        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}></th>
              <th>Transaction ID</th>
              <th>Customer</th>
              <th
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setSortDir(d => d * -1)}
                title="Click to sort"
              >
                Amount {sortDir === 1 ? '↑' : '↓'}
              </th>
              <th>Status</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr
                key={r.id}
                style={{ background: selectedRows.has(r.id) ? 'rgba(242,107,31,0.06)' : undefined }}
                onClick={() => toggleRow(r.id)}
              >
                <td>
                  <div
                    className={`ds-checkbox${selectedRows.has(r.id) ? ' checked' : ''}`}
                    style={{ margin: '0 auto' }}
                  />
                </td>
                <td className="mono">{r.id}</td>
                <td>
                  <div className="ds-customer-cell">
                    <div className="ds-avatar" style={{ background: `hsl(${r.customer.charCodeAt(0) * 5 % 360}, 60%, 40%)` }}>
                      {r.customer[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 13 }}>{r.customer}</div>
                      <div style={{ fontSize: 11, color: 'var(--ds-text-tertiary)' }}>{r.email}</div>
                    </div>
                  </div>
                </td>
                <td className="mono">{r.amountFmt}</td>
                <td><span className={`ds-status-pill ${r.status}`}>{r.status}</span></td>
                <td style={{ color: 'var(--ds-text-secondary)', fontSize: 12 }}>{r.date}</td>
                <td onClick={e => e.stopPropagation()}>
                  <button className="ds-row-actions">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="ds-pagination">
          <span>Showing {rows.length} of {allRows.length}</span>
          <div className="ds-pagination-btns">
            <button className="ds-page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {[1, 2, 3].map(p => (
              <button key={p} className={`ds-page-btn${page === p ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="ds-page-btn" disabled={page === 3} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SidebarDemo() {
  const [active, setActive] = useState('dashboard')
  const items = [
    { id: 'dashboard', label: 'Dashboard', Icon: IcoDashboard },
    { id: 'customers', label: 'Customers', Icon: IcoCustomers },
    { id: 'analytics', label: 'Analytics', Icon: IcoAnalytics, badge: true },
    { id: 'reports', label: 'Reports', Icon: IcoReports },
  ]
  const bottom = [
    { id: 'settings', label: 'Settings', Icon: IcoSettings },
    { id: 'help', label: 'Help', Icon: IcoHelp },
  ]
  return (
    <div className="ds-sidebar-demo">
      <div className="ds-sidebar">
        <div className="ds-sidebar-brand">
          <div className="ds-brand-logo">NS</div>
          <div className="ds-brand-text">
            <div className="ds-brand-label">Studio</div>
            <div className="ds-brand-name">Northside</div>
          </div>
        </div>
        <div className="ds-nav-section">
          <div className="ds-nav-title">Main</div>
          {items.map(i => (
            <button
              key={i.id}
              className={`ds-nav-item ${active === i.id ? 'active' : ''}`}
              onClick={() => setActive(i.id)}
            >
              <span className="ds-nav-icon"><i.Icon /></span>
              {i.label}
              {i.badge && <span className="ds-badge-dot" />}
            </button>
          ))}
        </div>
        <div className="ds-nav-section">
          <div className="ds-nav-title">System</div>
          {bottom.map(i => (
            <button
              key={i.id}
              className={`ds-nav-item ${active === i.id ? 'active' : ''}`}
              onClick={() => setActive(i.id)}
            >
              <span className="ds-nav-icon"><i.Icon /></span>
              {i.label}
            </button>
          ))}
        </div>
        <div className="ds-sidebar-user">
          <div className="ds-user-avatar">AK</div>
          <div>
            <div className="ds-user-name">Alex Kim</div>
            <div className="ds-user-plan">Pro Plan</div>
          </div>
        </div>
      </div>
      <div className="ds-sidebar-demo-note">
        <p style={{ margin: '0 0 8px', color: 'var(--ds-text-secondary)', fontWeight: 500 }}>Try clicking any item →</p>
        <p style={{ margin: 0 }}>Active = bg-3. Hover = orange. Sections separated by subtle dividers.</p>
        {active && <p style={{ margin: '10px 0 0', color: 'var(--ds-accent)', fontSize: 11 }}>Active: {active}</p>}
      </div>
    </div>
  )
}

function TopbarDemo() {
  return (
    <div className="ds-topbar-demo">
      <div className="ds-topbar">
        <div className="ds-breadcrumb">
          <span className="ds-breadcrumb-muted">App</span>
          <span className="ds-breadcrumb-sep">/</span>
          <span>Dashboard</span>
        </div>
        <div className="ds-topbar-search">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input placeholder="Search…" />
          <span className="ds-kbd">⌘K</span>
        </div>
        <div className="ds-topbar-icon-row">
          <div className="ds-topbar-iconbox" title="Inbox">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
            <div className="ds-topbar-dot" />
          </div>
          <div className="ds-topbar-iconbox" title="Notifications">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <div className="ds-topbar-avatarbox">
            <div className="ds-topbar-av">AK</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab section configs ──────────────────────────────────────────────────────

const TOKEN_SECTIONS = [
  { id: 'ds-colors', label: 'Color Tokens' },
  { id: 'ds-typography', label: 'Typography' },
  { id: 'ds-spacing', label: 'Spacing & Radius' },
]

const COMPONENT_SECTIONS = [
  { id: 'ds-kpi', label: 'KPI Cards' },
  { id: 'ds-chart', label: 'Pixel Chart' },
  { id: 'ds-buttons', label: 'Buttons' },
  { id: 'ds-status', label: 'Status Pills' },
  { id: 'ds-forms', label: 'Form Controls' },
  { id: 'ds-ai-pill', label: 'AI Insight Pill' },
  { id: 'ds-table', label: 'Tables' },
  { id: 'ds-sidebar-nav', label: 'Sidebar Nav' },
  { id: 'ds-topbar', label: 'Topbar' },
]

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'tokens', label: 'Design Tokens' },
  { id: 'components', label: 'Components' },
  { id: 'preview', label: 'Dashboard Preview' },
]

export default function DesignSystemPage() {
  const [tab, setTab] = useState('tokens')

  useEffect(() => {
    document.title = 'Design System | CommunityScan SoDEX'
  }, [])

  return (
    <div className="ds-page">
      <div className="ds-page-header">
        <div>
          <h1 className="ds-page-title">Design System</h1>
          <p className="ds-page-subtitle">Northside Studio — tokens, components, and patterns</p>
        </div>
        <div className="ds-tab-switch">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`ds-tab-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'tokens' && (
        <TabWithSidebar sections={TOKEN_SECTIONS}>
          <Canvas id="ds-colors" title="Color Tokens" desc="Warm-tinted dark neutrals with a single orange accent. Click any chip to copy the value.">
            <ColorPalette />
          </Canvas>
          <Canvas id="ds-typography" title="Typography" desc="Inter for UI text. JetBrains Mono for numeric values, IDs, and code.">
            <TypographyTable />
          </Canvas>
          <Canvas id="ds-spacing" title="Spacing & Radius" desc="4px base unit for spacing. Four border-radius steps from 6px to 16px.">
            <SpacingVis />
          </Canvas>
        </TabWithSidebar>
      )}

      {tab === 'components' && (
        <TabWithSidebar sections={COMPONENT_SECTIONS}>
          <Canvas id="ds-kpi" title="KPI Cards" desc="Double-box pattern: outer bg-1 frame, inner bg-3 card with inset shadow. Footer row always in the outer box. Negative deltas are red.">
            <KpiCardsDemo />
          </Canvas>
          <Canvas id="ds-chart" title="Pixel / Mosaic Chart" desc="Signature visual element. Stacked square cells per column. Filled cells are orange; empty near-black. Hover highlights the column.">
            <PixelChartDemo />
          </Canvas>
          <Canvas id="ds-buttons" title="Buttons" desc="Three variants: primary (orange fill), secondary (bg-3 + border), ghost (transparent). Icon buttons are 32×32.">
            <ButtonsDemo />
          </Canvas>
          <Canvas id="ds-status" title="Status Pills" desc="Colored dot + soft background tint. Used in tables and drawers.">
            <StatusPillsDemo />
          </Canvas>
          <Canvas id="ds-forms" title="Form Controls" desc="Inputs share the same boxed style as the topbar search: bg-2 + border-subtle + r-md.">
            <FormControlsDemo />
          </Canvas>
          <Canvas id="ds-ai-pill" title="AI Insight Pill" desc="Neutral-only. Gray sparkle icon + text + arrow circle. Glows on hover — never orange.">
            <AiInsightPillDemo />
          </Canvas>
          <Canvas id="ds-table" title="Tables" desc="Subtle header (same bg as rows). No heavy borders. Row hover lifts to bg-4.">
            <TableDemo />
          </Canvas>
          <Canvas id="ds-sidebar-nav" title="Sidebar Navigation" desc="Active item = bg-3 (light gray). Hover = orange. Horizontal dividers between sections.">
            <SidebarDemo />
          </Canvas>
          <Canvas id="ds-topbar" title="Topbar" desc="Sticky. Search + icon boxes all share the same style: bg-2, border-subtle, r-md. Avatar box has 3px padding.">
            <TopbarDemo />
          </Canvas>
        </TabWithSidebar>
      )}

      {tab === 'preview' && (
        <div className="ds-preview-wrap">
          <div className="ds-preview-bar">
            <span className="ds-preview-label">Dashboard.html — Northside Studio design prototype</span>
            <a
              href="/design-preview/Dashboard.html"
              target="_blank"
              rel="noopener noreferrer"
              className="ds-btn ds-btn-secondary"
              style={{ fontSize: 12, padding: '5px 10px' }}
            >
              Open in new tab ↗
            </a>
          </div>
          <iframe
            src="/design-preview/Dashboard.html"
            className="ds-preview-iframe"
            title="Dashboard Design Preview"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      )}
    </div>
  )
}
