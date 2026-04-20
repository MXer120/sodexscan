/**
 * Cron: probe Sodex gateway health every minute.
 * 2+ consecutive failures → enqueue maintenance alert for opted-in users.
 */

import { requireCronAuth } from '../../../lib/cronAuth'
import { supabaseAdmin } from '../../../lib/supabaseServer'

let consecutiveFails = 0
const FAIL_THRESHOLD = 2

export async function GET(request) {
  const authErr = requireCronAuth(request)
  if (authErr) return authErr

  try {
    const res = await fetch('https://mainnet-gw.sodex.dev/api/v1/perps/markets/tickers', {
      signal: AbortSignal.timeout(8000),
    })

    if (res.ok) {
      consecutiveFails = 0
      return Response.json({ healthy: true })
    }

    consecutiveFails++
  } catch {
    consecutiveFails++
  }

  if (consecutiveFails >= FAIL_THRESHOLD) {
    // Enqueue maintenance alert for all opted-in users
    const { data: users } = await supabaseAdmin
      .from('user_notification_channels')
      .select('user_id')
      .not('verified_at', 'is', null)

    if (users?.length) {
      const uniqueUserIds = [...new Set(users.map(u => u.user_id))]

      // Only queue if we haven't queued a maintenance alert in the last 30 min
      const since = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      const { count } = await supabaseAdmin
        .from('alert_queue')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'maintenance')
        .gte('created_at', since)

      if ((count ?? 0) === 0) {
        await supabaseAdmin.from('alert_queue').insert(
          uniqueUserIds.map(user_id => ({
            user_id,
            type: 'maintenance',
            payload: { message: `Sodex gateway appears down (${consecutiveFails} consecutive failures). Check sodex.com for updates.` },
            status: 'pending',
          }))
        )
      }
    }
  }

  return Response.json({ healthy: false, consecutiveFails })
}
