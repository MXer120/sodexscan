
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const fetchJson = async (url: string, options?: RequestInit) => {
    try {
        const res = await fetch(url, options)
        if (!res.ok) return null
        return await res.json()
    } catch {
        return null
    }
}

// Lightweight real-time endpoint — NO supabase calls, only external APIs
export async function GET(request: Request, { params }: { params: { address: string } }) {
    const { address } = params
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
        return NextResponse.json({ error: 'accountId query param required' }, { status: 400 })
    }

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
            leaderboard_entry: null,
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
