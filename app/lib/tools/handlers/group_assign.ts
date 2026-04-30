import { supabaseAdmin } from '../../supabaseServer'

// Assigns an alias row to a group, or removes it from its group (group_name: null).
// Only operates on the current user's own aliases.
export async function group_assign({ address, group_name }, { user }) {
  if (!user) return { error: 'Unauthorized', code: 401 }

  if (group_name != null) {
    const { data: grp } = await supabaseAdmin
      .from('wallet_tags')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_group', true)
      .eq('group_name', group_name)
      .maybeSingle()
    if (!grp) return { error: `Group "${group_name}" not found`, code: 404 }
  }

  const { data, error } = await supabaseAdmin
    .from('wallet_tags')
    .update({ group_name: group_name ?? null })
    .eq('user_id', user.id)
    .ilike('wallet_address', address)
    .eq('is_group', false)
    .select('id, wallet_address, tag_name, group_name')
    .single()

  if (error) return { error: error.message, code: 500 }
  if (!data) return { error: 'Alias not found for this address', code: 404 }
  return data
}
