import { supabaseAdmin } from '../../supabaseServer'

export async function watchlist_add({ address }, { user }) {
  if (!user) return { error: 'Unauthorized', code: 401 }
  const { data, error } = await supabaseAdmin
    .from('watchlist')
    .insert({ user_id: user.id, wallet_address: address })
    .select('id, wallet_address, created_at')
    .single()
  if (error) {
    if (error.code === '23505') return { error: 'Already in watchlist', code: 409 }
    return { error: error.message, code: 500 }
  }
  return data
}
