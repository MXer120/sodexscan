import { supabaseAdmin } from '../../supabaseServer'

export async function watchlist_remove({ address }, { user }) {
  if (!user) return { error: 'Unauthorized', code: 401 }
  const { error, count } = await supabaseAdmin
    .from('watchlist')
    .delete({ count: 'exact' })
    .eq('user_id', user.id)
    .ilike('wallet_address', address)
  if (error) return { error: error.message, code: 500 }
  return { removed: (count ?? 0) > 0 }
}
