
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function getSodexId(address) {
    const { data } = await supabase
        .from('leaderboard_smart')
        .select('account_id')
        .ilike('wallet_address', address)
        .maybeSingle()
    return data?.account_id
}

export async function GET(request, { params }) {
    const { address } = params

    const accountId = await getSodexId(address)

    if (!accountId) {
        return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    const fetchJson = async (url, options) => {
        try {
            const res = await fetch(url, options)
            if (!res.ok) return null
            return await res.json()
        } catch (e) {
            console.error(`Failed to fetch ${url}`, e)
            return null
        }
    }

    // Parallel fetch of all data points used in UI
    const [
        leaderboard,
        overview,
        details,
        balances,
        dailyPnl,
        positions,
        fundTransfers
    ] = await Promise.all([
        supabase.from('leaderboard_smart').select('account_id, wallet_address, cumulative_pnl, cumulative_volume, unrealized_pnl, pnl_rank, volume_rank, last_synced_at, first_trade_ts_ms').eq('account_id', accountId).maybeSingle(),
        fetchJson(`https://mainnet-data.sodex.dev/api/v1/perps/pnl/overview?account_id=${accountId}`),
        fetchJson(`https://mainnet-gw.sodex.dev/futures/fapi/user/v1/public/account/details?accountId=${accountId}`),
        fetchJson(`https://mainnet-gw.sodex.dev/pro/p/user/balance/list?accountId=${accountId}`),
        fetchJson(`https://mainnet-data.sodex.dev/api/v1/perps/pnl/daily_stats?account_id=${accountId}`),
        fetchJson(`https://mainnet-data.sodex.dev/api/v1/perps/positions?account_id=${accountId}&limit=500`),
        fetchJson(`https://sodex.dev/mainnet/chain/user/${accountId}/fund-transfers?userId=${accountId}&page=1&size=200`)
    ])

    // Post request for account flow (withdrawals)
    const accountFlow = await fetchJson('https://alpha-biz.sodex.dev/biz/mirror/account_flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: address, start: 0, limit: 200 })
    })

    return NextResponse.json({
        wallet_address: address,
        account_id: accountId,
        data: {
            leaderboard_entry: leaderboard.data,
            overview: overview,
            account_details: details,
            balances: balances,
            daily_pnl: dailyPnl,
            positions: positions,
            fund_transfers: fundTransfers,
            account_flow: accountFlow
        },
        meta: {
            timestamp: new Date().toISOString(),
            source: 'Sodex Public Mirror'
        }
    }, {
        headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
        }
    })
}
