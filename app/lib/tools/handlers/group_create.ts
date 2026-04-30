import { supabaseAdmin } from '../../supabaseServer'

export async function group_create({ name, color }, { user }) {
  if (!user) return { error: 'Unauthorized', code: 401 }
  const trimmed = (name ?? '').trim()
  if (!trimmed) return { error: 'name is required', code: 400, field: 'name' }
  if (trimmed.length > 64) return { error: 'name must be ≤64 chars', code: 400, field: 'name' }

  const { data, error } = await supabaseAdmin
    .from('wallet_tags')
    .insert({ user_id: user.id, is_group: true, group_name: trimmed, group_color: color })
    .select('id, group_name, group_color')
    .single()
  if (error) return { error: error.message, code: 500 }
  return data
}
