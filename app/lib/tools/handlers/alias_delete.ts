import { supabaseAdmin } from '../../supabaseServer'

export async function alias_delete({ address }, { user }) {
  if (!user) return { error: 'Unauthorized', code: 401 }
  const { error, count } = await supabaseAdmin
    .from('wallet_tags')
    .delete({ count: 'exact' })
    .eq('user_id', user.id)
    .ilike('wallet_address', address)
    .eq('is_group', false)
  if (error) return { error: error.message, code: 500 }
  return { deleted: (count ?? 0) > 0 }
}
