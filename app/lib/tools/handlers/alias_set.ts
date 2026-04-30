import { supabaseAdmin } from '../../supabaseServer'

export async function alias_set({ address, name }, { user }) {
  if (!user) return { error: 'Unauthorized', code: 401 }
  const trimmed = (name ?? '').trim()
  if (!trimmed) return { error: 'name is required', code: 400, field: 'name' }
  if (trimmed.length > 64) return { error: 'name must be ≤64 chars', code: 400, field: 'name' }

  const { data, error } = await supabaseAdmin
    .from('wallet_tags')
    .upsert(
      { user_id: user.id, wallet_address: address, tag_name: trimmed, is_group: false },
      { onConflict: 'user_id,wallet_address' }
    )
    .select('id, wallet_address, tag_name')
    .single()
  if (error) return { error: error.message, code: 500 }
  return data
}
