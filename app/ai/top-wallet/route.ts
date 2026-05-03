
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    const apiRes = await fetch(
        'https://mainnet-data.sodex.dev/api/v1/leaderboard?window_type=ALL_TIME&sort_by=pnl&sort_order=desc&page=1&pageSize=1'
    )

    if (!apiRes.ok) {
        return NextResponse.json({ error: 'Upstream API error' }, { status: 502 })
    }

    const apiJson = await apiRes.json()
    const items: { rank: number; wallet_address: string; pnl_usd: number; volume_usd: number }[] = apiJson?.data?.items || []
    const row = items[0]

    if (!row) {
        return NextResponse.json({ error: 'No data found' }, { status: 404 })
    }

    const responseDate = new Date().toISOString()

    return NextResponse.json({
        data: {
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
        },
        meta: {
            query: 'top-wallet-by-profit',
            timestamp: responseDate,
            source: 'Sodex Leaderboard'
        }
    }, {
        headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
        }
    })
}
