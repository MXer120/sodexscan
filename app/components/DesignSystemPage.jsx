'use client'

import React, { useState, useEffect } from 'react'
import '../styles/DesignSystemPage.css'

// ─── Token data pulled from the imported design system ────────────────────────

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
      { name: '--ds-danger', value: '#9ca3af', desc: 'Refunded / neutral-danger' },
    ],
  },
  {
    label: 'Chart Pixels',
    tokens: [
      { name: '--ds-pixel-off', value: '#252525', desc: 'Empty cell' },
      { name: '--ds-pixel-low', value: '#3a3a3a', desc: 'Low fill' },
      { name: '--ds-pixel-mid', value: '#ff8844', desc: 'Mid fill' },
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

// ─── Section components ───────────────────────────────────────────────────────

function SectionHeader({ title, desc }) {
  return (
    <div className="ds-section-header">
      <h2 className="ds-section-title">{title}</h2>
      {desc && <p className="ds-section-desc">{desc}</p>}
    </div>
  )
}

function ColorPalette() {
  const [copied, setCopied] = useState(null)
  const copy = (val) => {
    navigator.clipboard?.writeText(val)
    setCopied(val)
    setTimeout(() => setCopied(null), 1200)
  }
  return (
    <section className="ds-section">
      <SectionHeader title="Color Tokens" desc="Warm-tinted dark neutrals with a single orange accent. All backgrounds use the --ds-bg-* scale." />
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
    </section>
  )
}

function Typography() {
  return (
    <section className="ds-section">
      <SectionHeader title="Typography" desc="Inter for UI text. JetBrains Mono for numeric values, IDs, and code." />
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
    </section>
  )
}

function Spacing() {
  return (
    <section className="ds-section">
      <SectionHeader title="Spacing Scale" desc="4px base unit. All layout uses multiples of this grid." />
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
    </section>
  )
}

function Buttons() {
  return (
    <section className="ds-section">
      <SectionHeader title="Buttons" desc="Three variants: primary (orange fill), secondary (bg-3 + border), ghost (transparent)." />
      <div className="ds-component-row">
        <div className="ds-component-group">
          <span className="ds-component-label">Primary</span>
          <div className="ds-flex-row">
            <button className="ds-btn ds-btn-primary">Save Changes</button>
            <button className="ds-btn ds-btn-primary" disabled>Disabled</button>
          </div>
        </div>
        <div className="ds-component-group">
          <span className="ds-component-label">Secondary</span>
          <div className="ds-flex-row">
            <button className="ds-btn ds-btn-secondary">Export</button>
            <button className="ds-btn ds-btn-secondary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Transaction
            </button>
          </div>
        </div>
        <div className="ds-component-group">
          <span className="ds-component-label">Ghost</span>
          <div className="ds-flex-row">
            <button className="ds-btn ds-btn-ghost">Cancel</button>
            <button className="ds-btn ds-btn-ghost">View All</button>
          </div>
        </div>
        <div className="ds-component-group">
          <span className="ds-component-label">Icon Button</span>
          <div className="ds-flex-row">
            <button className="ds-icon-btn" title="More options">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
            </button>
            <button className="ds-icon-btn ds-icon-btn-active">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

function StatusPills() {
  const statuses = [
    { label: 'Completed', cls: 'success' },
    { label: 'Pending', cls: 'pending' },
    { label: 'Refunded', cls: 'refunded' },
    { label: 'Active', cls: 'active' },
    { label: 'Inactive', cls: 'inactive' },
    { label: 'VIP', cls: 'vip' },
  ]
  return (
    <section className="ds-section">
      <SectionHeader title="Status Pills" desc="Colored dot + soft background tint. Used in tables and drawers." />
      <div className="ds-flex-row ds-wrap">
        {statuses.map(s => (
          <span key={s.label} className={`ds-status-pill ${s.cls}`}>{s.label}</span>
        ))}
      </div>
    </section>
  )
}

function KpiCards() {
  const cards = [
    { label: 'Total Revenue', value: '$48,295', suffix: 'usd', delta: '+0.94%', deltaLabel: 'last year', positive: true },
    { label: 'Active Customers', value: '2,841', suffix: '', delta: '+12.3%', deltaLabel: 'last month', positive: true },
    { label: 'Avg Order Value', value: '$127', suffix: '', delta: '-2.1%', deltaLabel: 'last week', positive: false },
    { label: 'Refund Rate', value: '1.4', suffix: '%', delta: '+0.2%', deltaLabel: 'last month', positive: false },
  ]
  const sparkHeights = [30, 55, 40, 70, 50, 80, 65, 90]
  return (
    <section className="ds-section">
      <SectionHeader title="KPI Cards" desc="Double-box pattern: outer bg-1 frame, inner bg-3 card. Footer row always in the outer box, never clipped." />
      <div className="ds-kpi-grid">
        {cards.map(c => (
          <div key={c.label} className="ds-kpi-card">
            <div className="ds-kpi-inner">
              <div className="ds-kpi-label">{c.label}</div>
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
            <div className="ds-kpi-footer">
              <span className={`ds-kpi-delta ${c.positive ? '' : 'down'}`}>
                {c.positive ? '↑' : '↓'} {c.delta}
                <span className="ds-kpi-delta-label">{c.deltaLabel}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function TableExample() {
  const rows = [
    { id: 'TXN-00184', customer: 'Alex Chen', email: 'alex@example.com', amount: '$240.00', status: 'success', date: 'Apr 19, 2026' },
    { id: 'TXN-00183', customer: 'Sarah Kim', email: 'sarah@example.com', amount: '$89.50', status: 'pending', date: 'Apr 18, 2026' },
    { id: 'TXN-00182', customer: 'Marcus Webb', email: 'marcus@example.com', amount: '$312.00', status: 'refunded', date: 'Apr 17, 2026' },
  ]
  return (
    <section className="ds-section">
      <SectionHeader title="Tables" desc="Subtle header (same bg as rows). No heavy borders. Row hover lifts to bg-4." />
      <div className="ds-table-card">
        <div className="ds-table-topstrip">
          <div className="ds-table-search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input placeholder="Search transactions…" />
          </div>
          <div className="ds-table-tools">
            <button className="ds-btn ds-btn-secondary" style={{ fontSize: '12px', padding: '6px 10px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add
            </button>
            <button className="ds-icon-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
            </button>
          </div>
        </div>
        <div className="ds-table-inner">
          <table>
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
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
                  <td className="mono">{r.amount}</td>
                  <td><span className={`ds-status-pill ${r.status}`}>{r.status}</span></td>
                  <td style={{ color: 'var(--ds-text-secondary)', fontSize: 12 }}>{r.date}</td>
                  <td>
                    <button className="ds-row-actions">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="ds-pagination">
            <span>Showing 1–3 of 184</span>
            <div className="ds-pagination-btns">
              <button className="ds-page-btn" disabled>‹</button>
              <button className="ds-page-btn active">1</button>
              <button className="ds-page-btn">2</button>
              <button className="ds-page-btn">3</button>
              <button className="ds-page-btn">›</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FormControls() {
  return (
    <section className="ds-section">
      <SectionHeader title="Form Controls" desc="Inputs share the same boxed style as the topbar search — bg-2 + border-subtle + r-md." />
      <div className="ds-form-row">
        <div className="ds-form-group">
          <label className="ds-label">Search</label>
          <div className="ds-input-box">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input placeholder="Search…" />
            <span className="ds-kbd">⌘K</span>
          </div>
        </div>
        <div className="ds-form-group">
          <label className="ds-label">Text Input</label>
          <input className="ds-input" placeholder="Enter value…" defaultValue="" />
        </div>
        <div className="ds-form-group">
          <label className="ds-label">Segmented Control</label>
          <div className="ds-segmented">
            <button className="active">Daily</button>
            <button>Weekly</button>
            <button>Monthly</button>
          </div>
        </div>
        <div className="ds-form-group">
          <label className="ds-label">Split Control</label>
          <div className="ds-split-control">
            <button>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Daily
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
            <span className="ds-chip active">All</span>
            <span className="ds-chip">Completed</span>
            <span className="ds-chip">Pending</span>
            <span className="ds-chip">VIP</span>
          </div>
        </div>
        <div className="ds-form-group">
          <label className="ds-label">Checkbox</label>
          <div className="ds-flex-row">
            <div className="ds-checkbox checked" />
            <div className="ds-checkbox" />
          </div>
        </div>
      </div>
    </section>
  )
}

function AiInsightPill() {
  return (
    <section className="ds-section">
      <SectionHeader title="AI Insight Pill" desc="Neutral-only. Gray sparkle icon + text + arrow circle. Glows on hover — never orange." />
      <button className="ds-ai-pill">
        <div className="ds-ai-pill-icon">✦</div>
        <span>Get AI insights for better analysis</span>
        <div className="ds-ai-pill-arrow">→</div>
      </button>
    </section>
  )
}

function SidebarExample() {
  const [active, setActive] = useState('dashboard')
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: '▦' },
    { id: 'customers', label: 'Customers', icon: '◉' },
    { id: 'analytics', label: 'Analytics', icon: '▲', badge: true },
    { id: 'reports', label: 'Reports', icon: '▤' },
  ]
  const bottom = [
    { id: 'settings', label: 'Settings', icon: '⚙' },
    { id: 'help', label: 'Help', icon: '?' },
  ]
  return (
    <section className="ds-section">
      <SectionHeader title="Sidebar Navigation" desc="Active item = bg-3 (light gray). Hover = orange. Horizontal dividers between sections." />
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
                <span className="ds-nav-icon">{i.icon}</span>
                {i.label}
                {i.badge && <span className="ds-badge-dot" />}
              </button>
            ))}
          </div>
          <div className="ds-nav-section">
            <div className="ds-nav-title">System</div>
            {bottom.map(i => (
              <button key={i.id} className="ds-nav-item" onClick={() => setActive(i.id)}>
                <span className="ds-nav-icon">{i.icon}</span>
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
          Active item uses bg-3 (not orange). Hover turns orange. Sections separated by subtle horizontal dividers.
        </div>
      </div>
    </section>
  )
}

function PixelChartExample() {
  const COLS = 24
  const ROWS = 12
  const getHeight = (col) => Math.round(3 + Math.sin(col * 0.4) * 2 + Math.random() * 3)
  const cols = Array.from({ length: COLS }, (_, i) => ({
    filled: Math.min(ROWS, getHeight(i)),
    peak: i === 18,
  }))
  return (
    <section className="ds-section">
      <SectionHeader title="Pixel / Mosaic Chart" desc="Signature visual element. Each column is a stack of square cells. Filled cells are orange; empty cells are near-black. Hover highlights the column." />
      <div className="ds-pixel-demo">
        <div className="ds-pixel-grid" style={{ '--cols': COLS, '--rows': ROWS }}>
          {cols.map((col, ci) => (
            <div key={ci} className={`ds-pixel-col ${col.peak ? 'peak' : ''}`}>
              {Array.from({ length: ROWS }, (_, ri) => {
                const fromBottom = ROWS - 1 - ri
                const filled = fromBottom < col.filled
                const high = filled && fromBottom < Math.ceil(col.filled * 0.4)
                return (
                  <div
                    key={ri}
                    className={`ds-pixel-cell ${filled ? (high ? 'high' : 'low') : ''}`}
                  />
                )
              })}
            </div>
          ))}
        </div>
        <div className="ds-pixel-legend">
          <span><span className="ds-swatch" style={{ background: '#f26b1f' }} /> Filled (high)</span>
          <span><span className="ds-swatch" style={{ background: '#ff8844' }} /> Filled (low)</span>
          <span><span className="ds-swatch" style={{ background: '#252525' }} /> Empty</span>
        </div>
      </div>
    </section>
  )
}

function TopbarExample() {
  return (
    <section className="ds-section">
      <SectionHeader title="Topbar" desc="Sticky. Search + icon boxes all share the same style: bg-2, border-subtle, r-md. Avatar box has 3px padding with inner rounded avatar." />
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
    </section>
  )
}

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
        <div className="ds-content">
          <ColorPalette />
          <Typography />
          <Spacing />
          <PixelChartExample />
          <KpiCards />
        </div>
      )}

      {tab === 'components' && (
        <div className="ds-content">
          <Buttons />
          <StatusPills />
          <FormControls />
          <AiInsightPill />
          <TableExample />
          <SidebarExample />
          <TopbarExample />
        </div>
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
