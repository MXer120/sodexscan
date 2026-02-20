import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const MAINNET_API = 'https://mainnet-data.sodex.dev/api/v1'

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    // Get all account mappings
    const { data: accounts } = await supabase
      .from('account_mapping')
      .select('account_id, wallet_address')

    if (!accounts || accounts.length === 0) {
      return Response.json({ success: true, updated: 0 })
    }

    // Fetch PnL and volume for each account
    const leaderboardData = []
    const batchSize = 50

    for (let i = 0; i < accounts.length; i += batchSize) {
      const batch = accounts.slice(i, i + batchSize)
      const promises = batch.map(async (account) => {
        try {
          // Fetch account stats
          const [pnlRes, volumeRes] = await Promise.all([
            fetch(`${MAINNET_API}/account/${account.account_id}/pnl`).then(r => r.json()),
            fetch(`${MAINNET_API}/account/${account.account_id}/volume`).then(r => r.json())
          ])

          const totalPnl = pnlRes?.data?.total || 0
          const totalVolume = volumeRes?.data?.total || 0

          return {
            account_id: account.account_id,
            wallet_address: account.wallet_address,
            cumulative_pnl: totalPnl,
            cumulative_volume: totalVolume
          }
        } catch (err) {
          console.error(`Error fetching stats for ${account.account_id}:`, err)
          return null
        }
      })

      const results = await Promise.all(promises)
      leaderboardData.push(...results.filter(Boolean))
    }

    // Upsert to leaderboard table
    if (leaderboardData.length > 0) {
      await supabase
        .from('leaderboard')
        .upsert(leaderboardData, { onConflict: 'account_id' })
    }

    return Response.json({
      success: true,
      updated: leaderboardData.length
    })
  } catch (error) {
    console.error('Sync leaderboard error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
