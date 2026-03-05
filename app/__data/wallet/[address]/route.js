
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function getStats(address) {
    const { data } = await supabase
        .from('leaderboard_smart')
        .select('wallet_address, cumulative_pnl, cumulative_volume, unrealized_pnl, pnl_rank, volume_rank, last_synced_at')
        .eq('wallet_address', address.toLowerCase())
        .maybeSingle()
    return data
}

export async function GET(request, { params }) {
    const { address } = params
    const data = await getStats(address)

    if (!data) {
        return new NextResponse('# Wallet Not Found\n\nThe requested wallet address is not indexed.', {
            status: 404,
            headers: { 'Content-Type': 'text/markdown' }
        })
    }

    const markdown = `
# Wallet Profile: ${data.wallet_address}

## Key Metrics
- **Rank (PnL)**: #${data.pnl_rank || 'N/A'}
- **Rank (Volume)**: #${data.volume_rank || 'N/A'}
- **Realized Profit**: $${parseFloat(data.cumulative_pnl || 0).toLocaleString()}
- **Unrealized Profit**: $${parseFloat(data.unrealized_pnl || 0).toLocaleString()}
- **Total Volume**: $${parseFloat(data.cumulative_volume || 0).toLocaleString()}

## Sync Status
- **Last Updated**: ${data.last_synced_at}
- **Source**: Sodex Leaderboard Smart Index

---
*This is a machine-readable markdown mirror of the profile data at https://www.communityscan-sodex.com/tracker/${address}*
`.trim()

    return new NextResponse(markdown, {
        headers: {
            'Content-Type': 'text/markdown',
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
        }
    })
}
