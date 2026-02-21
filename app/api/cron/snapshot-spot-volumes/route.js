import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SPOT_DATA_URL = 'https://raw.githubusercontent.com/Eliasdegemu61/sodex-spot-volume-data/main/spot_vol_data.json'

const SODEX_SPOT_WALLETS = new Set([
  '0xc50e42e7f49881127e8183755be3f281bb687f7b',
  '0x1f446dfa225d5c9e8a80cd227bf57444fc141332',
  '0x4b16ce4edb6bfea22aa087fb5cb3cfd654ca99f5'
])

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    // Get current week number from meta
    const { data: meta, error: metaErr } = await supabase
      .from('leaderboard_meta')
      .select('current_week_number')
      .eq('id', 1)
      .single()
    if (metaErr) throw metaErr

    // After freeze, current_week_number is already incremented.
    // Snapshot belongs to the just-frozen week = current - 1.
    const weekNumber = meta.current_week_number - 1

    // Fetch spot volume data from GitHub
    const res = await fetch(SPOT_DATA_URL)
    if (!res.ok) throw new Error(`GitHub fetch failed: ${res.status}`)
    const spotData = await res.json()

    // Build rows, excluding sodex wallets
    const rows = []
    for (const [address, data] of Object.entries(spotData)) {
      if (SODEX_SPOT_WALLETS.has(address.toLowerCase())) continue
      rows.push({
        week_number: weekNumber,
        wallet_address: address.toLowerCase(),
        volume: data.vol || 0,
        user_id: data.userId || null,
        last_ts: data.last_ts || null,
        snapshot_at: new Date().toISOString()
      })
    }

    // Upsert in batches
    const batchSize = 500
    let upserted = 0
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize)
      const { error } = await supabase
        .from('spot_volume_snapshots')
        .upsert(batch, { onConflict: 'week_number,wallet_address' })
      if (error) throw error
      upserted += batch.length
    }

    return Response.json({
      success: true,
      week: weekNumber,
      upserted
    })
  } catch (error) {
    console.error('Snapshot spot volumes error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
