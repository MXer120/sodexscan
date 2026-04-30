import { supabaseAdmin } from '../../lib/supabaseServer'

async function getUser(request) {
  const auth = request.headers.get('authorization') ?? ''
  const token = auth.replace('Bearer ', '').trim()
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user ?? null
}

// Predefined durations → milliseconds (null = unlimited)
const DURATIONS_MS = {
  '15m':  15 * 60_000,
  '1h':    3_600_000,
  '1w':   7 * 86_400_000,
  '1mo': 30 * 86_400_000,
  '90d': 90 * 86_400_000,
  '100d':100 * 86_400_000,
  'unlimited': null,
}

function resolveExpiresAt(active_for) {
  if (!active_for || active_for === 'unlimited') return null
  const ms = DURATIONS_MS[active_for]
  return ms != null ? new Date(Date.now() + ms).toISOString() : null
}

export async function GET(request) {
  const user = await getUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('user_alert_settings')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ alerts: data })
}

export async function POST(request) {
  const user = await getUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { type, target, thresholds, channels, label, market, max_triggers, active_for, price_source } = body
  if (!type || !target) return Response.json({ error: 'type and target are required' }, { status: 400 })

  const validMarkets = ['spot', 'perps']
  const validPriceSources = ['sodex', 'sosovalue']
  const resolvedMarket      = validMarkets.includes(market) ? market : 'perps'
  const resolvedMaxTriggers = Number.isInteger(max_triggers) && max_triggers > 0 ? max_triggers : null
  const resolvedPriceSource = validPriceSources.includes(price_source) ? price_source : 'sodex'
  // Default to 90 days if no duration specified
  const expires_at = resolveExpiresAt(active_for ?? '90d')

  const { data, error } = await supabaseAdmin
    .from('user_alert_settings')
    .insert({
      user_id:      user.id,
      type,
      target,
      thresholds:   thresholds ?? {},
      channels:     channels ?? { telegram: true },
      label:        label ?? null,
      enabled:      true,
      market:       resolvedMarket,
      max_triggers: resolvedMaxTriggers,
      fire_count:   0,
      expires_at,
      price_source: resolvedPriceSource,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ alert: data }, { status: 201 })
}
