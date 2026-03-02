
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const fetchJson = async (url, options) => {
    try {
        const res = await fetch(url, options)
        if (!res.ok) return null
        return await res.json()
    } catch {
        return null
    }
}

// Lightweight real-time endpoint — skips account_flow (paginated/expensive) and bracket list (static)
export async function GET(request, { params }) {
    const { address } = params

    const { data: lbData } = await supabase
        .from('leaderboard_smart')
        .select('account_id, wallet_address, cumulative_pnl, cumulative_volume, unrealized_pnl, pnl_rank, volume_rank, last_synced_at, first_trade_ts_ms')
        .ilike('wallet_address', address)
        .maybeSingle()

    if (!lbData?.account_id) {
        return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    const accountId = lbData.account_id

    const [overview, details, balances, dailyPnl, positions, fundTransfers] = await Promise.all([
        fetchJson(`https://mainnet-data.sodex.dev/api/v1/perps/pnl/overview?account_id=${accountId}`),
        fetchJson(`https://mainnet-gw.sodex.dev/futures/fapi/user/v1/public/account/details?accountId=${accountId}`),
        fetchJson(`https://mainnet-gw.sodex.dev/pro/p/user/balance/list?accountId=${accountId}`),
        fetchJson(`https://mainnet-data.sodex.dev/api/v1/perps/pnl/daily_stats?account_id=${accountId}`),
        fetchJson(`https://mainnet-data.sodex.dev/api/v1/perps/positions?account_id=${accountId}&limit=500`),
        fetchJson(`https://sodex.dev/mainnet/chain/user/${accountId}/fund-transfers?userId=${accountId}&page=1&size=200`)
    ])

    return NextResponse.json({
        wallet_address: address,
        account_id: accountId,
        data: {
            leaderboard_entry: lbData,
            overview,
            account_details: details,
            balances,
            daily_pnl: dailyPnl,
            positions,
            fund_transfers: fundTransfers,
            account_flow: null
        },
        meta: { timestamp: new Date().toISOString(), source: 'Sodex Live' }
    }, {
        headers: { 'Cache-Control': 'no-store' }
    })
}
