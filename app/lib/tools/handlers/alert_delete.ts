import { supabaseAdmin } from '../../supabaseServer'

export async function alert_delete({ id }, { user }) {
  if (!user) return { error: 'Unauthorized', code: 401 }

  const { error, count } = await supabaseAdmin
    .from('user_alert_settings')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message, code: 500 }
  return { deleted: (count ?? 0) > 0 }
}
