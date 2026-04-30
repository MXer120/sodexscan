import { supabaseAdmin } from '../../supabaseServer'

export async function get_alias({ address }, { user }) {
  if (!user) return { error: 'Unauthorized', code: 401 }

  const { data: tag } = await supabaseAdmin
    .from('wallet_tags')
    .select('tag_name, group_name')
    .eq('user_id', user.id)
    .eq('is_group', false)
    .ilike('wallet_address', address)
    .maybeSingle()

  let groupColor = null
  if (tag?.group_name) {
    const { data: grp } = await supabaseAdmin
      .from('wallet_tags')
      .select('group_color')
      .eq('user_id', user.id)
      .eq('is_group', true)
      .eq('group_name', tag.group_name)
      .maybeSingle()
    groupColor = grp?.group_color ?? null
  }

  return {
    address,
    alias: tag?.tag_name ?? null,
    group: tag?.group_name ?? null,
    group_color: groupColor,
  }
}
