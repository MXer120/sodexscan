import { supabaseAdmin } from '../../supabaseServer'

const DURATIONS_MS = {
  '15m': 900_000,
  '1h': 3_600_000,
  '1w': 604_800_000,
  '1mo': 2_592_000_000,
  '90d': 7_776_000_000,
  '100d': 8_640_000_000,
}

function resolveExpiresAt(active_for) {
  if (!active_for || active_for === 'unlimited') return null
  const ms = DURATIONS_MS[active_for]
  return ms != null ? new Date(Date.now() + ms).toISOString() : null
}

export async function alert_create({ type, target, thresholds, channels, label, market, max_triggers, active_for, price_source }, { user }) {
  if (!user) return { error: 'Unauthorized', code: 401 }
  if (!type || !target) return { error: 'type and target are required', code: 400 }

  const resolvedMarket = ['spot', 'perps'].includes(market) ? market : 'perps'
  const resolvedMaxTriggers = Number.isInteger(max_triggers) && max_triggers > 0 ? max_triggers : null
  const resolvedPriceSource = ['sodex', 'sosovalue'].includes(price_source) ? price_source : 'sodex'
  const expires_at = resolveExpiresAt(active_for ?? '90d')

  const { data, error } = await supabaseAdmin
    .from('user_alert_settings')
    .insert({
      user_id: user.id,
      type,
      target,
      thresholds: thresholds ?? {},
      channels: channels ?? { telegram: true },
      label: label ?? null,
      enabled: true,
      market: resolvedMarket,
      max_triggers: resolvedMaxTriggers,
      fire_count: 0,
      expires_at,
      price_source: resolvedPriceSource,
    })
    .select()
    .single()

  if (error) return { error: error.message, code: 500 }
  return { alert: data }
}
