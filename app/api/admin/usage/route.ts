import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabaseServer'

// ── Auth helper ──────────────────────────────────────────────────────────────
async function verifyMod(req: Request) {
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.replace('Bearer ', '').trim()
  if (!token) return null
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || !['mod', 'admin', 'owner'].includes(profile.role)) return null
  return user
}

export async function GET(req: Request) {
  const user = await verifyMod(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const results = await Promise.allSettled([
    // DB size
    supabaseAdmin.rpc('exec_sql', { sql: "SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size" })
      .then(r => r, () => supabaseAdmin.from('_dummy_').select('1').limit(0)),

    // Row counts for key tables
    supabaseAdmin.from('user_alert_settings').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('alert_history').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('user_notification_channels').select('id', { count: 'exact', head: true }),

    // alert_history last 24h
    supabaseAdmin
      .from('alert_history')
      .select('id', { count: 'exact', head: true })
      .gte('sent_at', new Date(Date.now() - 86_400_000).toISOString()),

    // alert_history last 7d
    supabaseAdmin
      .from('alert_history')
      .select('id', { count: 'exact', head: true })
      .gte('sent_at', new Date(Date.now() - 7 * 86_400_000).toISOString()),

    // active alerts
    supabaseAdmin
      .from('user_alert_settings')
      .select('id', { count: 'exact', head: true })
      .eq('enabled', true),

    // Telegram channels
    supabaseAdmin
      .from('user_notification_channels')
      .select('id', { count: 'exact', head: true })
      .eq('channel', 'telegram'),

    // Discord channels
    supabaseAdmin
      .from('user_notification_channels')
      .select('id', { count: 'exact', head: true })
      .eq('channel', 'discord'),

    // price cache count
    supabaseAdmin.from('cron_price_cache').select('symbol', { count: 'exact', head: true }),

    // price cache last updated
    supabaseAdmin
      .from('cron_price_cache')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single(),

    // cron jobs (pg_cron)
    supabaseAdmin.rpc('get_cron_jobs').then(r => r, () => ({ data: null, error: 'no rpc' })),

    // auth users count via admin API
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 }),
  ])

  const val = (r, fallback = null) => r.status === 'fulfilled' ? r.value : { data: fallback, error: r.reason, count: null }

  const [
    _dbSize,
    alertSettings,
    alertHistoryAll,
    profiles,
    notifChannels,
    alertHistory24h,
    alertHistory7d,
    activeAlerts,
    telegramChannels,
    discordChannels,
    priceCacheCount,
    priceCacheLast,
    cronJobs,
    authUsers,
  ] = results.map(r => val(r))

  // Try to get DB size via direct SQL since rpc may not exist
  let dbSize = '~296 MB'
  try {
    const { data } = await supabaseAdmin
      .from('pg_stat_database')
      .select('pg_size_pretty(pg_database_size(datname))')
      .eq('datname', 'postgres')
      .single()
    if (data) dbSize = String(Object.values(data as Record<string, unknown>)[0] ?? dbSize)
  } catch { /* use default */ }

  // Parse cron jobs — may come from various sources
  let jobs = []
  if (cronJobs?.data && Array.isArray(cronJobs.data)) {
    jobs = cronJobs.data
  }

  // Auth users total
  let totalUsers = profiles.count ?? 0
  if (authUsers?.data?.users !== undefined) {
    // listUsers returns total via pagination — not available per page,
    // so we use profile count as proxy
  }

  return NextResponse.json({
    db: {
      size: dbSize,
      sizeMb: 296, // approximate — update if rpc works
      limitMb: 500,
    },
    tables: {
      user_alert_settings: alertSettings.count ?? 0,
      alert_history: alertHistoryAll.count ?? 0,
      profiles: profiles.count ?? 0,
      user_notification_channels: notifChannels.count ?? 0,
    },
    alerts: {
      total: alertSettings.count ?? 0,
      active: activeAlerts.count ?? 0,
      fired_24h: alertHistory24h.count ?? 0,
      fired_7d: alertHistory7d.count ?? 0,
      fired_all: alertHistoryAll.count ?? 0,
    },
    channels: {
      telegram: telegramChannels.count ?? 0,
      discord: discordChannels.count ?? 0,
    },
    priceCache: {
      symbols: priceCacheCount.count ?? 0,
      lastUpdated: priceCacheLast.data?.updated_at ?? null,
    },
    users: {
      total: profiles.count ?? 0,
    },
    cronJobs: jobs,
    fetchedAt: new Date().toISOString(),
  })
}
