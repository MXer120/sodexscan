import { supabaseAdmin } from '../../../lib/supabaseServer'

async function getUser(request) {
  const auth = request.headers.get('authorization') ?? ''
  const token = auth.replace('Bearer ', '').trim()
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user ?? null
}

export async function PATCH(request, { params }) {
  const user = await getUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const allowed = ['label', 'type', 'target', 'thresholds', 'channels', 'enabled', 'market', 'max_triggers', 'fire_count', 'expires_at', 'price_source']
  const update = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

  // Convert active_for duration shorthand → expires_at timestamp
  if (body.active_for !== undefined) {
    const DURATIONS_MS = { '15m': 900_000, '1h': 3_600_000, '1w': 604_800_000, '1mo': 2_592_000_000, '90d': 7_776_000_000, '100d': 8_640_000_000 }
    const ms = DURATIONS_MS[body.active_for]
    update.expires_at = ms != null ? new Date(Date.now() + ms).toISOString() : null
  }

  const { data, error } = await supabaseAdmin
    .from('user_alert_settings')
    .update(update)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!data) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ alert: data })
}

export async function DELETE(request, { params }) {
  const user = await getUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabaseAdmin
    .from('user_alert_settings')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return new Response(null, { status: 204 })
}
