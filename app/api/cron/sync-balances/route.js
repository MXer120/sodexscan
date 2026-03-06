import { supabaseAdmin as supabase } from '../../../lib/supabaseServer'

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

    for (let i = 0; i < accounts.length; i += 5) {
      const batch = accounts.slice(i, i + 5)

      await Promise.all(batch.map(async (account) => {
        try {
          const res = await fetch(`${MAINNET_API}/account/${account.account_id}/balances`)
          const data = await res.json()

          if (data?.code === 0 && data?.data?.balances) {
            const balances = Object.entries(data.data.balances).map(([asset, balance]) => ({
              account_id: account.account_id,
              asset,
              balance: parseFloat(balance || 0)
            }))

            if (balances.length > 0) {
              // Delete old balances for this account
              await supabase
                .from('spot_balances')
                .delete()
                .eq('account_id', account.account_id)

              // Insert new balances
              await supabase
                .from('spot_balances')
                .insert(balances)

              totalUpdated += balances.length
            }
          }
        } catch (err) {
          console.error(`Error syncing balances for ${account.account_id}:`, err)
        }
      }))
    }

    return Response.json({
      success: true,
      updated: totalUpdated
    })
  } catch (error) {
    console.error('Sync balances error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
