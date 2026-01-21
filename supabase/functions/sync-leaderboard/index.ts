import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get last synced account_id
    const { data: lastAccount } = await supabase
      .from('leaderboard')
      .select('account_id')
      .order('account_id', { ascending: false })
      .limit(1)
      .single()

    const startId = lastAccount?.account_id ? lastAccount.account_id + 1 : 1000
    let currentId = startId
    let newAccounts = 0
    let updated = 0
    const maxRetries = 50 // Stop after 50 consecutive 404s

    console.log(`Starting sync from account_id: ${startId}`)

    // Discover new accounts
    let consecutiveFailures = 0
    while (consecutiveFailures < maxRetries) {
      try {
        // Fetch wallet address
        const addrRes = await fetch(`https://sodex.dev/mainnet/chain/user/${currentId}/address`)
        const addrData = await addrRes.json()

        if (addrData?.code === 0 && addrData?.data?.address) {
          const walletAddress = addrData.data.address

          // Fetch PnL data
          const pnlRes = await fetch(`https://mainnet-data.sodex.dev/api/v1/perps/pnl/overview?account_id=${currentId}`)
          const pnlData = await pnlRes.json()

          if (pnlData?.code === 0 && pnlData?.data) {
            const { cumulative_pnl, cumulative_quote_volume, unrealized_pnl, first_trade_ts_ms } = pnlData.data

            await supabase
              .from('leaderboard')
              .upsert({
                account_id: currentId,
                wallet_address: walletAddress,
                cumulative_pnl: cumulative_pnl || '0',
                cumulative_volume: cumulative_quote_volume || '0',
                unrealized_pnl: unrealized_pnl || '0',
                first_trade_ts_ms: first_trade_ts_ms || null,
                last_synced_at: new Date().toISOString()
              }, { onConflict: 'account_id' })

            newAccounts++
            consecutiveFailures = 0
            console.log(`Synced account ${currentId}`)
          } else {
            consecutiveFailures++
          }
        } else {
          consecutiveFailures++
        }

        currentId++
      } catch (err) {
        console.error(`Error fetching account ${currentId}:`, err)
        consecutiveFailures++
        currentId++
      }
    }

    // Update existing accounts (all accounts in DB)
    const { data: existingAccounts } = await supabase
      .from('leaderboard')
      .select('account_id')

    if (existingAccounts && existingAccounts.length > 0) {
      console.log(`Updating ${existingAccounts.length} existing accounts`)

      // Batch updates in groups of 10
      for (let i = 0; i < existingAccounts.length; i += 10) {
        const batch = existingAccounts.slice(i, i + 10)

        await Promise.all(batch.map(async (account: any) => {
          try {
            const pnlRes = await fetch(`https://mainnet-data.sodex.dev/api/v1/perps/pnl/overview?account_id=${account.account_id}`)
            const pnlData = await pnlRes.json()

            if (pnlData?.code === 0 && pnlData?.data) {
              const { cumulative_pnl, cumulative_quote_volume, unrealized_pnl, first_trade_ts_ms } = pnlData.data

              await supabase
                .from('leaderboard')
                .update({
                  cumulative_pnl: cumulative_pnl || '0',
                  cumulative_volume: cumulative_quote_volume || '0',
                  unrealized_pnl: unrealized_pnl || '0',
                  first_trade_ts_ms: first_trade_ts_ms || null,
                  last_synced_at: new Date().toISOString()
                })
                .eq('account_id', account.account_id)

              updated++
            }
          } catch (err) {
            console.error(`Error updating account ${account.account_id}:`, err)
          }
        }))
      }
    }

    // Calculate ranks
    await supabase.rpc('update_leaderboard_ranks')

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        stats: {
          new_accounts: newAccounts,
          updated_accounts: updated,
          scanned_from: startId,
          scanned_to: currentId - 1
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
