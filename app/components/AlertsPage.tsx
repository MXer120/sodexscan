'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  TrendingUp, Tag, Eye, BarChart2, Bell, Layers, Plus, Pencil, Copy,
  Trash2, X, ChevronLeft, Search, Info, ArrowUp, ArrowDown, Settings,
  Wallet, Activity, Zap, AlertCircle,
} from 'lucide-react'
import CoinLogo from './ui/CoinLogo'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Switch } from './ui/switch'
import { Badge } from './ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet'
import { ScrollArea } from './ui/scroll-area'
import { toast } from 'sonner'
import '../styles/AlertsPage.css'

// ─── Auth fetch ──────────────────────────────────────────────────────────────

async function authFetch(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''
  return fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...((options.headers as Record<string, string>) ?? {}) },
  })
}

// ─── Data catalogue ──────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    id: 'price',
    label: 'Price Alerts',
    desc: 'Get notified on price moves and level crossings',
    Icon: TrendingUp,
    color: '#f59e0b',
  },
  {
    id: 'listings',
    label: 'Listings',
    desc: 'New coins listed or entering the incoming queue',
    Icon: Tag,
    color: '#6366f1',
  },
  {
    id: 'wallet',
    label: 'Wallet Activity',
    desc: 'Deposits, withdrawals, fills and order events',
    Icon: Activity,
    color: '#22c55e',
  },
  {
    id: 'pnl',
    label: 'PnL',
    desc: 'Profit & loss thresholds for any wallet',
    Icon: BarChart2,
    color: '#f26b1f',
  },
  {
    id: 'announcements',
    label: 'Announcements',
    desc: 'Official SoDEX updates and maintenance alerts',
    Icon: Bell,
    color: '#a78bfa',
  },
]

const TYPE_META = {
  price_movement:    { cat: 'price',         label: 'Price Movement',   desc: 'Fires when price moves ± a % threshold',        Icon: TrendingUp },
  price_level:       { cat: 'price',         label: 'Price Level',      desc: 'Fires when price crosses above or below a value', Icon: Zap },
  new_listing:       { cat: 'listings',      label: 'New Listing',      desc: 'New coin listed on SoDEX',                       Icon: Tag },
  new_incoming:      { cat: 'listings',      label: 'New Incoming',     desc: 'New coin appears in the Incoming queue',         Icon: Tag },
  wallet_deposit:    { cat: 'wallet',        label: 'Deposit',          desc: 'Wallet receives funds above a threshold',        Icon: ArrowDown },
  wallet_withdrawal: { cat: 'wallet',        label: 'Withdrawal',       desc: 'Wallet sends funds above a threshold',           Icon: ArrowUp },
  wallet_fill:       { cat: 'wallet',        label: 'Trade Fill',       desc: 'A position is opened or closed',                 Icon: Activity },
  position_open:     { cat: 'wallet',        label: 'Position Opened',  desc: 'A new perp position is created',                 Icon: Activity },
  position_close:    { cat: 'wallet',        label: 'Position Closed',  desc: 'A perp position is fully closed',               Icon: Activity },
  order_placed:      { cat: 'wallet',        label: 'Order Placed',     desc: 'A new order is submitted',                      Icon: Activity },
  order_cancelled:   { cat: 'wallet',        label: 'Order Cancelled',  desc: 'An order is removed from the book',             Icon: Activity },
  daily_pnl:         { cat: 'pnl',           label: 'Daily PnL',        desc: 'Daily profit or loss exceeds a threshold',       Icon: BarChart2 },
  weekly_pnl:        { cat: 'pnl',           label: 'Weekly PnL',       desc: 'Weekly profit or loss exceeds a threshold',      Icon: BarChart2 },
  total_pnl:         { cat: 'pnl',           label: 'Total PnL',        desc: 'Cumulative P&L exceeds a threshold',             Icon: BarChart2 },
  sodex_announcement:{ cat: 'announcements', label: 'SoDEX Announcement', desc: 'Official updates (coming soon)',             Icon: Bell },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function thresholdSummary(type, thresholds) {
  if (!thresholds) return ''
  if (type === 'price_movement') return thresholds.pct ? `±${thresholds.pct}%` : ''
  if (type === 'price_level') {
    const dir = thresholds.direction === 'below' ? '↓' : thresholds.direction === 'either' ? '↕' : '↑'
    return thresholds.price ? `${dir} $${Number(thresholds.price).toLocaleString()}` : ''
  }
  if (['wallet_deposit','wallet_withdrawal'].includes(type)) {
    if (thresholds.min && thresholds.max) return `$${thresholds.min}–$${thresholds.max}`
    if (thresholds.min) return `≥ $${thresholds.min}`
    return ''
  }
  if (['daily_pnl','weekly_pnl','total_pnl'].includes(type)) {
    const dir = thresholds.direction === 'below' ? '↓' : '↑'
    return thresholds.value ? `${dir} $${Number(thresholds.value).toLocaleString()}` : ''
  }
  return ''
}

interface AlertDraft {
  type: string
  target: string
  thresholds: Record<string, any>
  channels: { telegram: boolean }
  label: string
  market: string
  max_triggers: number | null
  active_for: string | null
  price_source: string
  _expires_at?: string | null
}

function defaultDraft(type: string): AlertDraft {
  return { type, target: '', thresholds: {}, channels: { telegram: true }, label: '', market: 'perps', max_triggers: null, active_for: '90d', price_source: 'sodex' }
}

const ACTIVE_FOR_OPTIONS = [
  ['15m',       '15 min'],
  ['1h',        '1 hour'],
  ['1w',        '1 week'],
  ['1mo',       '1 month'],
  ['90d',       '90 days'],
  ['100d',      '100 days'],
  ['unlimited', '∞ Unlimited'],
]

function fmtExpiry(expires_at: string | null | undefined) {
  if (!expires_at) return null
  const ms   = new Date(expires_at).getTime() - Date.now()
  if (ms <= 0) return 'expired'
  const days = Math.floor(ms / 86_400_000)
  if (days > 1)  return `${days}d left`
  const hrs  = Math.floor(ms / 3_600_000)
  if (hrs > 0)   return `${hrs}h left`
  const mins = Math.floor(ms / 60_000)
  return `${mins}m left`
}

function fmtPrice(p) {
  if (!p) return null
  return p >= 1 ? p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : p.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })
}

// ─── SoDEX direct endpoints ───────────────────────────────────────────────────

const SODEX_REST_PERPS = 'https://mainnet-gw.sodex.dev/api/v1/perps'
const SODEX_WS = {
  perps: 'wss://mainnet-gw.sodex.dev/ws/perps',
  spot:  'wss://mainnet-gw.sodex.dev/ws/spot',
}

// ─── Live prices hook (alert cards — perps mark only) ────────────────────────

const PRICE_TYPES = new Set(['price_movement', 'price_level'])

// priceData = { mark: {sym: price}, index: {sym: price} }
function useLivePrices(alerts) {
  const [priceData, setPriceData] = useState({ mark: {}, index: {} })
  const hasPerpsAlerts = useMemo(
    () => alerts.some(a => PRICE_TYPES.has(a.type) && (a.market ?? 'perps') === 'perps'),
    [alerts]
  )

  useEffect(() => {
    if (!hasPerpsAlerts) return
    let alive = true
    const poll = async () => {
      try {
        const json = await fetch(`${SODEX_REST_PERPS}/markets/mark-prices`).then(r => r.json())
        const list = Array.isArray(json) ? json : (json.data ?? json.list ?? [])
        const mark = {}, index = {}
        for (const item of list) {
          const sym = item.s ?? item.symbol
          const p = parseFloat(item.p ?? item.markPrice ?? item.price ?? 0)
          const i = parseFloat(item.i ?? item.indexPrice ?? 0)
          if (sym && p) mark[sym] = p
          if (sym && i) index[sym] = i
        }
        if (alive) setPriceData({ mark, index })
      } catch { /* keep last value */ }
    }
    poll()
    const id = setInterval(poll, 1000)
    return () => { alive = false; clearInterval(id) }
  }, [hasPerpsAlerts])

  return priceData
}

// mark fallback only for card display (not drawer — drawer uses strict lookup)
function getPrice(priceData, symbol, priceType = 'mark') {
  return priceData[priceType]?.[symbol] ?? priceData.mark?.[symbol] ?? null
}

// ─── Realtime alerts sync ────────────────────────────────────────────────────

function useRealtimeAlerts(setAlerts) {
  useEffect(() => {
    const channel = supabase
      .channel('alert-settings')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_alert_settings',
      }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setAlerts(prev => prev.filter(a => a.id !== payload.old.id))
        } else if (payload.eventType === 'INSERT') {
          setAlerts(prev => [payload.new, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setAlerts(prev => prev.map(a => a.id === payload.new.id ? { ...a, ...payload.new } : a))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [setAlerts])
}

// ─── Symbol Combobox ─────────────────────────────────────────────────────────

function SymbolCombobox({ value, onChange, placeholder = 'Search symbol…', market = 'perps' }) {
  const [query, setQuery] = useState(value ?? '')
  const [open, setOpen] = useState(false)
  const [symbols, setSymbols] = useState([])
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    setLoading(true)
    fetch('/api/symbols')
      .then(r => r.json())
      .then(d => setSymbols(d.symbols ?? []))
      .finally(() => setLoading(false))
  }, [])

  // Sync external value → local query
  useEffect(() => { setQuery(value ?? '') }, [value])

  // Close on outside click
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const q = query.toLowerCase()
  const marketSymbols = symbols.filter(s => s.market === market)
  const filtered = q
    ? marketSymbols.filter(s => s.symbol.toLowerCase().includes(q) || s.base.toLowerCase().includes(q)).slice(0, 30)
    : marketSymbols.slice(0, 20)

  const select = (sym) => {
    onChange(sym.symbol)
    setQuery(sym.symbol)
    setOpen(false)
  }

  return (
    <div className="alp-symbol-wrap" ref={ref}>
      <div className="alp-symbol-input-row">
        <Search size={14} className="alp-symbol-icon" />
        <input
          className="alp-input alp-input--symbol"
          value={query}
          placeholder={placeholder}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
          spellCheck={false}
        />
        {value && (
          <button className="alp-symbol-clear" onClick={() => { onChange(''); setQuery(''); }}>
            <X size={12} />
          </button>
        )}
      </div>
      {open && (
        <div className="alp-symbol-dropdown">
          {loading && <div className="alp-symbol-loading">Loading symbols…</div>}
          {!loading && filtered.length === 0 && <div className="alp-symbol-empty">No matches</div>}
          {filtered.map(sym => (
            <button key={sym.symbol} className="alp-symbol-row" onMouseDown={() => select(sym)}>
              <CoinLogo symbol={sym.symbol} size={22} />
              <div className="alp-symbol-info">
                <span className="alp-symbol-name">{sym.symbol}</span>
                <span className="alp-symbol-base">{sym.base}</span>
              </div>
              <Badge variant="outline" className="alp-symbol-badge">{market.toUpperCase()}</Badge>
              {sym.price && (
                <span className="alp-symbol-price">${fmtPrice(sym.price)}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Live price + condition preview ──────────────────────────────────────────

// Perps-only types; spot uses bid/ask/mid from l4Book only
const PERPS_ONLY_TYPES = new Set(['mark', 'index'])

function LivePriceBar({ type, target, thresholds, market = 'perps' }) {
  const [prices, setPrices] = useState({ mark: null, index: null, bid: null, ask: null, mid: null })
  const [connected, setConnected] = useState(false)
  const bookRef = useRef({ bids: {}, asks: {} })

  // ── REST poll: mark + index (perps only) ─────────────────────────────────
  useEffect(() => {
    if (!target || market !== 'perps') return
    let alive = true
    const poll = async () => {
      try {
        const json = await fetch(`${SODEX_REST_PERPS}/markets/mark-prices`).then(r => r.json())
        const list = Array.isArray(json) ? json : (json.data ?? json.list ?? [])
        for (const item of list) {
          const sym = item.s ?? item.symbol
          if (sym !== target) continue
          const mark  = parseFloat(item.p ?? item.markPrice ?? item.price ?? 0) || null
          const index = parseFloat(item.i ?? item.indexPrice ?? 0) || null
          if (alive) setPrices(prev => ({ ...prev, mark, index }))
          break
        }
      } catch {}
    }
    poll()
    const id = setInterval(poll, 1000)
    return () => { alive = false; clearInterval(id) }
  }, [target, market])

  // ── WebSocket: l4Book for bid/ask/mid (both markets) ─────────────────────
  useEffect(() => {
    if (!target) {
      setPrices({ mark: null, index: null, bid: null, ask: null, mid: null })
      setConnected(false)
      return
    }

    let ws = null
    let alive = true
    let pingTimer = null
    bookRef.current = { bids: {}, asks: {} }

    function applyBook(side, entries, isSnapshot) {
      const store = side === 'b' ? bookRef.current.bids : bookRef.current.asks
      if (isSnapshot) { for (const k in store) delete store[k] }
      for (const [px, qty] of (entries ?? [])) {
        const q = parseFloat(qty)
        if (q > 0) store[parseFloat(px)] = q
        else delete store[parseFloat(px)]
      }
    }

    function pushBidAsk() {
      const bidPxs = Object.keys(bookRef.current.bids).map(Number)
      const askPxs = Object.keys(bookRef.current.asks).map(Number)
      if (!bidPxs.length || !askPxs.length) return
      const bid = Math.max(...bidPxs)
      const ask = Math.min(...askPxs)
      if (alive) setPrices(prev => ({ ...prev, bid, ask, mid: (bid + ask) / 2 }))
    }

    try {
      ws = new WebSocket(SODEX_WS[market] ?? SODEX_WS.perps)

      ws.onopen = () => {
        setConnected(true)
        ws.send(JSON.stringify({ op: 'subscribe', params: { channel: 'l4Book', symbol: target, level: 10 } }))
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ op: 'ping' }))
        }, 20000)
      }

      ws.onmessage = (e) => {
        if (!alive || !e.data || e.data === 'pong') return
        let msg
        try { msg = JSON.parse(e.data) } catch { return }
        if (msg?.channel === 'l4Book' && msg.data?.s === target) {
          applyBook('b', msg.data.b, msg.type === 'snapshot')
          applyBook('a', msg.data.a, msg.type === 'snapshot')
          pushBidAsk()
        }
      }

      ws.onerror = () => {
        if (!alive) return
        toast.error('Live prices unavailable', {
          description: `Failed to connect to SoDEX ${market === 'spot' ? 'Spot' : 'Futures'} WebSocket`,
        })
      }
      ws.onclose = (e) => {
        if (!alive) return
        setConnected(false)
        if (e.code !== 1000) {
          toast.warning('Price feed disconnected', {
            description: `Connection closed (code ${e.code}). Re-select the symbol to reconnect.`,
          })
        }
      }
    } catch {}

    return () => {
      alive = false
      clearInterval(pingTimer)
      try { ws?.close() } catch {}
    }
  }, [target, market])

  if (!target) return null

  const defaultType = market === 'spot' ? 'mid' : 'mark'
  const priceType = thresholds?.priceType ?? defaultType
  const marketLabel = market === 'spot' ? 'Spot' : 'Futures'
  const price = prices[priceType]

  function PriceVal() {
    if (!connected && price == null) return <span className="alp-live-loading">connecting…</span>
    if (price == null) return <span className="alp-live-loading">waiting…</span>
    return <span className="alp-price-current">${fmtPrice(price)}</span>
  }

  function Chips() {
    return (
      <>
        <span className={`alp-price-type-chip alp-price-type-chip--${priceType}`}>{priceType.toUpperCase()}</span>
        <span className="alp-price-market-chip">{marketLabel}</span>
      </>
    )
  }

  if (type === 'price_movement' && thresholds.pct) {
    return (
      <div className="alp-price-bar">
        <Chips /><PriceVal />
        <span className="alp-price-rule">fires on <strong>±{thresholds.pct}%</strong></span>
      </div>
    )
  }

  if (type === 'price_level' && thresholds.price && thresholds.direction) {
    const trigger = Number(thresholds.price)
    const dir = thresholds.direction === 'above' ? 'above' : 'below'
    const dist = price != null ? Math.abs(price - trigger) : null
    const already = price != null ? (dir === 'above' ? price >= trigger : price <= trigger) : false
    return (
      <div className="alp-price-bar">
        <Chips /><PriceVal />
        <span className="alp-price-rule">
          {dir === 'above' ? '↑' : '↓'} ${Number(thresholds.price).toLocaleString()}
          {price != null && (already
            ? <span className="alp-price-hit"> · in zone</span>
            : <span> · ${fmtPrice(dist)} away</span>)}
        </span>
      </div>
    )
  }

  return (
    <div className="alp-price-bar">
      <Chips /><PriceVal />
      {price != null && <span className="alp-price-label">current {priceType}</span>}
    </div>
  )
}

// ─── Drawer fields ────────────────────────────────────────────────────────────

function DrawerFields({ draft, onChange, symbols }) {
  const set  = (key, val) => onChange({ ...draft, [key]: val })
  const setT = (key, val) => onChange({ ...draft, thresholds: { ...draft.thresholds, [key]: val } })
  const setC = (key, val) => onChange({ ...draft, channels: { ...draft.channels, [key]: val } })

  const isPrice    = ['price_movement','price_level'].includes(draft.type)
  const isWallet   = ['wallet_deposit','wallet_withdrawal','wallet_fill','position_open','position_close','order_placed','order_cancelled'].includes(draft.type)
  const isPnl      = ['daily_pnl','weekly_pnl','total_pnl'].includes(draft.type)
  const isListings = ['new_listing','new_incoming'].includes(draft.type)
  const isAnn      = draft.type === 'sodex_announcement'

  return (
    <div className="alp-fields">

      <div className="alp-field">
        <label className="alp-field-label">Name <span className="alp-field-opt">optional</span></label>
        <Input
          className="alp-input-sh"
          placeholder="e.g. BTC breakout watch"
          value={draft.label}
          onChange={e => set('label', e.target.value)}
        />
      </div>

      {/* Price fields */}
      {isPrice && (
        <>
          <div className="alp-field">
            <label className="alp-field-label">Market</label>
            <div className="alp-seg">
              {[['perps', 'Futures'], ['spot', 'Spot']].map(([v, lbl]) => (
                <button
                  key={v}
                  className={`alp-seg-btn ${(draft.market ?? 'perps') === v ? 'active' : ''}`}
                  onClick={() => {
                    const cur = draft.thresholds?.priceType ?? 'mark'
                    // mark/index don't exist on spot — reset to mid
                    const newType = v === 'spot' && PERPS_ONLY_TYPES.has(cur) ? 'mid' : cur
                    onChange({ ...draft, market: v, target: '', thresholds: { ...draft.thresholds, priceType: newType } })
                  }}
                >{lbl}</button>
              ))}
            </div>
          </div>

          <div className="alp-field">
            <label className="alp-field-label">Symbol</label>
            <SymbolCombobox value={draft.target} onChange={v => set('target', v)} market={draft.market ?? 'perps'} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Price source</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['sodex', 'SoDEX Mark'], ['sosovalue', 'SoSoValue']].map(([val, label]) => (
                <button key={val}
                  onClick={() => onChange({ ...draft, price_source: val })}
                  style={{
                    fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)',
                    background: (draft.price_source || 'sodex') === val ? 'var(--accent)' : 'transparent',
                    color: (draft.price_source || 'sodex') === val ? 'var(--accent-foreground)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >{label}</button>
              ))}
            </div>
            {draft.price_source === 'sosovalue' && (
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                SoSoValue tracks BTC &amp; ETH prices via ETF reference data (updated every 3 min).
              </p>
            )}
          </div>

          {draft.type === 'price_movement' && (
            <div className="alp-field">
              <label className="alp-field-label">Movement threshold</label>
              <div className="alp-input-row">
                <span className="alp-input-pre">±</span>
                <Input
                  className="alp-input-sh alp-input--no-left"
                  type="number" min="0.1" step="0.1" placeholder="5"
                  value={draft.thresholds.pct ?? ''}
                  onChange={e => setT('pct', e.target.value)}
                />
                <span className="alp-input-suf">%</span>
              </div>
            </div>
          )}

          {draft.type === 'price_level' && (
            <>
              <div className="alp-field">
                <label className="alp-field-label">Direction</label>
                <div className="alp-seg">
                  {([['above', 'Crosses above', ArrowUp], ['below', 'Crosses below', ArrowDown], ['either', 'Either direction', Zap]] as [string, string, React.ComponentType<{size?: number}>][]).map(([d, lbl, Icon]) => (
                    <button
                      key={d}
                      className={`alp-seg-btn ${(draft.thresholds.direction ?? 'above') === d ? 'active' : ''}`}
                      onClick={() => setT('direction', d)}
                    >
                      <Icon size={12} />
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
              <div className="alp-field">
                <label className="alp-field-label">Target price (USD)</label>
                <div className="alp-input-row">
                  <span className="alp-input-pre">$</span>
                  <Input
                    className="alp-input-sh alp-input--no-left"
                    type="number" min="0" step="any" placeholder="50000"
                    value={draft.thresholds.price ?? ''}
                    onChange={e => setT('price', e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="alp-field">
            <label className="alp-field-label">Price type</label>
            <div className="alp-seg">
              {((draft.market ?? 'perps') === 'spot'
                ? [['mid','Mid'],['bid','Bid'],['ask','Ask']]
                : [['mark','Mark'],['index','Index'],['mid','Mid'],['bid','Bid'],['ask','Ask']]
              ).map(([v,lbl]) => (
                <button
                  key={v}
                  className={`alp-seg-btn ${(draft.thresholds.priceType ?? ((draft.market ?? 'perps') === 'spot' ? 'mid' : 'mark')) === v ? 'active' : ''}`}
                  onClick={() => setT('priceType', v)}
                >{lbl}</button>
              ))}
            </div>
          </div>

          <LivePriceBar type={draft.type} target={draft.target} thresholds={draft.thresholds} market={draft.market ?? 'perps'} />

          <div className="alp-field">
            <label className="alp-field-label">Trigger frequency</label>
            {(() => {
              const mt = draft.max_triggers
              const mode = mt === null ? 'unlimited' : mt === 1 ? 'once' : 'custom'
              return (
                <>
                  <div className="alp-seg">
                    {[['once', 'Once'], ['unlimited', 'Every time'], ['custom', 'Custom']].map(([v, lbl]) => (
                      <button
                        key={v}
                        className={`alp-seg-btn ${mode === v ? 'active' : ''}`}
                        onClick={() => {
                          if (v === 'once')      onChange({ ...draft, max_triggers: 1 })
                          else if (v === 'unlimited') onChange({ ...draft, max_triggers: null })
                          else onChange({ ...draft, max_triggers: (mt !== null && mt !== 1) ? mt : 3 })
                        }}
                      >{lbl}</button>
                    ))}
                  </div>
                  {mode === 'custom' && (
                    <div className="alp-input-row" style={{ marginTop: 6 }}>
                      <Input
                        className="alp-input-sh"
                        type="number" min="1" step="1" placeholder="3"
                        value={draft.max_triggers ?? ''}
                        onChange={e => {
                          const n = parseInt(e.target.value)
                          onChange({ ...draft, max_triggers: n > 0 ? n : 1 })
                        }}
                      />
                      <span className="alp-input-suf">times</span>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </>
      )}

      {/* Wallet fields */}
      {isWallet && (
        <>
          <div className="alp-field">
            <label className="alp-field-label">Wallet address</label>
            <div className="alp-input-row">
              <Wallet size={14} className="alp-input-icon" />
              <Input
                className="alp-input-sh alp-input--mono alp-input--icon-l"
                placeholder="0x…"
                value={draft.target}
                onChange={e => set('target', e.target.value)}
              />
            </div>
            <p className="alp-field-hint">Watch any tracked wallet or your own address.</p>
          </div>

          {['wallet_deposit','wallet_withdrawal'].includes(draft.type) && (
            <div className="alp-field">
              <label className="alp-field-label">Amount range (USD) <span className="alp-field-opt">optional</span></label>
              <div className="alp-input-row alp-input-row--range">
                <span className="alp-input-pre">Min $</span>
                <Input className="alp-input-sh alp-input--no-left" type="number" min="0" placeholder="0"
                  value={draft.thresholds.min ?? ''} onChange={e => setT('min', e.target.value)} />
                <span className="alp-input-sep">–</span>
                <span className="alp-input-pre">Max $</span>
                <Input className="alp-input-sh alp-input--no-left" type="number" min="0" placeholder="any"
                  value={draft.thresholds.max ?? ''} onChange={e => setT('max', e.target.value)} />
              </div>
              <p className="alp-field-hint">Leave Max blank to alert on any amount above Min.</p>
            </div>
          )}

          {['wallet_fill','position_open','position_close','order_placed','order_cancelled'].includes(draft.type) && (
            <div className="alp-field">
              <label className="alp-field-label">Symbol filter <span className="alp-field-opt">optional</span></label>
              <SymbolCombobox
                value={draft.thresholds.symbol ?? ''}
                onChange={v => setT('symbol', v)}
                placeholder="All symbols or pick one…"
              />
            </div>
          )}
        </>
      )}

      {/* PnL fields */}
      {isPnl && (
        <>
          <div className="alp-field">
            <label className="alp-field-label">Wallet address</label>
            <div className="alp-input-row">
              <Wallet size={14} className="alp-input-icon" />
              <Input
                className="alp-input-sh alp-input--mono alp-input--icon-l"
                placeholder="0x…"
                value={draft.target}
                onChange={e => set('target', e.target.value)}
              />
            </div>
          </div>
          <div className="alp-field">
            <label className="alp-field-label">Direction</label>
            <div className="alp-seg">
              {([['above', 'Profit above', ArrowUp], ['below', 'Loss below', ArrowDown]] as [string, string, React.ComponentType<{size?: number}>][]).map(([d, lbl, Icon]) => (
                <button key={d} className={`alp-seg-btn ${draft.thresholds.direction === d ? 'active' : ''}`} onClick={() => setT('direction', d)}>
                  <Icon size={12} />{lbl}
                </button>
              ))}
            </div>
          </div>
          <div className="alp-field">
            <label className="alp-field-label">PnL threshold (USD)</label>
            <div className="alp-input-row">
              <span className="alp-input-pre">$</span>
              <Input className="alp-input-sh alp-input--no-left" type="number" step="any" placeholder="1000"
                value={draft.thresholds.value ?? ''} onChange={e => setT('value', e.target.value)} />
            </div>
          </div>
        </>
      )}

      {/* Listings field */}
      {isListings && (
        <div className="alp-field">
          <label className="alp-field-label">Keyword filter <span className="alp-field-opt">optional</span></label>
          <Input
            className="alp-input-sh"
            placeholder="e.g. SOL, MEME — blank = any new coin"
            value={draft.target === '__any__' ? '' : draft.target}
            onChange={e => set('target', e.target.value || '__any__')}
          />
          <p className="alp-field-hint">Alert on any new coin, or only if the ticker contains this keyword.</p>
        </div>
      )}

      {/* Announcements */}
      {isAnn && (
        <div className="alp-banner alp-banner--info">
          <AlertCircle size={15} />
          <span>The SoDEX announcement data stream is not yet live. This alert type will activate once the feed is available.</span>
        </div>
      )}

      {/* Active for / expiry */}
      <div className="alp-field">
        <label className="alp-field-label">Active for</label>
        {draft._expires_at && draft.active_for === null ? (
          <p className="alp-field-hint" style={{ marginBottom: 6 }}>
            Currently expires: {new Date(draft._expires_at).toLocaleDateString()} — pick a new duration to extend.
          </p>
        ) : null}
        <div className="alp-seg alp-seg--wrap">
          {ACTIVE_FOR_OPTIONS.map(([v, lbl]) => (
            <button
              key={v}
              className={`alp-seg-btn ${(draft.active_for ?? 'unlimited') === v ? 'active' : ''}`}
              onClick={() => onChange({ ...draft, active_for: v, _expires_at: undefined })}
            >{lbl}</button>
          ))}
        </div>
      </div>

      {/* Delivery channels */}
      <div className="alp-field">
        <label className="alp-field-label">Delivery channels</label>
        <div className="alp-channels">
          {[['telegram', 'Telegram'], ['discord', 'Discord']].map(([ch, lbl]) => (
            <label key={ch} className={`alp-ch-item ${draft.channels[ch] ? 'active' : ''}`}>
              <input type="checkbox" checked={!!draft.channels[ch]} onChange={e => setC(ch, e.target.checked)} />
              <span>{lbl}</span>
            </label>
          ))}
        </div>
        <p className="alp-field-hint">Connect channels in Profile → Alert settings.</p>
      </div>
    </div>
  )
}

// ─── Alert card ───────────────────────────────────────────────────────────────

const PRICE_TYPE_LABELS = { mark: 'Mark', index: 'Index', mid: 'Mid', bid: 'Bid', ask: 'Ask' }

function CardLivePrice({ alert, priceData }) {
  if (!PRICE_TYPES.has(alert.type) || !alert.target) return null

  const { type, thresholds } = alert
  const configuredType = thresholds?.priceType ?? 'mark'
  // Cards only have mark price from the polling API; show it with a note when type differs
  const current = priceData.mark?.[alert.target] ?? null

  if (type === 'price_movement') {
    return (
      <div className="alp-card-live">
        <span className="alp-live-type" title={`Fires on ${PRICE_TYPE_LABELS[configuredType]} price`}>
          {PRICE_TYPE_LABELS[configuredType]}
        </span>
        {current
          ? <><span className="alp-live-price">${fmtPrice(current)}</span><span className="alp-live-label">· ±{thresholds.pct ?? '?'}%</span></>
          : <span className="alp-live-label alp-live-loading">fetching…</span>
        }
      </div>
    )
  }

  if (type === 'price_level' && thresholds.price) {
    const triggerPrice = Number(thresholds.price)
    const dir  = thresholds.direction ?? 'above'
    const dist = current ? Math.abs(current - triggerPrice) : null
    const pct  = current ? ((dist / current) * 100).toFixed(2) : null
    const hit  = current ? (dir === 'above' ? current >= triggerPrice : current <= triggerPrice) : false
    const away = current ? (dir === 'above' ? current < triggerPrice : current > triggerPrice) : false

    return (
      <div className="alp-card-live">
        <span className="alp-live-type" title={`Fires on ${PRICE_TYPE_LABELS[configuredType]} price`}>
          {PRICE_TYPE_LABELS[configuredType]}
        </span>
        {current && <span className="alp-live-price">${fmtPrice(current)}</span>}
        <span className={`alp-live-target ${hit ? 'alp-live-target--hit' : ''}`}>
          {dir === 'above' ? '↑' : '↓'} ${Number(triggerPrice).toLocaleString()}
        </span>
        {current && (hit
          ? <span className="alp-live-hit">in zone</span>
          : away && <span className="alp-live-away">${fmtPrice(dist)} · {pct}%</span>
        )}
        {!current && <span className="alp-live-label alp-live-loading">fetching…</span>}
      </div>
    )
  }

  return null
}

function AlertCard({ alert, priceData, onEdit, onDuplicate, onDelete, onToggle }) {
  const meta   = TYPE_META[alert.type] ?? { cat: 'all', label: alert.type, desc: '' }
  const catCfg = CATEGORIES.find(c => c.id === meta.cat)
  const color  = catCfg?.color ?? '#888'
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
          <Switch
            checked={alert.enabled}
            onCheckedChange={() => onToggle(alert)}
            aria-label={alert.enabled ? 'Disable alert' : 'Enable alert'}
          />
        </div>
        <div className="alp-card-mid">
          {alert.market && (
            <span className={`alp-chip alp-chip--market alp-chip--market-${alert.market}`}>
              {alert.market === 'spot' ? 'Spot' : 'Futures'}
            </span>
          )}
          {alert.target && alert.target !== '__any__' && (
            <span className="alp-chip alp-chip--target">{alert.target}</span>
          )}
          {summary && <span className="alp-chip alp-chip--threshold">{summary}</span>}
          {alert.max_triggers === 1 && <span className="alp-chip alp-chip--freq">Once</span>}
          {alert.max_triggers > 1 && <span className="alp-chip alp-chip--freq">{alert.fire_count ?? 0}/{alert.max_triggers}×</span>}
          {alert.expires_at && (() => { const t = fmtExpiry(alert.expires_at); return t ? <span className={`alp-chip alp-chip--expiry ${t === 'expired' ? 'alp-chip--expired' : ''}`}>{t}</span> : null })()}
          {alert.channels?.telegram && <span className="alp-chip alp-chip--ch">TG</span>}
          {alert.channels?.discord  && <span className="alp-chip alp-chip--ch">Discord</span>}
        </div>
        <CardLivePrice alert={alert} priceData={priceData} />
      </div>
      <div className="alp-card-actions">
        <button className="alp-action-btn" onClick={() => onEdit(alert)} title="Edit">
          <Pencil size={13} />
        </button>
        <button className="alp-action-btn" onClick={() => onDuplicate(alert)} title="Duplicate">
          <Copy size={13} />
        </button>
        <button className="alp-action-btn alp-action-btn--danger" onClick={() => onDelete(alert)} title="Delete">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const [alerts, setAlerts]       = useState([])
  const [loading, setLoading]     = useState(true)
  const prices                    = useLivePrices(alerts)
  const [cat, setCat]             = useState('all')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [step, setStep]           = useState('category') // 'category' | 'type' | 'configure'
  const [selCat, setSelCat]       = useState(null)
  const [draft, setDraft]         = useState(defaultDraft('price_movement'))
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState(null)
  const [symbols, setSymbols]     = useState([])
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { document.title = 'Alerts | CommunityScan SoDEX' }, [])

  // Preload symbols for live price display
  useEffect(() => {
    fetch('/api/symbols').then(r => r.json()).then(d => setSymbols(d.symbols ?? []))
  }, [])

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
  useRealtimeAlerts(setAlerts)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const openNew = () => {
    setEditing(null)
    setDraft(defaultDraft('price_movement'))
    setSelCat(null)
    setStep('category')
    setError(null)
    setSheetOpen(true)
  }

  const openEdit = (alert) => {
    setEditing(alert)
    setDraft({ type: alert.type, target: alert.target, thresholds: alert.thresholds ?? {}, channels: alert.channels ?? { telegram: true }, label: alert.label ?? '', market: alert.market ?? 'perps', max_triggers: alert.max_triggers ?? null, active_for: alert.expires_at ? null : 'unlimited', _expires_at: alert.expires_at, price_source: alert.price_source ?? 'sodex' })
    setSelCat(TYPE_META[alert.type]?.cat ?? null)
    setStep('configure')
    setError(null)
    setSheetOpen(true)
  }

  const openDuplicate = (alert) => {
    setEditing(null)
    setDraft({ type: alert.type, target: alert.target, thresholds: alert.thresholds ?? {}, channels: alert.channels ?? { telegram: true }, label: alert.label ? `${alert.label} (copy)` : '', market: alert.market ?? 'perps', max_triggers: alert.max_triggers ?? null, active_for: '90d', price_source: alert.price_source ?? 'sodex' })
    setSelCat(TYPE_META[alert.type]?.cat ?? null)
    setStep('configure')
    setError(null)
    setSheetOpen(true)
  }

  const handleSave = async () => {
    setError(null)
    if (!draft.type) return
    const target = draft.target.trim() || '__any__'
    setSaving(true)
    try {
      const url    = editing ? `/api/alerts/${editing.id}` : '/api/alerts'
      const method = editing ? 'PATCH' : 'POST'
      // Strip UI-only fields before sending to API
      const { _expires_at: _ignored, ...cleanDraft } = draft
      const payload = { ...cleanDraft, target, max_triggers: draft.max_triggers ?? null, active_for: draft.active_for ?? '90d' }
      const res    = await authFetch(url, { method, body: JSON.stringify(payload) })
      const json   = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = json.error ?? 'Save failed'
        setError(msg)
        toast.error(editing ? 'Failed to update alert' : 'Failed to create alert', { description: msg })
        setSaving(false)
        return
      }
      setSheetOpen(false)
      toast.success(editing ? 'Alert updated' : 'Alert created')
      await load()
    } catch (e) {
      setError(e.message)
      toast.error('Save failed', { description: e.message })
    }
    setSaving(false)
  }

  const handleDelete = async (alert) => {
    if (!confirm(`Delete "${alert.label || TYPE_META[alert.type]?.label}"?`)) return
    const res = await authFetch(`/api/alerts/${alert.id}`, { method: 'DELETE' })
    if (res.ok || res.status === 204) {
      setAlerts(prev => prev.filter(a => a.id !== alert.id))
      toast.success('Alert deleted')
    } else {
      toast.error('Failed to delete alert')
    }
  }

  const handleToggle = async (alert) => {
    // Only confirm when disabling
    if (alert.enabled && !confirm(`Disable "${alert.label || TYPE_META[alert.type]?.label || 'this alert'}"? It will stop firing but remain saved.`)) return
    // Optimistic update immediately
    setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, enabled: !a.enabled } : a))
    const res = await authFetch(`/api/alerts/${alert.id}`, { method: 'PATCH', body: JSON.stringify({ enabled: !alert.enabled }) })
    if (!res.ok) {
      // Revert on failure
      setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, enabled: alert.enabled } : a))
      toast.error('Failed to update alert')
    }
  }

  const pickCategory = (catId) => {
    setSelCat(catId)
    const typesInCat = Object.entries(TYPE_META).filter(([, m]) => m.cat === catId)
    if (typesInCat.length === 1) {
      // Only one type → skip type step
      setDraft(defaultDraft(typesInCat[0][0]))
      if (catId === 'announcements') {
        setStep('configure')
      } else {
        setStep('configure')
      }
    } else {
      setStep('type')
    }
  }

  const pickType = (typeId) => {
    setDraft(prev => ({ ...defaultDraft(typeId), label: prev.label }))
    setStep('configure')
  }

  const typesInSelCat = selCat
    ? Object.entries(TYPE_META).filter(([, m]) => m.cat === selCat)
    : []

  const visible = cat === 'all' ? alerts : alerts.filter(a => TYPE_META[a.type]?.cat === cat)

  const drawerTitle = editing ? 'Edit Alert'
    : step === 'category' ? 'Choose alert type'
    : step === 'type' ? (CATEGORIES.find(c => c.id === selCat)?.label ?? 'Choose alert type')
    : TYPE_META[draft.type]?.label ?? 'New Alert'

  return (
    <div className="alp-root">
      <div className="alp-layout">

        {/* Sidebar */}
        <aside className="alp-sidebar">
          <div className="alp-sidebar-header">
            <span className="alp-sidebar-title">Categories</span>
          </div>
          <nav className="alp-nav">
            {[{ id: 'all', label: 'All Alerts', Icon: Layers, color: '#888' }, ...CATEGORIES].map(c => {
              const count = c.id === 'all' ? alerts.length : alerts.filter(a => TYPE_META[a.type]?.cat === c.id).length
              return (
                <button key={c.id} className={`alp-nav-item ${cat === c.id ? 'active' : ''}`} onClick={() => setCat(c.id)}>
                  <c.Icon size={14} className="alp-nav-icon" />
                  <span className="alp-nav-label">{c.label}</span>
                  {count > 0 && <span className="alp-nav-count">{count}</span>}
                </button>
              )
            })}
          </nav>
          <div className="alp-sidebar-footer">
            <a href="/profile" className="alp-sidebar-link">
              <Settings size={13} />
              Channel settings
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="alp-action-btn"
                onClick={handleRefresh}
                disabled={refreshing || loading}
                title="Refresh alerts"
                style={{ width: 32, height: 32 }}
              >
                <Activity size={13} style={refreshing ? { animation: 'alp-spin 0.8s linear infinite' } : {}} />
              </button>
              <Button onClick={openNew} className="alp-btn-new">
                <Plus size={15} />
                New Alert
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="alp-loading">
              {[...Array(3)].map((_, i) => <div key={i} className="alp-skeleton" />)}
            </div>
          ) : visible.length === 0 ? (
            <div className="alp-empty">
              <div className="alp-empty-icon">
                <Layers size={28} strokeWidth={1.5} />
              </div>
              <div className="alp-empty-title">No alerts yet</div>
              <div className="alp-empty-sub">
                {cat === 'all'
                  ? 'Create your first alert to get notified via Telegram or Discord.'
                  : `No ${CATEGORIES.find(c => c.id === cat)?.label.toLowerCase() ?? cat} alerts. Create one now.`}
              </div>
              <Button onClick={openNew} className="alp-btn-new alp-btn-new--sm">
                <Plus size={14} /> New Alert
              </Button>
            </div>
          ) : (
            <div className="alp-list">
              {visible.map(a => (
                <AlertCard
                  key={a.id} alert={a}
                  priceData={prices}
                  onEdit={openEdit} onDuplicate={openDuplicate}
                  onDelete={handleDelete} onToggle={handleToggle}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Sheet drawer */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="alp-sheet">
          <SheetHeader className="alp-sheet-header">
            <div className="alp-sheet-header-row">
              {step !== 'category' && !editing && (
                <button
                  className="alp-sheet-back"
                  onClick={() => setStep(step === 'configure' && typesInSelCat.length > 1 ? 'type' : 'category')}
                >
                  <ChevronLeft size={16} />
                </button>
              )}
              <SheetTitle className="alp-sheet-title">{drawerTitle}</SheetTitle>
            </div>
            {!editing && step !== 'category' && (
              <div className="alp-step-trail">
                <span className={step === 'type' || step === 'configure' ? 'alp-trail-done' : ''}>
                  {CATEGORIES.find(c => c.id === selCat)?.label ?? 'Category'}
                </span>
                {typesInSelCat.length > 1 && (
                  <>
                    <span className="alp-trail-sep">›</span>
                    <span className={step === 'configure' ? 'alp-trail-done' : ''}>
                      {step === 'configure' ? (TYPE_META[draft.type]?.label ?? 'Type') : 'Type'}
                    </span>
                  </>
                )}
              </div>
            )}
          </SheetHeader>

          <ScrollArea className="alp-sheet-body">

            {/* Step 0 — category picker */}
            {step === 'category' && (
              <div className="alp-cat-grid">
                {CATEGORIES.map(c => {
                  const existing = alerts.filter(a => TYPE_META[a.type]?.cat === c.id).length
                  return (
                    <button key={c.id} className="alp-cat-tile" onClick={() => pickCategory(c.id)} style={{ '--tile-color': c.color } as React.CSSProperties}>
                      <div className="alp-cat-tile-icon">
                        <c.Icon size={20} />
                      </div>
                      <div className="alp-cat-tile-text">
                        <span className="alp-cat-tile-name">{c.label}</span>
                        <span className="alp-cat-tile-desc">{c.desc}</span>
                      </div>
                      {existing > 0 && <span className="alp-cat-tile-count">{existing}</span>}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Step 1 — type picker within category */}
            {step === 'type' && (
              <div className="alp-type-grid">
                {typesInSelCat.map(([tid, m]) => (
                  <button key={tid} className={`alp-type-tile ${draft.type === tid ? 'active' : ''}`} onClick={() => pickType(tid)}>
                    <m.Icon size={16} className="alp-type-icon" />
                    <span className="alp-type-tile-name">{m.label}</span>
                    <span className="alp-type-tile-desc">{m.desc}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2 — configure */}
            {step === 'configure' && (
              <DrawerFields draft={draft} onChange={setDraft} symbols={symbols} />
            )}

          </ScrollArea>

          {/* Footer */}
          {step === 'configure' && (
            <div className="alp-sheet-footer">
              {error && <div className="alp-sheet-error">{error}</div>}
              <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create alert'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
