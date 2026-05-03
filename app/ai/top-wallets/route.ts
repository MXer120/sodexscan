
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const metric = searchParams.get('metric') || 'realized_profit'
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)

    const sortBy = metric === 'volume' ? 'volume' : 'pnl'
    const pageSize = limit

    const apiRes = await fetch(
        `https://mainnet-data.sodex.dev/api/v1/leaderboard?window_type=ALL_TIME&sort_by=${sortBy}&sort_order=desc&page=1&pageSize=${pageSize}`
    )

    if (!apiRes.ok) {
        return NextResponse.json({ error: 'Upstream API error' }, { status: 502 })
    }

    const apiJson = await apiRes.json()
    const items: { rank: number; wallet_address: string; pnl_usd: number; volume_usd: number }[] = apiJson?.data?.items || []

    const responseDate = new Date().toISOString()

    const formattedData = items.map(row => ({
        wallet_address: row.wallet_address,
        metrics: {
            realized_profit: {
                value: parseFloat(String(row.pnl_usd)),
                unit: 'USD'
            },
            volume: {
                value: parseFloat(String(row.volume_usd)),
                unit: 'USD'
            }
        },
        ranks: {
            pnl: row.rank,
            volume: row.rank
        }
    }))

    return NextResponse.json({
        data: formattedData,
        meta: {
            count: formattedData.length,
            metric: metric,
            timestamp: responseDate
        }
    }, {
        headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
        }
    })
}
