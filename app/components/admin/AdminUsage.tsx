'use client'

import React from 'react'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>
}

async function authFetch(url: string, options: FetchOptions = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''
  return fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers ?? {}) },
  })
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function StatCard({ label, value, sub }: { label: string; value: any; sub?: any }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardLabel}>{label}</div>
      <div style={styles.cardValue}>{value ?? '—'}</div>
      {sub && <div style={styles.cardSub}>{sub}</div>}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>{title}</div>
      {children}
    </div>
  )
}

function ProgressBar({ current, max, label }) {
  const pct = Math.min((current / max) * 100, 100)
  const color = pct > 85 ? '#ef4444' : pct > 65 ? '#f59e0b' : '#22c55e'
  return (
    <div style={styles.progressWrap}>
      <div style={styles.progressHeader}>
        <span style={styles.progressLabel}>{label}</span>
        <span style={styles.progressPct}>{pct.toFixed(1)}%</span>
      </div>
      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressFill, width: `${pct}%`, background: color }} />
      </div>
      <div style={styles.progressDetail}>{current} MB / {max} MB</div>
    </div>
  )
}

export default function AdminUsage() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    let cancelled = false
    authFetch('/api/admin/usage')
      .then(r => r.json())
      .then(d => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  if (loading) return <div style={styles.loading}>Loading usage stats…</div>
  if (error)   return <div style={styles.error}>Error: {error}</div>
  if (!data)   return null

  return (
    <div style={styles.root}>
      <h2 style={styles.pageTitle}>Usage &amp; Stats</h2>
      <p style={styles.pageSub}>Live stats from Supabase. Fetched {fmtDate(data.fetchedAt)}.</p>

      {/* Database */}
      <Section title="Database">
        <div style={styles.grid}>
          <StatCard label="DB Size" value={data.db.size} />
          <StatCard label="Alert Settings" value={data.tables.user_alert_settings?.toLocaleString()} />
          <StatCard label="Alert History (all)" value={data.tables.alert_history?.toLocaleString()} />
          <StatCard label="Profiles" value={data.tables.profiles?.toLocaleString()} />
          <StatCard label="Notif Channels" value={data.tables.user_notification_channels?.toLocaleString()} />
        </div>
        <ProgressBar
          current={data.db.sizeMb}
          max={data.db.limitMb}
          label="Supabase DB (free tier: 500 MB)"
        />
      </Section>

      {/* Alerts */}
      <Section title="Alerts">
        <div style={styles.grid}>
          <StatCard label="Total Alerts" value={data.alerts.total?.toLocaleString()} />
          <StatCard label="Active" value={data.alerts.active?.toLocaleString()} />
          <StatCard label="Fired (24h)" value={data.alerts.fired_24h?.toLocaleString()} />
          <StatCard label="Fired (7d)" value={data.alerts.fired_7d?.toLocaleString()} />
          <StatCard label="Fired (all-time)" value={data.alerts.fired_all?.toLocaleString()} />
        </div>
      </Section>

      {/* Channels */}
      <Section title="Notification Channels">
        <div style={styles.grid}>
          <StatCard label="Telegram" value={data.channels.telegram?.toLocaleString()} sub="Connected accounts" />
          <StatCard label="Discord" value={data.channels.discord?.toLocaleString()} sub="Connected accounts" />
        </div>
      </Section>

      {/* Users */}
      <Section title="Users">
        <div style={styles.grid}>
          <StatCard label="Registered Users" value={data.users.total?.toLocaleString()} sub="Auth users (profiles)" />
        </div>
      </Section>

      {/* Price Cache */}
      <Section title="Price Cache">
        <div style={styles.grid}>
          <StatCard label="Symbols Cached" value={data.priceCache.symbols?.toLocaleString()} />
          <StatCard label="Last Updated" value={fmtDate(data.priceCache.lastUpdated)} />
        </div>
      </Section>

      {/* Cron Jobs */}
      <Section title="Cron Jobs">
        {data.cronJobs && data.cronJobs.length > 0 ? (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Schedule</th>
                <th style={styles.th}>Active</th>
                <th style={styles.th}>Last Run</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.cronJobs.map((job, i) => (
                <tr key={i} style={i % 2 === 0 ? styles.trEven : {}}>
                  <td style={styles.td}>{job.jobname ?? job.name ?? '—'}</td>
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 12 }}>{job.schedule ?? '—'}</td>
                  <td style={styles.td}>
                    <span style={{ color: job.active ? '#22c55e' : '#ef4444' }}>
                      {job.active ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td style={styles.td}>{fmtDate(job.last_run_time ?? null)}</td>
                  <td style={styles.td}>{job.status ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={styles.noData}>
            Cron job details require pg_cron access (not available via anon/service key by default).
            Check the Supabase dashboard under Database → Cron Jobs.
          </div>
        )}

        {/* Hardcoded known jobs for reference */}
        <div style={styles.jobHint}>
          <div style={styles.jobHintTitle}>Known scheduled jobs:</div>
          <div style={styles.jobRow}>
            <span style={styles.jobName}>check-price-alerts</span>
            <span style={styles.jobSched}>every 1 minute</span>
            <span style={styles.jobDesc}>Evaluates all enabled price alerts</span>
          </div>
          <div style={styles.jobRow}>
            <span style={styles.jobName}>refresh-price-cache</span>
            <span style={styles.jobSched}>every 30 seconds</span>
            <span style={styles.jobDesc}>Updates cron_price_cache from SoDEX API</span>
          </div>
        </div>
      </Section>

      {/* Supabase Free Tier Limits */}
      <Section title="Supabase Free Tier Limits">
        <div style={styles.grid}>
          <StatCard label="DB Storage" value="500 MB" sub={`Using ~${data.db.sizeMb} MB`} />
          <StatCard label="Edge Function Invocations" value="500K / month" sub="Free tier" />
          <StatCard label="Realtime Connections" value="200 concurrent" sub="Free tier" />
          <StatCard label="Storage" value="1 GB" sub="Free tier" />
          <StatCard label="Auth Users" value="Unlimited" sub="Free tier" />
        </div>
      </Section>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  pageTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--color-text-main)',
    margin: 0,
  },
  pageSub: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    margin: 0,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    color: 'var(--color-text-muted)',
    borderBottom: '1px solid var(--color-border-subtle)',
    paddingBottom: '6px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '10px',
  },
  card: {
    background: 'var(--ds-bg-3)',
    border: '1px solid var(--ds-border-subtle)',
    borderRadius: '8px',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  cardLabel: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    fontWeight: 500,
  },
  cardValue: {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--color-text-main)',
    fontVariantNumeric: 'tabular-nums',
  },
  cardSub: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
  },
  progressWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: '12px',
    color: 'var(--color-text-secondary)',
  },
  progressPct: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--color-text-main)',
  },
  progressTrack: {
    height: '6px',
    borderRadius: '3px',
    background: 'var(--ds-bg-4)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.4s ease',
  },
  progressDetail: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  th: {
    textAlign: 'left',
    padding: '8px 10px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    color: 'var(--color-text-muted)',
    borderBottom: '1px solid var(--ds-border-subtle)',
  },
  td: {
    padding: '8px 10px',
    color: 'var(--color-text-main)',
    borderBottom: '1px solid var(--ds-border-subtle)',
    fontSize: '13px',
  },
  trEven: {
    background: 'var(--ds-bg-3)',
  },
  noData: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    padding: '12px',
    background: 'var(--ds-bg-3)',
    borderRadius: '8px',
    lineHeight: 1.5,
  },
  jobHint: {
    background: 'var(--ds-bg-3)',
    border: '1px solid var(--ds-border-subtle)',
    borderRadius: '8px',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  jobHintTitle: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  jobRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  jobName: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--color-text-main)',
    fontFamily: 'monospace',
    minWidth: '180px',
  },
  jobSched: {
    fontSize: '12px',
    color: 'var(--ds-accent)',
    fontFamily: 'monospace',
    minWidth: '130px',
  },
  jobDesc: {
    fontSize: '12px',
    color: 'var(--color-text-secondary)',
  },
  loading: {
    padding: '32px',
    color: 'var(--color-text-muted)',
    fontSize: '13px',
  },
  error: {
    padding: '16px',
    color: '#ef4444',
    fontSize: '13px',
    background: 'rgba(239,68,68,0.08)',
    borderRadius: '8px',
  },
}
