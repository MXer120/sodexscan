
import { supabaseAdmin as supabase } from '../../lib/supabaseServer'
import WalletPageClient from '../../components/WalletPageClient'

export const revalidate = 60

export async function generateMetadata({ params }) {
    const { address } = params

    const { data } = await supabase
        .from('leaderboard_smart')
        .select('pnl_rank, cumulative_pnl, cumulative_volume')
        .ilike('wallet_address', address)
        .maybeSingle()

    const base = {
        alternates: {
            canonical: `/tracker/${address}`,
            types: { 'application/json': `/api/public/wallet/${address}` },
        },
    }

    if (!data) {
        return {
            ...base,
            title: `Wallet ${address.slice(0, 6)}... | CommunityScan Sodex`,
            description: `Analyze this wallet's Sodex Mainnet trading performance — PnL, volume, positions, and trade history.`,
        }
    }

    const pnl = parseFloat(data.cumulative_pnl || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    const vol = parseFloat(data.cumulative_volume || 0).toLocaleString()
    const rank = data.pnl_rank ? `#${data.pnl_rank}` : 'Unranked'

    return {
        ...base,
        title: `Wallet ${address.slice(0, 6)}... | Rank ${rank} | PnL ${pnl}`,
        description: `Sodex Mainnet wallet ${address}. Realized PnL: ${pnl}, Volume: $${vol}, Rank: ${rank}. View open positions, trade history, and performance metrics.`,
        openGraph: {
            title: `Wallet ${address.slice(0, 6)}... | Rank ${rank}`,
            description: `PnL: ${pnl} | Volume: $${vol}`,
            images: [`/tracker/${address}/opengraph-image`],
        },
    }
}

export default function WalletPage({ params }) {
    return <WalletPageClient initialAddress={params.address} />
}
