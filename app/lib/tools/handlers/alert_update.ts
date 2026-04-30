import { supabaseAdmin } from '../../supabaseServer'

const DURATIONS_MS = {
  '15m': 900_000,
  '1h': 3_600_000,
  '1w': 604_800_000,
  '1mo': 2_592_000_000,
  '90d': 7_776_000_000,
  '100d': 8_640_000_000,
}

const ALLOWED = ['label', 'type', 'target', 'thresholds', 'channels', 'enabled', 'market', 'max_triggers', 'price_source']

export async function alert_update(params, { user }) {
  if (!user) return { error: 'Unauthorized', code: 401 }
  const { id, active_for, ...rest } = params

  const update = Object.fromEntries(Object.entries(rest).filter(([k]) => ALLOWED.includes(k)))
  if (active_for !== undefined) {
    const ms = DURATIONS_MS[active_for]
    update.expires_at = ms != null ? new Date(Date.now() + ms).toISOString() : null
  }
  if (Object.keys(update).length === 0) return { error: 'No updatable fields provided', code: 400 }

  const { data, error } = await supabaseAdmin
    .from('user_alert_settings')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return { error: error.message, code: 500 }
  if (!data) return { error: 'Not found', code: 404 }
  return { alert: data }
}
