
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const metric = searchParams.get('metric') || 'realized_profit'
    const limit = parseInt(searchParams.get('limit') || '10')

    let orderBy = 'cumulative_pnl'
    if (metric === 'volume') orderBy = 'cumulative_volume'

    // Only realized_profit and volume seem supported by the table columns shown in MainnetPage.jsx

    const { data, error } = await supabase
        .from('leaderboard_smart')
        .select('account_id, wallet_address, cumulative_pnl, cumulative_volume, unrealized_pnl, pnl_rank, volume_rank, last_synced_at')
        .order(orderBy, { ascending: false })
        .limit(limit)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const responseDate = new Date().toISOString()

    const formattedData = data.map(row => ({
        wallet_address: row.wallet_address,
        metrics: {
            realized_profit: {
                value: parseFloat(row.cumulative_pnl),
                unit: 'USD'
            },
            volume: {
                value: parseFloat(row.cumulative_volume),
                unit: 'USD'
            },
            unrealized_profit: {
                value: parseFloat(row.unrealized_pnl),
                unit: 'USD'
            }
        },
        ranks: {
            pnl: row.pnl_rank,
            volume: row.volume_rank
        },
        last_updated: row.last_synced_at
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
