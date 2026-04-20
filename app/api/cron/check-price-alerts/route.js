/**
 * Cron: poll Sodex mark prices, compare against user thresholds, enqueue alerts.
 * Runs every minute. Rate: 1 API call per tick (perpsMarkPrices endpoint).
 */

import { requireCronAuth } from '../../../lib/cronAuth'
import { supabaseAdmin } from '../../../lib/supabaseServer'
import { perpsMarkPrices } from '../../../lib/sodexApi'

// Track previous prices in-memory (per cold start). Good enough for 1-req-per-min cadence.
const prevPrices = new Map()

export async function GET(request) {
  const authErr = requireCronAuth(request)
  if (authErr) return authErr

  try {
    const marks = await perpsMarkPrices()
    const priceMap = new Map()

    const rawList = Array.isArray(marks) ? marks : (marks?.data ?? marks?.list ?? [])
    for (const m of rawList) {
      const symbol = m.symbol ?? m.s
      const price = parseFloat(m.markPrice ?? m.price ?? m.p ?? 0)
      if (symbol && price) priceMap.set(symbol, price)
    }

    // Fetch all enabled price-movement alert settings
    const { data: settings } = await supabaseAdmin
      .from('user_alert_settings')
      .select('user_id, target, thresholds')
      .eq('type', 'price_movement')
      .eq('enabled', true)

    const queued = []

    for (const setting of settings ?? []) {
      const symbol = setting.target
      const currentPrice = priceMap.get(symbol)
      if (!currentPrice) continue

      const prev = prevPrices.get(symbol)
      if (!prev) {
        prevPrices.set(symbol, currentPrice)
        continue
      }

      const pct = ((currentPrice - prev) / prev) * 100
      const threshold = parseFloat(setting.thresholds?.pct ?? 5)

      if (Math.abs(pct) >= threshold) {
        queued.push({
          user_id: setting.user_id,
          type: 'price_movement',
          payload: { symbol, pct: parseFloat(pct.toFixed(4)), currentPrice, prevPrice: prev },
          status: 'pending',
        })
      }
    }

    if (queued.length > 0) {
      await supabaseAdmin.from('alert_queue').insert(queued)
    }

    // Update price cache after processing
    for (const [sym, price] of priceMap) {
      prevPrices.set(sym, price)
    }

    return Response.json({ checked: priceMap.size, queued: queued.length })
  } catch (err) {
    console.error('Price alert cron error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
