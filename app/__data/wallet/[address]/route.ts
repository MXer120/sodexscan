
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
    const { address } = params

    const apiRes = await fetch(
        `https://mainnet-data.sodex.dev/api/v1/leaderboard/rank?window_type=ALL_TIME&sort_by=pnl&wallet_address=${address}`
    )

    if (!apiRes.ok) {
        return new NextResponse('# Wallet Not Found\n\nThe requested wallet address is not indexed.', {
            status: 404,
            headers: { 'Content-Type': 'text/markdown' }
        })
    }

    const apiJson = await apiRes.json()
    const data = apiJson?.data

    if (!data) {
        return new NextResponse('# Wallet Not Found\n\nThe requested wallet address is not indexed.', {
            status: 404,
            headers: { 'Content-Type': 'text/markdown' }
        })
    }

    const pnl = parseFloat(data.pnl_usd || 0)
    const volume = parseFloat(data.volume_usd || 0)
    const rank = data.rank ?? null

    const markdown = `
# Wallet Profile: ${data.wallet_address}

## Key Metrics
- **Rank (PnL)**: ${rank ? `#${rank}` : 'N/A'}
- **Realized Profit**: $${pnl.toLocaleString()}
- **Total Volume**: $${volume.toLocaleString()}

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
