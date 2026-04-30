'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import '../styles/NotificationsPanel.css'

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function fmtPrice(p) {
  if (!p) return null
  const n = Number(p)
  return n >= 1
    ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })
}

function tradeUrl(payload, type) {
  const sym = payload?.symbol ?? ''
  if (!sym) return null
  const market = type === 'spot' ? 'spot' : 'perps'
  if (market === 'spot') return `https://app.sodex.io/trade/spot/${sym}`
  return `https://app.sodex.io/trade/${sym}`
}

function formatNotification(item) {
  const p = item.payload ?? {}
  const sym = p.symbol ?? item.target ?? ''
  const price = p.currentPrice ?? p.price

  switch (item.type) {
    case 'price_level': {
      const dir = p.direction === 'below' ? 'below' : 'above'
      const arrow = dir === 'above' ? '⬆️' : '⬇️'
      const thresh = p.threshold ? `$${fmtPrice(Number(p.threshold))}` : ''
      return {
        icon: arrow,
        title: `${sym} crossed ${dir}${thresh ? ` ${thresh}` : ''}`,
        sub: price ? `Now $${fmtPrice(Number(price))}` : null,
        url: tradeUrl(p, item.market),
      }
    }
    case 'price_movement': {
      const pct = p.pct ?? p.percent
      const sign = pct >= 0 ? '+' : ''
      return {
        icon: pct >= 0 ? '📈' : '📉',
        title: `${sym} moved ${sign}${Number(pct).toFixed(2)}%`,
        sub: price ? `Now $${fmtPrice(Number(price))}` : null,
        url: tradeUrl(p, item.market),
      }
    }
    case 'new_listing':
      return { icon: '🆕', title: `New listing: ${sym}`, sub: null, url: tradeUrl(p, 'perps') }
    case 'new_incoming':
      return { icon: '🔜', title: `Incoming: ${sym}`, sub: null, url: null }
    case 'wallet_deposit':
      return { icon: '💰', title: `Deposit received${sym ? ` · ${sym}` : ''}`, sub: p.amount ? `$${fmtPrice(Number(p.amount))}` : null, url: null }
    case 'wallet_withdrawal':
      return { icon: '📤', title: `Withdrawal${sym ? ` · ${sym}` : ''}`, sub: p.amount ? `$${fmtPrice(Number(p.amount))}` : null, url: null }
    case 'wallet_fill':
      return { icon: '✅', title: `Trade fill${sym ? ` · ${sym}` : ''}`, sub: null, url: tradeUrl(p, item.market) }
    case 'position_open':
      return { icon: '📂', title: `Position opened${sym ? ` · ${sym}` : ''}`, sub: null, url: tradeUrl(p, 'perps') }
    case 'position_close':
      return { icon: '📁', title: `Position closed${sym ? ` · ${sym}` : ''}`, sub: null, url: tradeUrl(p, 'perps') }
    case 'order_placed':
      return { icon: '📋', title: `Order placed${sym ? ` · ${sym}` : ''}`, sub: null, url: tradeUrl(p, item.market) }
    case 'order_cancelled':
      return { icon: '❌', title: `Order cancelled${sym ? ` · ${sym}` : ''}`, sub: null, url: null }
    case 'daily_pnl':
      return { icon: '📊', title: `Daily PnL alert${p.value ? ` · $${fmtPrice(Number(p.value))}` : ''}`, sub: null, url: null }
    case 'weekly_pnl':
      return { icon: '📊', title: `Weekly PnL alert${p.value ? ` · $${fmtPrice(Number(p.value))}` : ''}`, sub: null, url: null }
    case 'total_pnl':
      return { icon: '📊', title: `Total PnL alert${p.value ? ` · $${fmtPrice(Number(p.value))}` : ''}`, sub: null, url: null }
    case 'sodex_announcement':
      return { icon: '📢', title: p.message ?? 'SoDEX Announcement', sub: null, url: 'https://app.sodex.io' }
    default:
      return { icon: '🔔', title: 'Alert fired', sub: item.target ?? null, url: null }
  }
}

// ── Bell SVG icon (matches NavIcon usage in Navbar) ───────────────────────────
function BellIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function NotificationsPanel({ user }) {
  const [open, setOpen]       = useState(false)
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(false)
  const [clearedAt, setClearedAt] = useState(null)
  const [clearing, setClearing]   = useState(false)
  const wrapperRef = useRef(null)
  const channelRef = useRef(null)

  // ── Fetch notifications + clearedAt ──────────────────────────────────────
  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [histRes, profileRes] = await Promise.all([
        supabase
          .from('alert_history')
          .select('id, type, target, channel, payload, sent_at, market')
          .eq('user_id', user.id)
          .order('sent_at', { ascending: false })
          .limit(50),
        supabase
          .from('profiles')
          .select('notifications_cleared_at')
          .eq('id', user.id)
          .single(),
      ])
      if (histRes.data) setItems(histRes.data)
      if (profileRes.data?.notifications_cleared_at) {
        setClearedAt(profileRes.data.notifications_cleared_at)
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [user])

  // ── Realtime inserts ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('np-alert-history')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'alert_history',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setItems(prev => [payload.new, ...prev].slice(0, 50))
      })
      .subscribe()
    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [user])

  // ── Load when opened ──────────────────────────────────────────────────────
  useEffect(() => {
    if (open && user) load()
  }, [open, user, load])

  // ── Close on outside click / Escape ──────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    const onClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  // ── Clear all ─────────────────────────────────────────────────────────────
  const clearAll = async () => {
    if (!user) return
    setClearing(true)
    const now = new Date().toISOString()
    await supabase
      .from('profiles')
      .upsert({ id: user.id, notifications_cleared_at: now })
    setClearedAt(now)
    setClearing(false)
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const visibleItems = clearedAt
    ? items.filter(i => new Date(i.sent_at) > new Date(clearedAt))
    : items

  const unreadCount = visibleItems.length
  const showBadge = user && unreadCount > 0

  if (!user) {
    // Render a dead bell (no user)
    return (
      <button className="np-bell" title="Notifications" disabled>
        <BellIcon size={15} />
      </button>
    )
  }

  return (
    <div className="np-wrapper" ref={wrapperRef}>
      <button
        className={`np-bell${open ? ' np-bell--active' : ''}`}
        title="Notifications"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <BellIcon size={15} />
        {showBadge && (
          unreadCount <= 9
            ? <span className="np-badge">{unreadCount}</span>
            : <span className="np-badge">9+</span>
        )}
        {!showBadge && items.length > 0 && <span className="np-dot" />}
      </button>

      {open && (
        <div className="np-panel" role="dialog" aria-label="Notifications">
          <div className="np-header">
            <div className="np-header-left">
              <span className="np-title">Notifications</span>
              {unreadCount > 0 && (
                <span className="np-unread-label">{unreadCount} new</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button className="np-clear-btn" onClick={clearAll} disabled={clearing}>
                Clear all
              </button>
            )}
          </div>

          <div className="np-list">
            {loading ? (
              <div className="np-loading">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="np-skeleton" />
                ))}
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="np-empty">
                <div className="np-empty-icon">🔔</div>
                <div className="np-empty-text">No new notifications</div>
              </div>
            ) : (
              visibleItems.map(item => {
                const { icon, title, sub, url } = formatNotification(item)
                const isUnread = clearedAt
                  ? new Date(item.sent_at) > new Date(clearedAt)
                  : true
                const Tag = url ? 'a' : 'div'
                const tagProps = url
                  ? { href: url, target: '_blank', rel: 'noopener noreferrer' }
                  : {}
                return (
                  <Tag
                    key={item.id}
                    className={`np-item${isUnread ? ' np-item--unread' : ''}`}
                    {...tagProps}
                  >
                    <span className="np-item-icon">{icon}</span>
                    <div className="np-item-body">
                      <div className="np-item-title">{title}</div>
                      {sub && <div className="np-item-sub">{sub}</div>}
                    </div>
                    <span className="np-item-time">{timeAgo(item.sent_at)}</span>
                  </Tag>
                )
              })
            )}
          </div>

          <div className="np-footer">
            Notifications are kept for 30 days.
          </div>
        </div>
      )}
    </div>
  )
}
