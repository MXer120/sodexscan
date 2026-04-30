import { supabaseAdmin } from '../../supabaseServer'

export async function list_alerts(_params, { user }) {
  if (!user) return { error: 'Unauthorized', code: 401 }
  const { data, error } = await supabaseAdmin
    .from('user_alert_settings')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) return { error: error.message, code: 500 }
  return { alerts: data ?? [] }
}
