import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function PATCH(request, { params }) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const id = params.id
  const body = await request.json()
  const allowed = ['label', 'type', 'target', 'thresholds', 'channels', 'enabled']
  const update = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

  const { data, error } = await supabase
    .from('user_alert_settings')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!data) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ alert: data })
}

export async function DELETE(request, { params }) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const id = params.id
  const { error } = await supabase
    .from('user_alert_settings')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return new Response(null, { status: 204 })
}
