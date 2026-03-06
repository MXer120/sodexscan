
import { supabaseAdmin as supabase } from '../../lib/supabaseServer'
import MainnetTracker from '../../components/MainnetTracker'

export const revalidate = 60 // Revalidate metadata every minute

export async function generateMetadata({ params }) {
    const { address } = params

    // Fetch basic stats for meta tags
    const { data } = await supabase
        .from('leaderboard_smart')
        .select('pnl_rank, cumulative_pnl, cumulative_volume')
        .ilike('wallet_address', address)
        .maybeSingle()

    if (!data) {
        return {
            title: `Wallet ${address.slice(0, 6)}... | CommunityScan Sodex`,
            description: 'Analyze this wallet\'s Mainnet trading performance on Sodex.'
        }
    }

    const pnl = parseFloat(data.cumulative_pnl || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    const rank = data.pnl_rank ? `#${data.pnl_rank}` : 'Unranked'

    return {
        title: `Wallet ${address.slice(0, 6)}... | Rank ${rank} | PnL ${pnl}`,
        description: `Analyze Wallet ${address} on Sodex Mainnet. Total PnL: ${pnl}, Volume: $${parseFloat(data.cumulative_volume || 0).toLocaleString()}. View open positions and trade history.`,
        openGraph: {
            title: `Wallet ${address.slice(0, 6)}... | Rank ${rank}`,
            description: `PnL: ${pnl} | Volume: $${parseFloat(data.cumulative_volume || 0).toLocaleString()}`,
            images: [`/tracker/${address}/opengraph-image`] // Link to dynamic OG image
        }
    }
}

export default function WalletPage({ params }) {
    return (
        <div className="dashboard scanner-dashboard" style={{
            padding: '0',
            paddingTop: '44px',
            minHeight: '100vh',
            maxWidth: '100%',
            margin: '0',
            boxSizing: 'border-box'
        }}>
            <MainnetTracker walletAddress={params.address} />
        </div>
    )
}
