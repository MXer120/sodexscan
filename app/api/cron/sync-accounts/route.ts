import { supabaseAdmin as supabase } from '../../../lib/supabaseServer'

const MAINNET_API = 'https://mainnet-data.sodex.dev/api/v1'

export async function GET(request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    // Get last synced account ID
    const { data: syncState } = await supabase
      .from('sync_state')
      .select('last_account_id')
      .eq('id', 'account_mapping')
      .single()

    let lastAccountId = parseInt(syncState?.last_account_id || '0')
    let hasMore = true
    let newMappings = 0
    const batchSize = 20

    while (hasMore) {
      const startId = lastAccountId + 1
      const endId = startId + batchSize - 1

      // Fetch batch of account IDs
      const promises = []
      for (let id = startId; id <= endId; id++) {
        promises.push(
          fetch(`${MAINNET_API}/account/${id}/wallet`)
            .then(res => res.json())
            .then(data => ({ id, data }))
            .catch(() => ({ id, data: null }))
        )
      }

      const results = await Promise.all(promises)

      // Process results
      const mappings = []
      let foundAny = false

      for (const { id, data } of results) {
        if (data?.code === 0 && data?.data?.walletAddress) {
          foundAny = true
          mappings.push({
            account_id: id.toString(),
            wallet_address: data.data.walletAddress
          })
          lastAccountId = id
        }
      }

      // Insert mappings
      if (mappings.length > 0) {
        await supabase
          .from('account_mapping')
          .upsert(mappings, { onConflict: 'account_id' })

        newMappings += mappings.length
      }

      // Stop if no wallets found in entire batch
      if (!foundAny) {
        hasMore = false
      }

      // Safety: stop after checking 1000 IDs per run
      if (lastAccountId - parseInt(syncState?.last_account_id || '0') >= 1000) {
        hasMore = false
      }
    }

    // Update sync state
    await supabase
      .from('sync_state')
      .update({
        last_account_id: lastAccountId.toString(),
        last_synced_at: new Date().toISOString()
      })
      .eq('id', 'account_mapping')

    return Response.json({
      success: true,
      newMappings,
      lastAccountId
    })
  } catch (error) {
    console.error('Sync accounts error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
