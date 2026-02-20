import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const MAINNET_API = 'https://mainnet-data.sodex.dev/api/v1'

/**
 * Master sync endpoint - syncs all data sources
 * Called on initial load and manual refresh
 */
export async function POST(request) {
  try {
    const { type } = await request.json()

    const results = {}

    // If no type specified, sync everything
    if (!type || type === 'all') {
      const syncFuncs = [
        syncAccounts,
        syncLeaderboard,
        syncPositions,
        syncHistory,
        syncWithdrawals,
        syncBalances,
        syncPnl
      ]

      await Promise.all(syncFuncs.map(async (fn) => {
        try {
          const result = await fn()
          results[fn.name] = result
        } catch (err) {
          results[fn.name] = { success: false, error: err.message }
        }
      }))
    } else {
      // Sync specific type
      const syncMap = {
        accounts: syncAccounts,
        leaderboard: syncLeaderboard,
        positions: syncPositions,
        history: syncHistory,
        withdrawals: syncWithdrawals,
        balances: syncBalances,
        pnl: syncPnl
      }

      const fn = syncMap[type]
      if (fn) {
        results[type] = await fn()
      }
    }

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    })
  } catch (error) {
    console.error('Sync error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

async function syncAccounts() {
  const { data: lastAccount } = await supabase
    .from('account_mapping')
    .select('account_id')
    .order('account_id', { ascending: false })
    .limit(1)
    .single()

  const lastId = lastAccount?.account_id || 1000000
  let currentId = lastId + 1
  let inserted = 0
  let notFound = 0
  const maxNotFound = 50

  while (notFound < maxNotFound) {
    try {
      const res = await fetch(`${MAINNET_API}/account/${currentId}/info`)
      const data = await res.json()

      if (data?.code === 0 && data?.data?.walletAddress) {
        await supabase
          .from('account_mapping')
          .upsert({
            account_id: currentId,
            wallet_address: data.data.walletAddress
          }, { onConflict: 'account_id' })
        inserted++
        notFound = 0
      } else {
        notFound++
      }
      currentId++
    } catch (err) {
      notFound++
      currentId++
    }
  }

  return { success: true, inserted }
}

async function syncLeaderboard() {
  const { data: accounts } = await supabase
    .from('account_mapping')
    .select('account_id, wallet_address')

  if (!accounts || accounts.length === 0) {
    return { success: true, updated: 0 }
  }

  let totalUpdated = 0

  for (let i = 0; i < accounts.length; i += 10) {
    const batch = accounts.slice(i, i + 10)

    await Promise.all(batch.map(async (account) => {
      try {
        const res = await fetch(`${MAINNET_API}/account/${account.account_id}/summary`)
        const data = await res.json()

        if (data?.code === 0 && data?.data) {
          await supabase
            .from('leaderboard')
            .upsert({
              account_id: account.account_id,
              wallet_address: account.wallet_address,
              cumulative_pnl: parseFloat(data.data.total_pnl || 0),
              cumulative_volume: parseFloat(data.data.total_volume || 0)
            }, { onConflict: 'account_id' })
          totalUpdated++
        }
      } catch (err) {
        console.error(`Error syncing leaderboard for ${account.account_id}:`, err)
      }
    }))
  }

  return { success: true, updated: totalUpdated }
}

async function syncPositions() {
  const { data: accounts } = await supabase
    .from('account_mapping')
    .select('account_id')

  if (!accounts || accounts.length === 0) {
    return { success: true, updated: 0 }
  }

  let totalInserted = 0

  await supabase.from('open_positions').delete().neq('account_id', -1)

  for (let i = 0; i < accounts.length; i += 10) {
    const batch = accounts.slice(i, i + 10)

    await Promise.all(batch.map(async (account) => {
      try {
        const res = await fetch(`${MAINNET_API}/account/${account.account_id}/positions`)
        const data = await res.json()

        if (data?.code === 0 && data?.data?.length > 0) {
          const positions = data.data.map(p => ({
            account_id: account.account_id,
            symbol: p.symbol,
            size: parseFloat(p.size || 0),
            entry_price: parseFloat(p.entry_price || 0),
            mark_price: parseFloat(p.mark_price || 0),
            unrealized_pnl: parseFloat(p.unrealized_pnl || 0),
            margin: parseFloat(p.margin || 0),
            leverage: parseFloat(p.leverage || 1)
          }))

          await supabase.from('open_positions').insert(positions)
          totalInserted += positions.length
        }
      } catch (err) {
        console.error(`Error syncing positions for ${account.account_id}:`, err)
      }
    }))
  }

  return { success: true, inserted: totalInserted }
}

async function syncHistory() {
  const { data: accounts } = await supabase
    .from('account_mapping')
    .select('account_id')

  if (!accounts || accounts.length === 0) {
    return { success: true, updated: 0 }
  }

  let totalInserted = 0

  for (let i = 0; i < accounts.length; i += 10) {
    const batch = accounts.slice(i, i + 10)

    await Promise.all(batch.map(async (account) => {
      try {
        const { data: lastPos } = await supabase
          .from('position_history')
          .select('closed_at')
          .eq('account_id', account.account_id)
          .order('closed_at', { ascending: false })
          .limit(1)
          .single()

        const lastDate = lastPos?.closed_at || '2024-01-01T00:00:00Z'

        const res = await fetch(`${MAINNET_API}/account/${account.account_id}/history?start_date=${lastDate}`)
        const data = await res.json()

        if (data?.code === 0 && data?.data?.length > 0) {
          const history = data.data.map(h => ({
            account_id: account.account_id,
            symbol: h.symbol,
            size: parseFloat(h.size || 0),
            entry_price: parseFloat(h.entry_price || 0),
            exit_price: parseFloat(h.exit_price || 0),
            realized_pnl: parseFloat(h.realized_pnl || 0),
            opened_at: h.opened_at,
            closed_at: h.closed_at
          }))

          await supabase
            .from('position_history')
            .upsert(history, { onConflict: 'account_id,closed_at' })

          totalInserted += history.length
        }
      } catch (err) {
        console.error(`Error syncing history for ${account.account_id}:`, err)
      }
    }))
  }

  return { success: true, inserted: totalInserted }
}

async function syncWithdrawals() {
  const { data: accounts } = await supabase
    .from('account_mapping')
    .select('account_id')

  if (!accounts || accounts.length === 0) {
    return { success: true, updated: 0 }
  }

  let totalInserted = 0

  for (let i = 0; i < accounts.length; i += 10) {
    const batch = accounts.slice(i, i + 10)

    await Promise.all(batch.map(async (account) => {
      try {
        const res = await fetch(`${MAINNET_API}/account/${account.account_id}/withdrawals`)
        const data = await res.json()

        if (data?.code === 0 && data?.data?.length > 0) {
          const withdrawals = data.data.map(w => ({
            account_id: account.account_id,
            withdrawal_id: w.id,
            amount: parseFloat(w.amount || 0),
            asset: w.asset,
            status: w.status,
            created_at: w.created_at
          }))

          await supabase
            .from('withdrawals')
            .upsert(withdrawals, { onConflict: 'withdrawal_id' })

          totalInserted += withdrawals.length
        }
      } catch (err) {
        console.error(`Error syncing withdrawals for ${account.account_id}:`, err)
      }
    }))
  }

  return { success: true, inserted: totalInserted }
}

async function syncBalances() {
  const { data: accounts } = await supabase
    .from('account_mapping')
    .select('account_id')

  if (!accounts || accounts.length === 0) {
    return { success: true, updated: 0 }
  }

  let totalInserted = 0

  await supabase.from('spot_balances').delete().neq('account_id', -1)

  for (let i = 0; i < accounts.length; i += 10) {
    const batch = accounts.slice(i, i + 10)

    await Promise.all(batch.map(async (account) => {
      try {
        const res = await fetch(`${MAINNET_API}/account/${account.account_id}/balances`)
        const data = await res.json()

        if (data?.code === 0 && data?.data) {
          const balances = Object.entries(data.data).map(([asset, amount]) => ({
            account_id: account.account_id,
            asset,
            amount: parseFloat(amount || 0)
          })).filter(b => b.amount > 0)

          if (balances.length > 0) {
            await supabase.from('spot_balances').insert(balances)
            totalInserted += balances.length
          }
        }
      } catch (err) {
        console.error(`Error syncing balances for ${account.account_id}:`, err)
      }
    }))
  }

  return { success: true, inserted: totalInserted }
}

async function syncPnl() {
  const { data: accounts } = await supabase
    .from('account_mapping')
    .select('account_id')

  if (!accounts || accounts.length === 0) {
    return { success: true, updated: 0 }
  }

  let totalUpdated = 0

  for (let i = 0; i < accounts.length; i += 10) {
    const batch = accounts.slice(i, i + 10)

    await Promise.all(batch.map(async (account) => {
      try {
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

  return { success: true, updated: totalUpdated }
}
