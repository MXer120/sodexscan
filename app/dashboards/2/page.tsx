'use client'

import { useEffect, useState } from 'react'
import '../../styles/DashboardCopy.css'

const PIPELINE = [
  {
    stage: 'Discovery',  count: 8,
    cards: [
      { name: 'TechCorp Upgrade', tag: 'Enterprise',   value: '$48K' },
      { name: 'Fintra Expansion', tag: 'Mid-Market',   value: '$24K' },
      { name: 'Acme Renewal',     tag: 'Renewal',      value: '$18K' },
    ],
  },
  {
    stage: 'Proposal',   count: 5,
    cards: [
      { name: 'Hooli Migration',  tag: 'Enterprise',  value: '$92K' },
      { name: 'Vandelay PoC',     tag: 'New Logo',    value: '$36K' },
    ],
  },
  {
    stage: 'Negotiation',count: 3,
    cards: [
      { name: 'Stark Industries', tag: 'Enterprise',  value: '$184K' },
      { name: 'Globex Ltd',       tag: 'Mid-Market',  value: '$56K' },
    ],
  },
  {
    stage: 'Closed Won', count: 6,
    cards: [
      { name: 'Initech',          tag: 'Mid-Market', value: '$28K' },
      { name: 'Cyberdyne',        tag: 'New Logo',   value: '$42K' },
    ],
  },
]

const FILTERS = ['All Leads', 'Hot', 'Warm', 'Cold', 'No Activity']

const RECENT = [
  { name: 'Jordan Lee',  co: 'Acme Corp',     last: '2 mins ago',  status: 'Replied',     color: '#6366f1' },
  { name: 'Riya Gupta',  co: 'Globex Ltd',    last: '14 mins ago', status: 'Email Sent',  color: '#22c55e' },
  { name: 'Sam Patel',   co: 'Initech',       last: '1 hour ago',  status: 'Call Booked', color: '#f59e0b' },
  { name: 'Maria Chen',  co: 'Hooli',         last: '3 hours ago', status: 'Replied',     color: '#ec4899' },
  { name: 'Alex Kim',    co: 'Vandelay Ind.', last: 'Yesterday',   status: 'Follow-up',   color: '#a855f7' },
]

const STATUS_CLASS: Record<string, string> = {
  'Replied':     'green dot',
  'Email Sent':  'indigo dot',
  'Call Booked': 'amber dot',
  'Follow-up':   'red dot',
}

export default function DashboardCopy2() {
  const [filter, setFilter] = useState('All Leads')
  useEffect(() => { document.title = 'Dashboard / CRM | CommunityScan SoDEX' }, [])

  // Build a small calendar grid (current month view, lightweight)
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const first = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = []
  const offset = (first === 0 ? 6 : first - 1)
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  const eventDays = new Set([3, 8, 12, 18, 24, 27])

  return (
    <div className="dc-page">
      <header className="dc-page-header">
        <div>
          <h1 className="dc-title">CRM Workspace</h1>
          <p className="dc-subtitle">Synclead — track leads, conversations, and follow-ups.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="dc-secondary-btn">Import</button>
          <button className="dc-action-btn">+ Add Lead</button>
        </div>
      </header>

      <section className="dc-filter-row">
        {FILTERS.map(f => (
          <button key={f} className={`dc-filter-pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </section>

      <section className="dc-pipeline">
        {PIPELINE.map(col => (
          <div key={col.stage} className="dc-pipe-col">
            <div className="dc-pipe-head">
              <span>{col.stage}</span>
              <span className="dc-pipe-count">{col.count}</span>
            </div>
            {col.cards.map(c => (
              <div key={c.name} className="dc-pipe-card">
                <div className="dc-pipe-card-name">{c.name}</div>
                <span className="dc-pipe-card-tag">{c.tag}</span>
                <div className="dc-pipe-card-meta">
                  <span>Value</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--color-text-main)' }}>{c.value}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </section>

      <section className="dc-split">
        <div className="dc-card">
          <div className="dc-card-header">
            <h3 className="dc-card-title">Recent Activity</h3>
            <a href="#" className="dc-card-link">All activity →</a>
          </div>
          <table className="dc-table">
            <thead>
              <tr><th>Lead</th><th>Company</th><th>Last Touch</th><th>Status</th></tr>
            </thead>
            <tbody>
              {RECENT.map(r => (
                <tr key={r.name}>
                  <td>
                    <div className="dc-table-name">
                      <span className="dc-table-avatar" style={{ background: r.color }}>{r.name[0]}</span>
                      <span>{r.name}</span>
                    </div>
                  </td>
                  <td>{r.co}</td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{r.last}</td>
                  <td><span className={`dc-status ${STATUS_CLASS[r.status]}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="dc-card">
          <div className="dc-card-header">
            <h3 className="dc-card-title">{today.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</h3>
            <a href="#" className="dc-card-link">Full calendar →</a>
          </div>
          <div className="dc-calendar">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(h => (
              <div key={h} className="dc-cal-head">{h}</div>
            ))}
            {cells.map((d, i) => {
              if (d === null) return <div key={i} className="dc-cal-cell" style={{ background: 'transparent' }} />
              const isToday = d === today.getDate()
              const hasEvent = eventDays.has(d)
              return (
                <div key={i} className={`dc-cal-cell ${isToday ? 'today' : ''} ${hasEvent ? 'event' : ''}`}>
                  {d}
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
