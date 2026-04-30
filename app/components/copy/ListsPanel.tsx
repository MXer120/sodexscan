'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import WalletDisplay from '../WalletDisplay'

const COHORT_COLORS = ['#6366f1', '#22c55e', '#eab308', '#ef4444', '#f97316', '#06b6d4', '#a855f7', '#ec4899']

function SectionHeader({ title, count = undefined, onAdd = undefined, addLabel = undefined }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase', flex: 1 }}>{title}</span>
      {count != null && <span style={{ fontSize: 10, color: 'var(--text-secondary)', background: 'var(--bg-hover)', borderRadius: 10, padding: '1px 6px' }}>{count}</span>}
      {onAdd && (
        <button onClick={onAdd} title={addLabel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1, padding: 0 }}>+</button>
      )}
    </div>
  )
}

function PanelRow({ icon = undefined, label, sub = undefined, color = undefined, active, onClick, onDelete = undefined }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6,
        cursor: 'pointer', background: active ? 'rgba(99,102,241,0.12)' : hover ? 'var(--bg-hover)' : 'transparent',
        borderLeft: `3px solid ${active ? 'var(--accent, #6366f1)' : color ?? 'transparent'}`,
        marginBottom: 2,
      }}
    >
      {icon && <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: active ? 'var(--accent, #6366f1)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{sub}</div>}
      </div>
      {hover && onDelete && (
        <button onClick={e => { e.stopPropagation(); onDelete() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 12, padding: 0, lineHeight: 1 }}>✕</button>
      )}
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function ListsPanel({ filter, onFilterChange }) {
  const [user, setUser] = useState(null)
  const [watchlist, setWatchlist] = useState([])
  const [cohorts, setCohorts] = useState([])
  const [newCohortName, setNewCohortName] = useState('')
  const [addingCohort, setAddingCohort] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data?.user
      setUser(u ?? null)
      if (!u) { setLoading(false); return }

      const [wlRes, cohRes] = await Promise.all([
        supabase.from('watchlist_wallets').select('wallet_address, tag, added_at').eq('user_id', u.id).order('added_at', { ascending: false }).limit(20),
        supabase.from('wallet_cohorts').select('id, name, color, cohort_wallets(count)').eq('user_id', u.id).order('created_at'),
      ])
      setWatchlist(wlRes.data ?? [])
      setCohorts(cohRes.data ?? [])
      setLoading(false)
    })
  }, [])

  const createCohort = useCallback(async () => {
    if (!newCohortName.trim() || !user) return
    const color = COHORT_COLORS[cohorts.length % COHORT_COLORS.length]
    const { data } = await supabase.from('wallet_cohorts')
      .insert({ user_id: user.id, name: newCohortName.trim(), color })
      .select().single()
    if (data) setCohorts(prev => [...prev, { ...data, cohort_wallets: [{ count: 0 }] }])
    setNewCohortName('')
    setAddingCohort(false)
  }, [newCohortName, user, cohorts])

  const deleteCohort = useCallback(async (id) => {
    await supabase.from('wallet_cohorts').delete().eq('id', id)
    setCohorts(prev => prev.filter(c => c.id !== id))
    if (filter?.type === 'cohort' && filter?.id === id) onFilterChange(null)
  }, [filter, onFilterChange])

  const removeFromWatchlist = useCallback(async (wallet) => {
    if (!user) return
    await supabase.from('watchlist_wallets').delete().eq('user_id', user.id).eq('wallet_address', wallet)
    setWatchlist(prev => prev.filter(w => w.wallet_address !== wallet))
    if (filter?.type === 'watch') onFilterChange(null)
  }, [user, filter, onFilterChange])

  const isActive = (type, id) => filter?.type === type && filter?.id === id

  if (!user && !loading) {
    return (
      <div style={{ padding: '20px 12px', textAlign: 'center' }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>🔒</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>Sign in to use watchlists, cohorts, and tags.</div>
      </div>
    )
  }

  if (loading) {
    return <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 12 }}>Loading…</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* All traders shortcut */}
      <PanelRow
        icon="⚡"
        label="All Traders"
        active={!filter}
        onClick={() => onFilterChange(null)}
      />

      {/* ── Watchlist ── */}
      <div>
        <SectionHeader
          title="Watching"
          count={watchlist.length}
          onAdd={() => onFilterChange({ type: 'watch' })}
          addLabel="View all"
        />
        {watchlist.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '4px 8px' }}>
            Star any trader to track them here.
          </div>
        )}
        {watchlist.slice(0, 8).map(w => (
          <PanelRow
            key={w.wallet_address}
            label={`${w.wallet_address.slice(0, 6)}…${w.wallet_address.slice(-4)}`}
            sub={w.tag ?? undefined}
            color="#eab308"
            active={isActive('wallet', w.wallet_address)}
            onClick={() => onFilterChange({ type: 'wallet', id: w.wallet_address })}
            onDelete={() => removeFromWatchlist(w.wallet_address)}
          />
        ))}
        {watchlist.length > 8 && (
          <button
            onClick={() => onFilterChange({ type: 'watch' })}
            style={{ fontSize: 11, color: 'var(--accent, #6366f1)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
          >+{watchlist.length - 8} more</button>
        )}
        {watchlist.length > 0 && (
          <PanelRow
            icon="👁"
            label="View all watching"
            active={isActive('watch', null)}
            onClick={() => onFilterChange({ type: 'watch' })}
          />
        )}
      </div>

      {/* ── Cohorts ── */}
      <div>
        <SectionHeader
          title="Cohorts"
          count={cohorts.length}
          onAdd={() => setAddingCohort(true)}
          addLabel="New cohort"
        />
        {cohorts.map(c => {
          const count = c.cohort_wallets?.[0]?.count ?? 0
          return (
            <PanelRow
              key={c.id}
              label={c.name}
              sub={`${count} wallet${count !== 1 ? 's' : ''}`}
              color={c.color}
              active={isActive('cohort', c.id)}
              onClick={() => onFilterChange({ type: 'cohort', id: c.id, name: c.name, color: c.color })}
              onDelete={() => deleteCohort(c.id)}
            />
          )
        })}
        {cohorts.length === 0 && !addingCohort && (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '4px 8px' }}>Group wallets into cohorts for comparison.</div>
        )}
        {addingCohort && (
          <div style={{ padding: '6px 8px' }}>
            <input
              autoFocus
              value={newCohortName}
              onChange={e => setNewCohortName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createCohort(); if (e.key === 'Escape') setAddingCohort(false) }}
              placeholder="Cohort name…"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '5px 8px', borderRadius: 6,
                background: 'var(--bg-hover)', border: '1px solid var(--accent, #6366f1)',
                color: 'var(--text-primary)', fontSize: 12, outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button onClick={createCohort} style={{ flex: 1, fontSize: 11, padding: '4px', borderRadius: 5, cursor: 'pointer', border: 'none', background: 'var(--accent, #6366f1)', color: '#fff' }}>Create</button>
              <button onClick={() => setAddingCohort(false)} style={{ flex: 1, fontSize: 11, padding: '4px', borderRadius: 5, cursor: 'pointer', border: '1px solid var(--border)', background: 'none', color: 'var(--text-secondary)' }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Quick filters ── */}
      <div>
        <SectionHeader title="Quick Filters" />
        <PanelRow icon="🏅" label="Top 100 (30D PnL)" active={isActive('tab', 'top100')} onClick={() => onFilterChange({ type: 'tab', id: 'top100' })} />
        <PanelRow icon="📉" label="Inverse 100" active={isActive('tab', 'inv100')} onClick={() => onFilterChange({ type: 'tab', id: 'inv100' })} />
        <PanelRow icon="🏆" label="Hall of Fame" active={isActive('tab', 'best')} onClick={() => onFilterChange({ type: 'tab', id: 'best' })} />
        <PanelRow icon="💀" label="Hall of Shame" active={isActive('tab', 'worst')} onClick={() => onFilterChange({ type: 'tab', id: 'worst' })} />
        <PanelRow icon="📋" label="My Subscriptions" active={isActive('tab', 'mytrades')} onClick={() => onFilterChange({ type: 'tab', id: 'mytrades' })} />
      </div>
    </div>
  )
}
