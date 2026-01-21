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
    // Get all accounts
    const { data: accounts } = await supabase
      .from('account_mapping')
      .select('account_id')

    if (!accounts || accounts.length === 0) {
      return Response.json({ success: true, updated: 0 })
    }

    let totalUpdated = 0

    // Fetch positions in batches
    for (let i = 0; i < accounts.length; i += 20) {
      const batch = accounts.slice(i, i + 20)

      await Promise.all(batch.map(async (account) => {
        try {
          // Fetch open positions
          const posRes = await fetch(`${MAINNET_API}/account/${account.account_id}/positions`)
          const posData = await posRes.json()

          if (posData?.code === 0 && posData?.data?.positions) {
            const positions = posData.data.positions.map(p => ({
              id: `${account.account_id}-${p.symbol}`,
              account_id: account.account_id,
              symbol: p.symbol,
              side: p.side,
              entry_price: parseFloat(p.entryPrice || 0),
              current_price: parseFloat(p.markPrice || 0),
              size: parseFloat(p.size || 0),
              unrealized_pnl: parseFloat(p.unrealizedProfit || 0),
              leverage: parseFloat(p.leverage || 1)
            }))

            if (positions.length > 0) {
              await supabase
                .from('open_positions')
                .upsert(positions, { onConflict: 'id' })
              totalUpdated += positions.length
            }

            // Delete closed positions
            const positionIds = positions.map(p => p.id)
            if (positionIds.length > 0) {
              await supabase
                .from('open_positions')
                .delete()
                .eq('account_id', account.account_id)
                .not('id', 'in', `(${positionIds.join(',')})`)
            }
          }
        } catch (err) {
          console.error(`Error syncing positions for ${account.account_id}:`, err)
        }
      }))
    }

    return Response.json({
      success: true,
      updated: totalUpdated
    })
  } catch (error) {
    console.error('Sync positions error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
