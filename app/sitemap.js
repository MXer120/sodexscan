
import { createClient } from '@supabase/supabase-js'

export default async function sitemap() {
    const baseUrl = 'https://www.communityscan-sodex.com'

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Fetch top 100 wallets to include in sitemap for AI indexing
    const { data: topWallets } = await supabase
        .from('leaderboard_smart')
        .select('wallet_address')
        .order('cumulative_pnl', { ascending: false })
        .limit(100)

    const walletUrls = (topWallets || []).map((w) => ({
        url: `${baseUrl}/tracker/${w.wallet_address}`,
        lastModified: new Date(),
        changeFrequency: 'hourly',
        priority: 0.8,
    }))

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/mainnet`,
            lastModified: new Date(),
            changeFrequency: 'always',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/tracker`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.7,
        },
        ...walletUrls,
    ]
}
