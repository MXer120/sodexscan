
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET() {
    const { data, error } = await supabase
        .from('leaderboard_smart')
        .select('account_id, wallet_address, cumulative_pnl, cumulative_volume, unrealized_pnl, pnl_rank, volume_rank, last_synced_at')
        .order('cumulative_pnl', { ascending: false })
        .limit(1)
        .single()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
        return NextResponse.json({ error: 'No data found' }, { status: 404 })
    }

    const responseDate = new Date().toISOString()

    return NextResponse.json({
        data: {
            wallet_address: data.wallet_address,
            metrics: {
                realized_profit: {
                    value: parseFloat(data.cumulative_pnl),
                    unit: 'USD'
                },
                volume: {
                    value: parseFloat(data.cumulative_volume),
                    unit: 'USD'
                },
                unrealized_profit: {
                    value: parseFloat(data.unrealized_pnl),
                    unit: 'USD'
                }
            },
            ranks: {
                pnl: data.pnl_rank,
                volume: data.volume_rank
            },
            last_updated: data.last_synced_at
        },
        meta: {
            query: 'top-wallet-by-profit',
            timestamp: responseDate,
            source: 'Sodex Leaderboard'
        }
    }, {
        headers: {
            'Last-Modified': data.last_synced_at || responseDate,
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
        }
    })
}
