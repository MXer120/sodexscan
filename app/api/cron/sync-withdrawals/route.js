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
          const res = await fetch(`${MAINNET_API}/account/${account.account_id}/withdrawals`)
          const data = await res.json()

          if (data?.code === 0 && data?.data?.length > 0) {
            const withdrawals = data.data.map(w => ({
              id: w.id || `${account.account_id}-${w.created_at}`,
              account_id: account.account_id,
              amount: parseFloat(w.amount || 0),
              asset: w.asset || 'USDC',
              status: w.status || 'completed',
              transaction_hash: w.transaction_hash || w.txHash,
              created_at: w.created_at || w.timestamp
            }))

            await supabase
              .from('withdrawals')
              .upsert(withdrawals, { onConflict: 'id' })

            totalUpdated += withdrawals.length
          }
        } catch (err) {
          console.error(`Error syncing withdrawals for ${account.account_id}:`, err)
        }
      }))
    }

    return Response.json({
      success: true,
      updated: totalUpdated
    })
  } catch (error) {
    console.error('Sync withdrawals error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
