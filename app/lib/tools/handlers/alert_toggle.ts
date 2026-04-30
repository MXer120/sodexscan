import { supabaseAdmin } from '../../supabaseServer'

export async function alert_toggle({ id, enabled }, { user }) {
  if (!user) return { error: 'Unauthorized', code: 401 }

  const { data, error } = await supabaseAdmin
    .from('user_alert_settings')
    .update({ enabled })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, enabled, label, type, target')
    .single()

  if (error) return { error: error.message, code: 500 }
  if (!data) return { error: 'Not found', code: 404 }
  return data
}
