import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('user_alert_settings')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ alerts: data })
}

export async function POST(request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { type, target, thresholds, channels, label } = body

  if (!type || !target) {
    return Response.json({ error: 'type and target are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('user_alert_settings')
    .insert({ user_id: user.id, type, target, thresholds: thresholds ?? {}, channels: channels ?? { telegram: true }, label: label ?? null, enabled: true })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ alert: data }, { status: 201 })
}
