'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Star, X } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { cn } from '@/app/lib/utils'
import WalletDisplay from '../WalletDisplay'
import TraderDetailModal from './TraderDetailModal'

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtUSD = (n) => {
  if (n == null || isNaN(n)) return '—'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : '+'
  if (abs >= 1e6) return '$' + sign + (abs / 1e6).toFixed(2) + 'M'
  if (abs >= 1e3) return '$' + sign + (abs / 1e3).toFixed(1) + 'K'
  return '$' + sign + abs.toFixed(2)
}

const fmtVol = (n) => {
  if (n == null || isNaN(n) || n === 0) return '—'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K'
  return '$' + n.toFixed(0)
}

const pnlClass = (n) =>
  n == null
    ? 'text-muted-foreground'
    : n >= 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-red-600 dark:text-red-400'

// ─── Tabs ────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'top100',   label: 'Top 100',         sub: 'Real 30D PnL leaders',        real: true },
  { id: 'inv100',   label: 'Inverse 100',     sub: 'Worst performers → go short', real: true },
  { id: 'best',     label: 'Hall of Fame',    sub: 'All-time top 10',             real: true },
  { id: 'worst',    label: 'Hall of Shame',   sub: 'All-time bottom 10',          real: true },
  { id: 'watching', label: 'Watching',        sub: 'Your tracked wallets' },
  { id: 'mytrades', label: 'Subscriptions',   sub: 'Your active copy trades' },
  { id: 'all',      label: 'Sim',             sub: 'Simulated follower data' },
]

const SORT_OPTS_REAL = [
  { key: 'sodex_pnl',         label: '30D PnL' },
  { key: 'cumulative_pnl',    label: 'All-time PnL' },
  { key: 'cumulative_volume', label: 'Volume' },
]

const SORT_OPTS_SIM = [
  { key: 'total_follower_pnl', label: 'Total PnL' },
  { key: 'win_rate_pct',       label: 'Win Rate' },
  { key: 'follower_count',     label: 'Followers' },
  { key: 'avg_pnl_per_trade',  label: 'Avg PnL' },
]

// ─── Star / Watch button ──────────────────────────────────────────────────────

function StarBtn({ watching, onClick, disabled }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      disabled={disabled}
      title={watching ? 'Remove from watchlist' : 'Add to watchlist'}
      className={cn(
        'inline-flex items-center justify-center rounded-md size-7 transition-colors',
        disabled
          ? 'cursor-default text-muted-foreground/40'
          : watching
            ? 'text-amber-500 hover:bg-muted'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
      )}
    >
      <Star className="size-4" fill={watching ? 'currentColor' : 'none'} />
    </button>
  )
}

// ─── Tag pill ─────────────────────────────────────────────────────────────────

function TagPill({ tag }) {
  if (!tag) return null
  return (
    <span className="inline-block ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-primary/10 text-primary">
      {tag}
    </span>
  )
}

// ─── Subscription mode badge ─────────────────────────────────────────────────

function ModeBadge({ mode, ratio, fixedUsd, inverse }) {
  const label = mode === 'fixed'
    ? `Fixed $${fixedUsd ?? '—'}`
    : `${Math.round((ratio ?? 0.1) * 100)}% Ratio`
  return (
    <span className="text-xs text-muted-foreground">
      {inverse ? <span className="text-amber-500 mr-1">↕</span> : null}
      {label}
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CopyLeaderboard({ externalFilter, onFilterChange }) {
  const [tab, setTab] = useState('top100')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('sodex_pnl')
  const [detailWallet, setDetailWallet] = useState(null)
  const [detailRow, setDetailRow] = useState(null)
  const [watchlist, setWatchlist] = useState(new Set())
  const [user, setUser] = useState(null)
  const [userLoaded, setUserLoaded] = useState(false)
  const [search, setSearch] = useState('')
  const mountedRef = useRef(true)

  // Sync external filter → tab
  useEffect(() => {
    if (!externalFilter) return
    if (externalFilter.type === 'tab') setTab(externalFilter.id)
    else if (externalFilter.type === 'watch') setTab('watching')
    else if (externalFilter.type === 'cohort') setTab('cohort')
    else if (externalFilter.type === 'wallet') setTab('wallet_single')
  }, [externalFilter])

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!mountedRef.current) return
      setUser(data?.user ?? null)
      setUserLoaded(true)
    })
  }, [])

  // Watchlist
  useEffect(() => {
    if (!user) return
    supabase.from('watchlist_wallets')
      .select('wallet_address')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (!mountedRef.current) return
        setWatchlist(new Set((data ?? []).map(r => r.wallet_address)))
      })
  }, [user])

  // ── Data loader ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      let next = []

      try {
        if (tab === 'top100' || tab === 'inv100') {
          const sortOrder = tab === 'inv100' ? 'asc' : 'desc'
          const sortField = sortBy === 'cumulative_volume' ? 'volume' : 'pnl'
          const res = await fetch(
            `/api/sodex-leaderboard?page=1&page_size=100&sort_by=${sortField}&sort_order=${sortOrder}&window_type=ALL_TIME`
          )
          const json = await res.json()
          next = ((json?.data?.items) ?? []).map((r, i) => ({
            wallet: r.wallet_address,
            pnl30d: parseFloat(r.pnl_usd ?? 0),
            pnlAll: parseFloat(r.pnl_usd ?? 0),
            volume: parseFloat(r.volume_usd ?? 0),
            rank: r.rank,
            displayRank: i + 1,
            _type: 'real',
          }))
        }

        else if (tab === 'best' || tab === 'worst') {
          const sortOrder = tab === 'worst' ? 'asc' : 'desc'
          const res = await fetch(
            `/api/sodex-leaderboard?page=1&page_size=10&sort_by=pnl&sort_order=${sortOrder}&window_type=ALL_TIME`
          )
          const json = await res.json()
          next = ((json?.data?.items) ?? []).map((r, i) => ({
            wallet: r.wallet_address,
            pnl30d: parseFloat(r.pnl_usd ?? 0),
            pnlAll: parseFloat(r.pnl_usd ?? 0),
            volume: parseFloat(r.volume_usd ?? 0),
            rank: r.rank,
            displayRank: i + 1,
            _type: 'real',
          }))
        }

        else if (tab === 'watching') {
          if (!user) { next = [] }
          else {
            const { data: wl } = await supabase
              .from('watchlist_wallets')
              .select('wallet_address, added_at, tag')
              .eq('user_id', user.id)
              .order('added_at', { ascending: false })
            if (wl?.length) {
              const rankResults = await Promise.allSettled(
                wl.map(w =>
                  fetch(`/api/sodex-leaderboard/rank?wallet_address=${w.wallet_address}&sort_by=pnl&window_type=ALL_TIME`)
                    .then(r => r.json())
                )
              )
              next = wl.map((w, i) => {
                const r = rankResults[i]
                const d = r.status === 'fulfilled' ? r.value?.data : null
                return {
                  wallet: w.wallet_address,
                  pnl30d: parseFloat(d?.pnl_usd ?? 0),
                  pnlAll: parseFloat(d?.pnl_usd ?? 0),
                  volume: parseFloat(d?.volume_usd ?? 0),
                  rank: d?.rank ?? null,
                  tag: w.tag,
                  displayRank: i + 1,
                  _type: 'watch',
                }
              })
            }
          }
        }

        else if (tab === 'cohort') {
          const cohortId = externalFilter?.id
          if (!cohortId) { next = [] }
          else {
            const { data: cw } = await supabase
              .from('cohort_wallets')
              .select('wallet_address, added_at')
              .eq('cohort_id', cohortId)
              .order('added_at', { ascending: false })
            if (cw?.length) {
              const rankResults = await Promise.allSettled(
                cw.map(w =>
                  fetch(`/api/sodex-leaderboard/rank?wallet_address=${w.wallet_address}&sort_by=pnl&window_type=ALL_TIME`)
                    .then(r => r.json())
                )
              )
              next = cw.map((w, i) => {
                const r = rankResults[i]
                const d = r.status === 'fulfilled' ? r.value?.data : null
                return {
                  wallet: w.wallet_address,
                  pnl30d: parseFloat(d?.pnl_usd ?? 0),
                  pnlAll: parseFloat(d?.pnl_usd ?? 0),
                  volume: parseFloat(d?.volume_usd ?? 0),
                  rank: d?.rank ?? null,
                  displayRank: i + 1,
                  _type: 'cohort',
                }
              })
            }
          }
        }

        else if (tab === 'wallet_single') {
          const walletAddr = externalFilter?.id
          if (!walletAddr) { next = [] }
          else {
            const res = await fetch(
              `/api/sodex-leaderboard/rank?wallet_address=${walletAddr}&sort_by=pnl&window_type=ALL_TIME`
            )
            const json = await res.json()
            const d = json?.data
            next = d ? [{
              wallet: d.wallet_address,
              pnl30d: parseFloat(d.pnl_usd ?? 0),
              pnlAll: parseFloat(d.pnl_usd ?? 0),
              volume: parseFloat(d.volume_usd ?? 0),
              rank: d.rank,
              displayRank: 1,
              _type: 'real',
            }] : []
          }
        }

        else if (tab === 'mytrades') {
          if (!user) { next = [] }
          else {
            const { data } = await supabase
              .from('leader_subscriptions')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
            next = (data ?? []).map(r => ({ ...r, wallet: r.leader_wallet, _type: 'sub' }))
          }
        }

        else if (tab === 'all') {
          const col = ['total_follower_pnl', 'win_rate_pct', 'follower_count', 'avg_pnl_per_trade'].includes(sortBy)
            ? sortBy : 'total_follower_pnl'
          const { data } = await supabase
            .from('copy_leaderboard')
            .select('*')
            .order(col, { ascending: false })
            .limit(50)
          next = (data ?? []).map((r, i) => ({
            ...r,
            wallet: r.leader_wallet,
            pnl30d: parseFloat(r.total_follower_pnl ?? 0),
            volume: null,
            displayRank: i + 1,
            _type: 'sim',
          }))
        }
      } catch (e) {
        console.error('CopyLeaderboard load error', e)
      }

      if (!cancelled) {
        setRows(next)
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [tab, sortBy, user, externalFilter])

  // ── Watchlist toggle ────────────────────────────────────────────────────────
  const toggleWatch = useCallback(async (walletAddr) => {
    if (!user) return
    const isWatching = watchlist.has(walletAddr)
    if (isWatching) {
      await supabase.from('watchlist_wallets')
        .delete().eq('user_id', user.id).eq('wallet_address', walletAddr)
      setWatchlist(prev => { const s = new Set(prev); s.delete(walletAddr); return s })
      if (tab === 'watching') setRows(prev => prev.filter(r => r.wallet !== walletAddr))
    } else {
      await supabase.from('watchlist_wallets')
        .upsert({ user_id: user.id, wallet_address: walletAddr })
      setWatchlist(prev => new Set([...prev, walletAddr]))
    }
  }, [user, watchlist, tab])

  // ── Open detail sidebar ──────────────────────────────────────────────────────
  const openDetail = useCallback((wallet, row) => {
    setDetailWallet(wallet)
    setDetailRow(row ?? null)
  }, [])

  const isInverse = tab === 'inv100' || tab === 'worst'
  const currentTab = TABS.find(t => t.id === tab)

  // Apply search filter
  const displayedRows = search.length >= 3
    ? rows.filter(r => (r.wallet ?? '').toLowerCase().includes(search.toLowerCase()))
    : rows

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Disclaimer — only for simulated tab */}
      {tab === 'all' && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          Simulated rankings based on hypothetical follower trades. Not real money. Not financial advice.
        </div>
      )}

      {/* Real data notice */}
      {currentTab?.real && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-400">
          Live on-chain data sourced from the official SoDEX leaderboard.
        </div>
      )}

      {/* Inverse notice */}
      {isInverse && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-700 dark:text-red-400">
          {tab === 'inv100'
            ? 'Inverse 100 — worst 30D performers. Click "Inverse" to signal the opposite side of their trades.'
            : 'Hall of Shame — consistently losing traders. Click "Inverse" to trade against them.'}
        </div>
      )}

      {/* Card with tabs, search, sort, table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {/* Top toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b">
          {/* Tab strip (scrollable) */}
          <div className="flex gap-1 overflow-x-auto -mx-1 px-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setSortBy(t.id === 'all' ? 'total_follower_pnl' : 'sodex_pnl') }}
                className={cn(
                  'whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  tab === t.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search wallet…"
              className="pl-9 w-full sm:w-[220px] h-9"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Sort bar */}
        {(tab === 'top100' || tab === 'inv100' || tab === 'all') && (
          <div className="flex items-center gap-2 px-5 py-3 border-b bg-muted/30">
            <span className="text-xs text-muted-foreground">Sort:</span>
            <div className="flex flex-wrap gap-1.5">
              {(tab === 'all' ? SORT_OPTS_SIM : SORT_OPTS_REAL).map(o => (
                <button
                  key={o.key}
                  onClick={() => setSortBy(o.key)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                    sortBy === o.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-accent',
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Auth gate for user-specific tabs */}
        {(tab === 'watching' || tab === 'mytrades') && !user && userLoaded && (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            Sign in to {tab === 'watching' ? 'use your watchlist' : 'see your subscriptions'}.
          </div>
        )}

        {/* ── SUBSCRIPTIONS TAB ── */}
        {tab === 'mytrades' && user && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-muted-foreground font-medium">Trader</TableHead>
                  <TableHead className="text-center text-muted-foreground font-medium">Mode</TableHead>
                  <TableHead className="text-center text-muted-foreground font-medium">Inverse</TableHead>
                  <TableHead className="text-center text-muted-foreground font-medium">Channels</TableHead>
                  <TableHead className="text-center text-muted-foreground font-medium">Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {!loading && displayedRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No active subscriptions yet. Follow a trader to get started.
                    </TableCell>
                  </TableRow>
                )}
                {!loading && displayedRows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="cursor-pointer" onClick={() => openDetail(r.wallet, r)}>
                      <div className="flex items-center gap-1">
                        <WalletDisplay walletAddress={r.wallet} truncate />
                        <StarBtn watching={watchlist.has(r.wallet)} onClick={() => toggleWatch(r.wallet)} disabled={!user} />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <ModeBadge mode={r.mode ?? r.copy_mode} ratio={r.copy_ratio} fixedUsd={r.fixed_usd} inverse={r.inverse} />
                    </TableCell>
                    <TableCell className={cn('text-center text-xs', r.inverse ? 'text-amber-500' : 'text-muted-foreground')}>
                      {r.inverse ? '↕ On' : '—'}
                    </TableCell>
                    <TableCell className="text-center text-[11px] text-muted-foreground">
                      {Object.entries(r.channels ?? {}).filter(([, v]) => v).map(([k]) => k).join(', ') || '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold',
                          r.active
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
                        )}
                      >
                        {r.active ? 'Active' : 'Paused'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => openDetail(r.wallet, r)}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* ── SIM / ALL TAB ── */}
        {tab === 'all' && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-right text-muted-foreground font-medium">#</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Wallet</TableHead>
                  <TableHead className="text-right text-muted-foreground font-medium">Followers</TableHead>
                  <TableHead className="text-right text-muted-foreground font-medium">Trades</TableHead>
                  <TableHead className="text-right text-muted-foreground font-medium">Win %</TableHead>
                  <TableHead className="text-right text-muted-foreground font-medium">Avg PnL</TableHead>
                  <TableHead className="text-right text-muted-foreground font-medium">Est. ROI</TableHead>
                  <TableHead className="text-right text-muted-foreground font-medium">Total PnL</TableHead>
                  <TableHead className="text-right text-muted-foreground font-medium">Risk</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {!loading && displayedRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                      No simulated data yet — followers appear once traders close positions.
                    </TableCell>
                  </TableRow>
                )}
                {!loading && displayedRows.map((r, i) => {
                  const roi = r.avg_pnl_per_trade != null ? (r.avg_pnl_per_trade / 1000) * 100 : null
                  const badge = r.win_rate_pct != null
                    ? r.win_rate_pct < 40 ? { label: 'High Risk', cls: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800' }
                    : r.win_rate_pct <= 60 ? { label: 'Med Risk', cls: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800' }
                    : { label: 'Low Risk', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800' }
                    : null
                  return (
                    <TableRow key={r.wallet}>
                      <TableCell className="text-right text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell className="cursor-pointer" onClick={() => openDetail(r.wallet, r)}>
                        <div className="flex items-center gap-1">
                          <WalletDisplay walletAddress={r.wallet} truncate />
                          <StarBtn watching={watchlist.has(r.wallet)} onClick={() => toggleWatch(r.wallet)} disabled={!user} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{r.follower_count ?? '—'}</TableCell>
                      <TableCell className="text-right">{r.total_trades ?? '—'}</TableCell>
                      <TableCell className={cn('text-right font-medium', (r.win_rate_pct ?? 0) >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                        {r.win_rate_pct != null ? r.win_rate_pct + '%' : '—'}
                      </TableCell>
                      <TableCell className={cn('text-right', pnlClass(r.avg_pnl_per_trade))}>
                        {r.avg_pnl_per_trade != null ? fmtUSD(r.avg_pnl_per_trade) : '—'}
                      </TableCell>
                      <TableCell className={cn('text-right', roi == null ? 'text-muted-foreground' : roi >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                        {roi != null ? (roi >= 0 ? '+' : '') + roi.toFixed(1) + '%' : '—'}
                      </TableCell>
                      <TableCell className={cn('text-right font-semibold', pnlClass(r.pnl30d))}>{fmtUSD(r.pnl30d)}</TableCell>
                      <TableCell className="text-right">
                        {badge
                          ? <span className={cn('inline-flex px-2 py-0.5 rounded-md border text-[10px] font-semibold', badge.cls)}>{badge.label}</span>
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => openDetail(r.wallet, r)}>Follow</Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* ── REAL LEADERBOARD TABS ── */}
        {(tab === 'top100' || tab === 'inv100' || tab === 'best' || tab === 'worst' || tab === 'watching' || tab === 'cohort' || tab === 'wallet_single')
          && !(tab === 'watching' && !user && userLoaded) && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-right text-muted-foreground font-medium w-12">#</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Wallet</TableHead>
                  <TableHead className="text-right text-muted-foreground font-medium">30D PnL</TableHead>
                  <TableHead className="text-right text-muted-foreground font-medium">All-time PnL</TableHead>
                  <TableHead className="text-right text-muted-foreground font-medium">Volume</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {!loading && displayedRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      {tab === 'watching' ? 'No wallets watched yet. Star any trader to add them.' : 'No data found.'}
                    </TableCell>
                  </TableRow>
                )}
                {!loading && displayedRows.map((r, i) => {
                  return (
                    <TableRow key={r.wallet}>
                      <TableCell className="text-right text-muted-foreground text-xs w-12">
                        {tab === 'best' && i < 3
                          ? (i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉')
                          : i + 1}
                      </TableCell>
                      <TableCell className="cursor-pointer" onClick={() => openDetail(r.wallet, r)}>
                        <div className="flex items-center gap-1 flex-wrap">
                          <WalletDisplay walletAddress={r.wallet} truncate />
                          <TagPill tag={r.tag} />
                          <StarBtn watching={watchlist.has(r.wallet)} onClick={() => toggleWatch(r.wallet)} disabled={!user} />
                        </div>
                      </TableCell>
                      <TableCell className={cn('text-right font-bold', pnlClass(isInverse ? -r.pnl30d : r.pnl30d))}>
                        {fmtUSD(isInverse ? -r.pnl30d : r.pnl30d)}
                      </TableCell>
                      <TableCell className={cn('text-right font-medium', pnlClass(r.pnlAll))}>
                        {fmtUSD(r.pnlAll)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {fmtVol(r.volume)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={isInverse ? 'destructive' : 'default'}
                          onClick={() => openDetail(r.wallet, r)}
                        >
                          {isInverse ? 'Inverse' : 'Follow'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Trader detail sidebar */}
      {detailWallet && (
        <TraderDetailModal
          wallet={detailWallet}
          leaderboardRow={detailRow ? {
            total_follower_pnl: detailRow.pnl30d ?? detailRow.total_follower_pnl,
            volume: detailRow.volume,
            win_rate_pct: detailRow.win_rate_pct,
            pnl_rank: detailRow.rank ?? detailRow.displayRank,
          } : null}
          initialInverse={isInverse}
          onClose={() => { setDetailWallet(null); setDetailRow(null) }}
        />
      )}
    </div>
  )
}
