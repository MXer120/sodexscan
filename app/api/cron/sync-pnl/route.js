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
    const { data: accounts } = await supabase
      .from('account_mapping')
      .select('account_id')

    if (!accounts || accounts.length === 0) {
      return Response.json({ success: true, updated: 0 })
    }

    let totalUpdated = 0

    for (let i = 0; i < accounts.length; i += 10) {
      const batch = accounts.slice(i, i + 10)

      await Promise.all(batch.map(async (account) => {
        try {
          // Get last PnL date for this account
          const { data: lastPnl } = await supabase
            .from('pnl_history')
            .select('date')
            .eq('account_id', account.account_id)
            .order('date', { ascending: false })
            .limit(1)
            .single()

          const lastDate = lastPnl?.date || '2024-01-01'

          const res = await fetch(
            `${MAINNET_API}/account/${account.account_id}/pnl-history?start_date=${lastDate}`
          )
          const data = await res.json()

          if (data?.code === 0 && data?.data?.length > 0) {
            const pnlHistory = data.data.map(p => ({
              account_id: account.account_id,
              date: p.date,
              daily_pnl: parseFloat(p.daily_pnl || 0),
              cumulative_pnl: parseFloat(p.cumulative_pnl || 0)
            }))

            await supabase
              .from('pnl_history')
              .upsert(pnlHistory, { onConflict: 'account_id,date' })

            totalUpdated += pnlHistory.length
          }
        } catch (err) {
          console.error(`Error syncing PnL for ${account.account_id}:`, err)
        }
      }))
    }

    return Response.json({
      success: true,
      updated: totalUpdated
    })
  } catch (error) {
    console.error('Sync PnL error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
