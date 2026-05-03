
import WalletPageClient from '../../components/WalletPageClient'

export const revalidate = 60

export async function generateMetadata({ params }) {
    const { address } = params

    const base = {
        alternates: {
            canonical: `/tracker/${address}`,
            types: { 'application/json': `/api/public/wallet/${address}` },
        },
    }

    return {
        ...base,
        title: `Wallet ${address.slice(0, 6)}... | CommunityScan Sodex`,
        description: `Analyze this wallet's Sodex Mainnet trading performance — PnL, volume, positions, and trade history.`,
    }
}

export default function WalletPage({ params }) {
    return <WalletPageClient initialAddress={params.address} />
}
