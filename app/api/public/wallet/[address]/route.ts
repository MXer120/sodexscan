
import { NextResponse } from 'next/server'
import { getSodexIdFromWallet } from '../../../../lib/accountResolver'

export const dynamic = 'force-dynamic'

// Module-level bracket cache (static data, changes very rarely)
let bracketCache = { data: null, timestamp: 0 }
const BRACKET_TTL = 60 * 60 * 1000 // 1 hour

// Per-address response cache (avoid redundant API calls for same wallet)
const walletCache = new Map()
const WALLET_CACHE_TTL = 60 * 1000 // 60 seconds
const MAX_WALLET_CACHE = 200 // prevent unbounded growth

async function getBracketList() {
    if (bracketCache.data && Date.now() - bracketCache.timestamp < BRACKET_TTL) {
        return bracketCache.data
    }
    try {
        const res = await fetch('https://mainnet-gw.sodex.dev/futures/fapi/market/v1/public/leverage/bracket/list')
        if (!res.ok) return bracketCache.data // return stale if available
        const json = await res.json()
        bracketCache = { data: json, timestamp: Date.now() }
        return json
    } catch {
        return bracketCache.data
    }
}

export async function GET(request: Request, { params }: { params: { address: string } }) {
    const { address } = params
    const addrLower = address.toLowerCase()

    // Check response cache
    const cached = walletCache.get(addrLower)
    if (cached && Date.now() - cached.timestamp < WALLET_CACHE_TTL) {
        return NextResponse.json(cached.body, {
            headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' }
        })
    }

    const accountId = await getSodexIdFromWallet(address)

    if (!accountId) {
        return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    const fetchJson = async (url: string, options?: RequestInit) => {
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
        overview,
        details,
        balances,
        dailyPnl,
        positions,
        fundTransfers,
        bracketList,
        rankData,
        summaryData
    ] = await Promise.all([
        fetchJson(`https://mainnet-data.sodex.dev/api/v1/perps/pnl/overview?account_id=${accountId}`),
        fetchJson(`https://mainnet-gw.sodex.dev/futures/fapi/user/v1/public/account/details?accountId=${accountId}`),
        fetchJson(`https://mainnet-gw.sodex.dev/pro/p/user/balance/list?accountId=${accountId}`),
        fetchJson(`https://mainnet-data.sodex.dev/api/v1/perps/pnl/daily_stats?account_id=${accountId}`),
        fetchJson(`https://mainnet-data.sodex.dev/api/v1/perps/positions?account_id=${accountId}&limit=500`),
        fetchJson(`https://sodex.dev/mainnet/chain/user/${accountId}/fund-transfers?userId=${accountId}&page=1&size=200`),
        getBracketList(),
        fetchJson(`https://mainnet-data.sodex.dev/api/v1/leaderboard/rank?window_type=ALL_TIME&sort_by=volume&wallet_address=${address}`),
        fetchJson(`https://mainnet-data.sodex.dev/api/v1/account/${accountId}/summary`)
    ])

    // Build symbolId → symbol string map from bracket list
    const symbolMap = {}
    if (bracketList?.code === 0 && Array.isArray(bracketList.data)) {
        bracketList.data.forEach(item => {
            if (item.symbolId && item.symbol) symbolMap[item.symbolId] = item.symbol
        })
    }

    // Enrich positions data with resolved symbol strings
    if (positions?.data && Array.isArray(positions.data)) {
        positions.data = positions.data.map(p => ({
            ...p,
            symbol: symbolMap[p.symbol_id] || p.symbol || ''
        }))
    }

    // Compute spot stats (cumulative all-time minus futures all-time)
    const cumPnl = parseFloat(rankData?.data?.item?.pnl_usd ?? rankData?.data?.pnl_usd ?? 0)
    const cumVol = parseFloat(rankData?.data?.item?.volume_usd ?? rankData?.data?.volume_usd ?? 0)
    const futuresPnl = parseFloat(summaryData?.data?.total_pnl ?? 0)
    const futuresVol = parseFloat(summaryData?.data?.total_volume ?? 0)
    const spotStats = {
        spot_pnl: cumPnl - futuresPnl,
        spot_volume: cumVol - futuresVol,
        cumulative_pnl: cumPnl,
        cumulative_volume: cumVol,
    }

    // Post request for account flow (withdrawals)
    const accountFlow = await fetchJson('https://alpha-biz.sodex.dev/biz/mirror/account_flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: address, start: 0, limit: 200 })
    })

    const responseBody = {
        wallet_address: address,
        account_id: accountId,
        spotStats,
        data: {
            leaderboard_entry: null,
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
    }

    // Store in cache (evict oldest if full)
    if (walletCache.size >= MAX_WALLET_CACHE) {
        const oldest = walletCache.keys().next().value
        walletCache.delete(oldest)
    }
    walletCache.set(addrLower, { body: responseBody, timestamp: Date.now() })

    return NextResponse.json(responseBody, {
        headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
        }
    })
}
