'use client'

import { useEffect, useState } from 'react'
import '../../styles/DashboardCopy.css'

const KPIS = [
  { label: 'Total Employees', value: '1,284', delta: '+24', positive: true,  spark: [12, 18, 14, 22, 28, 24, 32, 36, 30, 38, 42, 46] },
  { label: 'Hired This Month', value: '38',   delta: '+12%', positive: true, spark: [4, 8, 6, 12, 14, 10, 18, 22, 16, 26, 24, 30] },
  { label: 'On Leave',         value: '47',   delta: '-3',   positive: false,spark: [10, 12, 14, 18, 16, 14, 12, 10, 14, 16, 18, 20] },
  { label: 'Open Roles',       value: '21',   delta: '+5',   positive: true, spark: [3, 5, 4, 7, 9, 6, 11, 13, 10, 14, 16, 18] },
]

const PERFORMERS = [
  { rank: 1, name: 'Maya Patel',     role: 'Senior Designer', score: 98, color: '#22c55e' },
  { rank: 2, name: 'Ethan Rivera',   role: 'Engineering Lead',score: 94, color: '#6366f1' },
  { rank: 3, name: 'Aisha Kapoor',   role: 'Product Manager', score: 91, color: '#f59e0b' },
  { rank: 4, name: 'Liam O\'Brien',  role: 'Researcher',      score: 89, color: '#06b6d4' },
  { rank: 5, name: 'Noor Ahmed',     role: 'Designer',        score: 86, color: '#ec4899' },
]

const EMPLOYEES = [
  { name: 'Maya Patel',     role: 'Designer',    dept: 'Product',    status: 'Active',   joined: 'Jan 2023', color: '#22c55e' },
  { name: 'Ethan Rivera',   role: 'Engineer',    dept: 'Platform',   status: 'Active',   joined: 'Mar 2022', color: '#6366f1' },
  { name: 'Aisha Kapoor',   role: 'PM',          dept: 'Product',    status: 'On Leave', joined: 'Aug 2021', color: '#f59e0b' },
  { name: 'Liam O\'Brien',  role: 'Researcher',  dept: 'Insights',   status: 'Active',   joined: 'Nov 2023', color: '#06b6d4' },
  { name: 'Noor Ahmed',     role: 'Designer',    dept: 'Brand',      status: 'Active',   joined: 'Feb 2024', color: '#ec4899' },
  { name: 'Daniel Park',    role: 'Engineer',    dept: 'Mobile',     status: 'Onboarding',joined: 'Apr 2024', color: '#a855f7' },
]

const STATUS_CLASS: Record<string, string> = {
  'Active': 'green dot', 'On Leave': 'amber dot', 'Onboarding': 'indigo dot', 'Inactive': 'red dot',
}

export default function DashboardCopy3() {
  const [period, setPeriod] = useState('30d')
  useEffect(() => { document.title = 'Dashboard / Operations | CommunityScan SoDEX' }, [])

  // Smooth line chart points
  const points = [10, 22, 18, 28, 32, 26, 38, 42, 36, 46, 52, 48, 56, 62, 58, 68, 72, 66, 78]
  const w = 600, h = 200, pad = 24
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
          <h1 className="dc-title">Operations Dashboard</h1>
          <p className="dc-subtitle">Headcount, attendance, and performance for the team.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="dc-pill-row">
            {['7d', '30d', '90d', '1y'].map(p => (
              <button key={p} className={`dc-pill ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>{p}</button>
            ))}
          </div>
          <button className="dc-secondary-btn">Export</button>
          <button className="dc-action-btn">+ Add Employee</button>
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
            <div className="dc-kpi-spark">
              {k.spark.map((v, i) => (
                <span key={i} style={{ height: ((v / Math.max(...k.spark)) * 100) + '%' }} />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="dc-split">
        <div className="dc-card">
          <div className="dc-card-header">
            <h3 className="dc-card-title">Headcount over time</h3>
            <a href="#" className="dc-card-link">Export →</a>
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
            <a href="/mainnet" className="dc-card-link">View all →</a>
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
          <h3 className="dc-card-title">Employees</h3>
          <a href="#" className="dc-card-link">Manage →</a>
        </div>
        <table className="dc-table">
          <thead>
            <tr><th>Name</th><th>Role</th><th>Department</th><th>Status</th><th>Joined</th></tr>
          </thead>
          <tbody>
            {EMPLOYEES.map(e => (
              <tr key={e.name}>
                <td>
                  <div className="dc-table-name">
                    <span className="dc-table-avatar" style={{ background: e.color }}>{e.name[0]}</span>
                    <span>{e.name}</span>
                  </div>
                </td>
                <td>{e.role}</td>
                <td>{e.dept}</td>
                <td><span className={`dc-status ${STATUS_CLASS[e.status]}`}>{e.status}</span></td>
                <td style={{ color: 'var(--color-text-muted)' }}>{e.joined}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
