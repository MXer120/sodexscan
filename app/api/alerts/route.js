import { supabaseAdmin } from '../../lib/supabaseServer'

async function getUser(request) {
  const auth = request.headers.get('authorization') ?? ''
  const token = auth.replace('Bearer ', '').trim()
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user ?? null
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
  const { type, target, thresholds, channels, label } = body
  if (!type || !target) return Response.json({ error: 'type and target are required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('user_alert_settings')
    .insert({ user_id: user.id, type, target, thresholds: thresholds ?? {}, channels: channels ?? { telegram: true }, label: label ?? null, enabled: true })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ alert: data }, { status: 201 })
}
