
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('limit') || '20')
    const type = searchParams.get('type') || 'volume'
    const excludeSodex = searchParams.get('exclude_sodex') !== 'false'

    const orderColumn = type === 'volume' ? 'volume_rank' : 'pnl_rank'

    let query = supabase
        .from('leaderboard_smart')
        .select('account_id, wallet_address, cumulative_pnl, cumulative_volume, unrealized_pnl, pnl_rank, volume_rank, last_synced_at', { count: 'exact' })
        .order(orderColumn, { ascending: true, nullsFirst: false })

    if (excludeSodex) {
        query = query.or('is_sodex_owned.is.null,is_sodex_owned.eq.false')
    }

    const { data, count, error } = await query.range((page - 1) * pageSize, page * pageSize - 1)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
        data: data,
        meta: {
            page: page,
            per_page: pageSize,
            total: count,
            type: type,
            exclude_sodex: excludeSodex
        }
    }, {
        headers: {
            'Cache-Control': 'no-store' // Leaderboard changes frequently
        }
    })
}
