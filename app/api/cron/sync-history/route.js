import { supabaseAdmin as supabase } from '../../../lib/supabaseServer'

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

    // Process in batches
    for (let i = 0; i < accounts.length; i += 5) {
      const batch = accounts.slice(i, i + 5)

      await Promise.all(batch.map(async (account) => {
        try {
          // Get last history timestamp for this account
          const { data: lastHistory } = await supabase
            .from('position_history')
            .select('closed_at')
            .eq('account_id', account.account_id)
            .order('closed_at', { ascending: false })
            .limit(1)
            .single()

          const lastTimestamp = lastHistory?.closed_at || '2024-01-01'

          // Fetch position history since last timestamp
          const histRes = await fetch(
            `${MAINNET_API}/account/${account.account_id}/position-history?start_date=${lastTimestamp}`
          )
          const histData = await histRes.json()

          if (histData?.code === 0 && histData?.data?.length > 0) {
            const history = histData.data.map(h => ({
              account_id: account.account_id,
              symbol: h.symbol,
              side: h.side,
              entry_price: parseFloat(h.entryPrice || 0),
              exit_price: parseFloat(h.exitPrice || 0),
              size: parseFloat(h.size || 0),
              pnl: parseFloat(h.pnl || 0),
              opened_at: h.openedAt,
              closed_at: h.closedAt
            }))

            await supabase
              .from('position_history')
              .insert(history)

            totalUpdated += history.length
          }
        } catch (err) {
          console.error(`Error syncing history for ${account.account_id}:`, err)
        }
      }))
    }

    return Response.json({
      success: true,
      updated: totalUpdated
    })
  } catch (error) {
    console.error('Sync history error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
