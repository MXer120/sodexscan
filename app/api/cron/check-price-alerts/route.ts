/**
 * Cron: check price conditions and send TG/Discord directly.
 * Triggered every minute by Supabase pg_cron → Vault(APP_URL)/api/cron/check-price-alerts
 *
 * Architecture: detect here → send here → log to alert_history.
 * No queue middleman — fewer moving parts, easier to debug.
 *
 * Crossing semantics:
 *   price_level  → fires only on a crossing event (prev on one side, current on other).
 *   price_movement → fires when abs(Δ%) ≥ threshold vs prev tick.
 *
 * Cold-start fix: prev prices are persisted in cron_price_cache (Supabase table)
 * so crossing detection survives Vercel's stateless invocations.
 *
 * max_triggers / fire_count controls total lifetime fires.
 * expires_at auto-disables the alert when reached.
 */

import { requireCronAuth } from '../../../lib/cronAuth'
import { supabaseAdmin }   from '../../../lib/supabaseServer'
import { perpsMarkPrices } from '../../../lib/sodexApi'

const APP_URL        = process.env.NEXT_PUBLIC_APP_URL || 'https://www.communityscan-sodex.com'
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN

// ── Rate-limit windows ────────────────────────────────────────────────────────
const RATE_LIMIT_MS = {
  price_level:    30_000,  // 30 s — crossing logic already handles dedup
  price_movement: 60_000,  // 60 s
}

// ── Price helpers ─────────────────────────────────────────────────────────────

function didCross(prev, current, threshold, direction) {
  if (prev == null) return false
  const up   = prev < threshold && current >= threshold
  const down = prev > threshold && current <= threshold
  return direction === 'above' ? up
       : direction === 'below' ? down
       : up || down   // 'either'
}

function fmt(n) {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Message builders ──────────────────────────────────────────────────────────

function priceLevelMsg(symbol, threshold, direction, current) {
  const arrow = direction === 'above' ? '⬆️' : direction === 'below' ? '⬇️' : '↕️'
  const dirLabel = direction === 'either'
    ? (current >= threshold ? 'above' : 'below')
    : direction
  return `${arrow} <b>${symbol}</b> crossed <b>${dirLabel}</b> <b>$${fmt(threshold)}</b>\nCurrent: <b>$${fmt(current)}</b>\n\n<i>Price level alert — not financial advice.</i>`
}

function priceMovementMsg(symbol, pct, current) {
  const icon = pct >= 0 ? '📈' : '📉'
  const sign = pct >= 0 ? '+' : ''
  return `${icon} <b>${symbol}</b> moved <b>${sign}${Number(pct).toFixed(2)}%</b> to <b>$${fmt(current)}</b>\n\n<i>Price movement alert — not financial advice.</i>`
}

// ── Inline keyboard ───────────────────────────────────────────────────────────

function alertKeyboard(alertId, symbol, market = 'perps') {
  const sodexUrl = market === 'spot'
    ? `https://app.sodex.io/trade/spot/${encodeURIComponent(symbol)}`
    : `https://app.sodex.io/trade/${encodeURIComponent(symbol)}`

  return {
    inline_keyboard: [
      [
        { text: '📊 View on SoDEX', url: sodexUrl },
        { text: '🔔 My Alerts',     url: `${APP_URL}/alerts` },
      ],
      [
        { text: '⏸ Disable this alert', callback_data: `disable_alert:${alertId}` },
      ],
    ],
  }
}

// ── Telegram sender ───────────────────────────────────────────────────────────

async function tgSend(chatId, text, replyMarkup) {
  if (!TELEGRAM_TOKEN || !chatId) return false
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id:                  chatId,
        text,
        parse_mode:               'HTML',
        disable_web_page_preview: true,
        reply_markup:             replyMarkup,
      }),
    })
    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      console.error(`TG send failed ${res.status}:`, e.description)
      return false
    }
    return true
  } catch (e) {
    console.error('TG send exception:', e.message)
    return false
  }
}

// ── Rate-limit check ──────────────────────────────────────────────────────────

async function isRateLimited(userId, type, target, windowMs) {
  const since = new Date(Date.now() - windowMs).toISOString()
  const { count } = await supabaseAdmin
    .from('alert_history')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type',    type)
    .eq('target',  target)
    .gte('sent_at', since)
  return (count ?? 0) > 0
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(request) {
  const authErr = requireCronAuth(request)
  if (authErr) return authErr

  try {
    // ── 1. Load previous prices from DB (cold-start safe) ──────────────────
    const { data: cachedRows } = await supabaseAdmin
      .from('cron_price_cache')
      .select('symbol, price')

    const prevPrices = new Map()
    for (const row of cachedRows ?? []) {
      prevPrices.set(row.symbol, parseFloat(row.price))
    }

    // ── 2. Fetch current SoDEX perps mark prices ────────────────────────────
    const marks   = await perpsMarkPrices()
    const rawList = Array.isArray(marks) ? marks : (marks?.data ?? marks?.list ?? [])
    const priceMap = new Map()
    for (const m of rawList) {
      const sym   = m.symbol ?? m.s
      const price = parseFloat(m.markPrice ?? m.price ?? m.p ?? 0)
      if (sym && price) priceMap.set(sym, price)
    }

    // ── 2b. Fetch SoSoValue reference prices for BTC and ETH ───────────────
    // Note: sosovalue_cache keys 'btc_price' / 'eth_price' are populated by
    // the sosovalue sync cron (module='etf'). Fallback to SoDEX mark is safe.
    const [{ data: ssvBtc }, { data: ssvEth }] = await Promise.all([
      supabaseAdmin.from('sosovalue_cache').select('payload').eq('module', 'etf').eq('key', 'btc_price').single(),
      supabaseAdmin.from('sosovalue_cache').select('payload').eq('module', 'etf').eq('key', 'eth_price').single(),
    ])

    const ssvPriceMap = new Map()
    const ssvBtcPrice = parseFloat(ssvBtc?.payload?.price ?? ssvBtc?.payload ?? 0)
    const ssvEthPrice = parseFloat(ssvEth?.payload?.price ?? ssvEth?.payload ?? 0)
    if (ssvBtcPrice) ssvPriceMap.set('BTC-USD', ssvBtcPrice)
    if (ssvEthPrice) ssvPriceMap.set('ETH-USD', ssvEthPrice)

    // ── 3. Disable alerts whose expiry has passed ───────────────────────────
    await supabaseAdmin
      .from('user_alert_settings')
      .update({ enabled: false })
      .lt('expires_at', new Date().toISOString())
      .eq('enabled', true)
      .not('expires_at', 'is', null)

    // ── 4. Fetch all enabled price alerts ───────────────────────────────────
    const { data: settings, error: settingsErr } = await supabaseAdmin
      .from('user_alert_settings')
      .select('id, user_id, target, type, thresholds, fire_count, max_triggers, market, price_source')
      .in('type', ['price_movement', 'price_level'])
      .eq('enabled', true)

    if (settingsErr) throw settingsErr

    // ── 5. Load all user channels in one query ──────────────────────────────
    const userIds = [...new Set((settings ?? []).map(s => s.user_id))]
    const { data: chRows } = userIds.length
      ? await supabaseAdmin
          .from('user_notification_channels')
          .select('user_id, channel, address')
          .in('user_id', userIds)
          .not('verified_at', 'is', null)
      : { data: [] }

    const channelsByUser = {}
    for (const ch of chRows ?? []) {
      ;(channelsByUser[ch.user_id] ??= []).push(ch)
    }

    let fired = 0
    const toUpdate = []

    for (const s of settings ?? []) {
      const symbol  = s.target
      // Use SoSoValue reference price when price_source is 'sosovalue', fall back to SoDEX mark
      const current = s.price_source === 'sosovalue'
        ? (ssvPriceMap.get(symbol) ?? priceMap.get(symbol))
        : priceMap.get(symbol)
      if (!current) continue

      // Skip exhausted alerts
      const maxT  = s.max_triggers
      const count = s.fire_count ?? 0
      if (maxT !== null && count >= maxT) continue

      const prev = prevPrices.get(symbol)  // undefined → null-safe via didCross(null check)

      let message = ''
      let payload = {}

      if (s.type === 'price_level') {
        const threshold = parseFloat(s.thresholds?.price ?? 0)
        if (!threshold) continue
        const direction = s.thresholds?.direction ?? 'above'
        if (!didCross(prev, current, threshold, direction)) continue
        const dirLabel = direction === 'either'
          ? (current >= threshold ? 'above' : 'below')
          : direction
        message = priceLevelMsg(symbol, threshold, direction, current)
        payload = { symbol, threshold, direction: dirLabel, currentPrice: current, prevPrice: prev ?? null }

      } else if (s.type === 'price_movement') {
        if (prev == null) continue
        const pct       = ((current - prev) / prev) * 100
        const threshold = parseFloat(s.thresholds?.pct ?? 5)
        if (Math.abs(pct) < threshold) continue
        message = priceMovementMsg(symbol, pct, current)
        payload = { symbol, pct: parseFloat(pct.toFixed(4)), currentPrice: current, prevPrice: prev }

      } else {
        continue
      }

      // Rate limit
      const windowMs = RATE_LIMIT_MS[s.type] ?? 60_000
      if (await isRateLimited(s.user_id, s.type, symbol, windowMs)) continue

      // Send to all verified channels
      const userChs  = channelsByUser[s.user_id] ?? []
      const keyboard = alertKeyboard(s.id, symbol, s.market ?? 'perps')
      const sentChs  = []

      for (const ch of userChs) {
        if (ch.channel === 'telegram') {
          const ok = await tgSend(ch.address, message, keyboard)
          if (ok) sentChs.push('telegram')
        }
        // Discord: future
      }

      // Record in alert_history (triggers Realtime → in-app toast)
      await supabaseAdmin.from('alert_history').insert({
        user_id: s.user_id,
        type:    s.type,
        target:  symbol,
        channel: sentChs.join(',') || 'none',
        payload,
      })

      // Queue fire_count update; disable if max reached
      const newCount = count + 1
      const disable  = maxT !== null && newCount >= maxT
      toUpdate.push({ id: s.id, fire_count: newCount, disable })
      fired++
    }

    // ── 6. Apply fire_count / disable updates ────────────────────────────────
    for (const { id, fire_count, disable } of toUpdate) {
      await supabaseAdmin
        .from('user_alert_settings')
        .update({ fire_count, ...(disable ? { enabled: false } : {}) })
        .eq('id', id)
    }

    // ── 7. Persist current prices → cron_price_cache (for next tick) ─────────
    if (priceMap.size > 0) {
      const upsertRows = []
      for (const [symbol, price] of priceMap) {
        upsertRows.push({ symbol, price, updated_at: new Date().toISOString() })
      }
      // Batch upsert in chunks of 500
      for (let i = 0; i < upsertRows.length; i += 500) {
        await supabaseAdmin
          .from('cron_price_cache')
          .upsert(upsertRows.slice(i, i + 500), { onConflict: 'symbol' })
      }
    }

    return Response.json({ ok: true, symbols: priceMap.size, prevLoaded: prevPrices.size, fired })
  } catch (err) {
    console.error('Price alert cron error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
