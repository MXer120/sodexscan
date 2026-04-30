import { supabaseAdmin } from '../../../lib/supabaseServer'
import { randomBytes } from 'crypto'

async function getUser(request) {
  const auth = request.headers.get('authorization') ?? ''
  const token = auth.replace('Bearer ', '').trim()
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user ?? null
}

export async function POST(request) {
  const user = await getUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Expire any existing unused tokens for this user first
  await supabaseAdmin
    .from('telegram_link_tokens')
    .delete()
    .eq('user_id', user.id)

  const token = randomBytes(24).toString('hex')

  const { error } = await supabaseAdmin
    .from('telegram_link_tokens')
    .insert({
      token,
      user_id: user.id,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ token })
}
