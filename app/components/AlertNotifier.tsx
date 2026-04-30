'use client'

/**
 * AlertNotifier — subscribes to alert_history via Supabase Realtime.
 * Shows an in-app toast whenever one of the user's alerts fires,
 * regardless of which page they're on.
 * Renders nothing — purely a side-effect component.
 */

import { useEffect } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabaseClient'

interface AlertPayload {
  symbol?: string
  direction?: string
  currentPrice?: number | string
  threshold?: number | string
  pct?: number | string
  wallet?: string
  [key: string]: unknown
}

function buildToast(type: string, target: string, payload: AlertPayload = {}) {
  const sym = payload.symbol ?? target ?? '?'
  const fmt = (n: number | string | undefined | null) => n != null
    ? Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : null

  switch (type) {
    case 'price_level': {
      const dir   = payload.direction === 'above' ? '⬆️' : '⬇️'
      const price = fmt(payload.currentPrice)
      const level = fmt(payload.threshold)
      return {
        title: `${dir} ${sym} crossed ${payload.direction ?? ''} $${level}`,
        description: price ? `Current price: $${price}` : undefined,
      }
    }
    case 'price_movement': {
      const pct  = payload.pct != null ? Number(payload.pct) : null
      const dir  = pct == null ? '📊' : pct >= 0 ? '📈' : '📉'
      const sign = pct != null && pct >= 0 ? '+' : ''
      const price = fmt(payload.currentPrice)
      return {
        title: `${dir} ${sym} moved${pct != null ? ` ${sign}${pct.toFixed(2)}%` : ''}`,
        description: price ? `Now at $${price}` : undefined,
      }
    }
    case 'wallet_fill':
    case 'wallet_activity': {
      const wallet = payload.wallet ?? target ?? ''
      const short  = wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : ''
      return {
        title: `👁 Wallet activity${short ? ` — ${short}` : ''}`,
        description: payload.symbol ? `Symbol: ${payload.symbol}` : undefined,
      }
    }
    default:
      return {
        title: '🔔 Alert fired',
        description: target && target !== '__any__' ? target : undefined,
      }
  }
}

export default function AlertNotifier() {
  useEffect(() => {
    let channel = null

    async function subscribe() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      channel = supabase
        .channel(`alert-notifier-${session.user.id}`)
        .on(
          'postgres_changes',
          {
            event:  'INSERT',
            schema: 'public',
            table:  'alert_history',
            filter: `user_id=eq.${session.user.id}`,
          },
          (payload) => {
            const row = payload.new
            const { title, description } = buildToast(row.type, row.target, row.payload ?? {})
            toast(title, {
              description,
              duration: 8000,
              action: {
                label: 'View alerts',
                onClick: () => { window.location.href = '/alerts' },
              },
            })
          }
        )
        .subscribe()
    }

    subscribe()

    // Re-subscribe when the user signs in / out
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      channel?.unsubscribe()
      channel = null
      subscribe()
    })

    return () => {
      channel?.unsubscribe()
      subscription.unsubscribe()
    }
  }, [])

  return null
}
