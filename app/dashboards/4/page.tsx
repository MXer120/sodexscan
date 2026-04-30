'use client'

import { useEffect, useState } from 'react'
import '../../styles/DashboardCopy.css'

const KPIS = [
  { label: 'Generated Revenue', value: '$184,320', delta: '+24.1%', positive: true },
  { label: 'Signed Clients',    value: '128',      delta: '+12',    positive: true },
  { label: 'Total Leads',       value: '2,841',    delta: '+18.4%', positive: true },
  { label: 'Team Members',      value: '24',       delta: '+2',     positive: true },
]

const PERFORMERS = [
  { rank: 1, name: 'Maya Patel',     role: 'Account Exec',    score: '+$48.3K', color: '#22c55e' },
  { rank: 2, name: 'Ethan Rivera',   role: 'Senior AE',       score: '+$36.1K', color: '#6366f1' },
  { rank: 3, name: 'Aisha Kapoor',   role: 'AE',              score: '+$28.4K', color: '#f59e0b' },
  { rank: 4, name: 'Liam O\'Brien',  role: 'BDR',             score: '+$19.6K', color: '#06b6d4' },
  { rank: 5, name: 'Noor Ahmed',     role: 'BDR',             score: '+$14.2K', color: '#ec4899' },
]

const LEADS = [
  { co: 'Acme Corp',     contact: 'Jordan Lee',  value: '$48,000', stage: 'Negotiation', owner: 'M. Patel',   color: '#6366f1' },
  { co: 'Globex Ltd',    contact: 'Riya Gupta',  value: '$32,500', stage: 'Proposal',    owner: 'E. Rivera',  color: '#22c55e' },
  { co: 'Initech',       contact: 'Sam Patel',   value: '$24,000', stage: 'Discovery',   owner: 'A. Kapoor',  color: '#f59e0b' },
  { co: 'Hooli',         contact: 'Maria Chen',  value: '$67,800', stage: 'Closed Won',  owner: 'L. O\'Brien',color: '#ec4899' },
  { co: 'Vandelay Ind.', contact: 'Alex Kim',    value: '$18,250', stage: 'Discovery',   owner: 'N. Ahmed',   color: '#a855f7' },
  { co: 'Stark Industries',contact: 'Jordan Lee',value: '$92,400', stage: 'Negotiation', owner: 'M. Patel',   color: '#06b6d4' },
]

const STAGE_CLASS: Record<string, string> = {
  'Discovery': 'indigo dot',
  'Proposal': 'amber dot',
  'Negotiation': 'amber dot',
  'Closed Won': 'green dot',
  'Closed Lost': 'red dot',
}

export default function DashboardCopy4() {
  const [period, setPeriod] = useState('this-month')
  useEffect(() => { document.title = 'Dashboard / Workspace | CommunityScan SoDEX' }, [])

  const points = [12, 18, 22, 16, 28, 32, 26, 38, 42, 36, 48, 52, 46, 58, 62, 56, 68, 74, 72]
  const w = 600, h = 220, pad = 24
  const max = Math.max(...points), min = Math.min(...points)
  const range = max - min || 1
  const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (w - pad * 2))
  const ys = points.map(v => h - pad - ((v - min) / range) * (h - pad * 2))
  const linePath = points.map((_, i) => (i === 0 ? 'M' : 'L') + xs[i].toFixed(1) + ' ' + ys[i].toFixed(1)).join(' ')
  const areaPath = `${linePath} L ${xs[xs.length - 1].toFixed(1)} ${h - pad} L ${xs[0].toFixed(1)} ${h - pad} Z`

  return (
    <div className="dc-page">
      <header className="dc-page-header">
        <div>
          <h1 className="dc-title">Workspace</h1>
          <p className="dc-subtitle">Pipeline, performance, and team revenue.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="dc-pill-row">
            {[
              { id: 'this-month', label: 'This month' },
              { id: 'last-month', label: 'Last month' },
              { id: 'qtd',        label: 'QTD' },
              { id: 'ytd',        label: 'YTD' },
            ].map(p => (
              <button key={p.id} className={`dc-pill ${period === p.id ? 'active' : ''}`} onClick={() => setPeriod(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
          <button className="dc-secondary-btn">Share</button>
          <button className="dc-action-btn">+ Add Lead</button>
        </div>
      </header>

      <section className="dc-kpi-grid">
        {KPIS.map(k => (
          <div key={k.label} className="dc-kpi">
            <span className="dc-kpi-label">{k.label}</span>
            <span className="dc-kpi-value">{k.value}</span>
            <span className={`dc-kpi-trend ${k.positive ? 'up' : 'down'}`}>
              {k.positive ? '▲' : '▼'} {k.delta} vs last period
            </span>
          </div>
        ))}
      </section>

      <section className="dc-split">
        <div className="dc-card">
          <div className="dc-card-header">
            <div>
              <h3 className="dc-card-title">Leads Gathered</h3>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Cumulative leads across all reps</span>
            </div>
            <a href="#" className="dc-card-link">View report →</a>
          </div>
          <svg className="dc-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
            <g className="dc-chart-grid">
              {[0.25, 0.5, 0.75].map(t => (
                <line key={t} x1={pad} x2={w - pad} y1={h - pad - t * (h - pad * 2)} y2={h - pad - t * (h - pad * 2)} />
              ))}
            </g>
            <path className="dc-chart-area" d={areaPath} />
            <path className="dc-chart-line" d={linePath} />
          </svg>
        </div>

        <div className="dc-card">
          <div className="dc-card-header">
            <h3 className="dc-card-title">Top Performers</h3>
            <a href="#" className="dc-card-link">View all →</a>
          </div>
          <div className="dc-rank-list">
            {PERFORMERS.map(p => (
              <div key={p.rank} className="dc-rank-row">
                <span className="dc-rank-num">#{p.rank}</span>
                <div className="dc-rank-info">
                  <span className="dc-table-avatar" style={{ background: p.color }}>{p.name[0]}</span>
                  <div>
                    <div className="dc-rank-name">{p.name}</div>
                    <div className="dc-rank-role">{p.role}</div>
                  </div>
                </div>
                <span className="dc-rank-score">{p.score}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dc-card">
        <div className="dc-card-header">
          <h3 className="dc-card-title">Lead Management</h3>
          <a href="#" className="dc-card-link">All leads →</a>
        </div>
        <table className="dc-table">
          <thead>
            <tr><th>Company</th><th>Contact</th><th>Value</th><th>Stage</th><th>Owner</th></tr>
          </thead>
          <tbody>
            {LEADS.map(l => (
              <tr key={l.co}>
                <td>
                  <div className="dc-table-name">
                    <span className="dc-table-avatar" style={{ background: l.color }}>{l.co[0]}</span>
                    <span>{l.co}</span>
                  </div>
                </td>
                <td>{l.contact}</td>
                <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>{l.value}</td>
                <td><span className={`dc-status ${STAGE_CLASS[l.stage] ?? 'indigo dot'}`}>{l.stage}</span></td>
                <td style={{ color: 'var(--color-text-muted)' }}>{l.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
