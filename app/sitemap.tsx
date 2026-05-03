
export default async function sitemap() {
    const baseUrl = 'https://www.communityscan-sodex.com'

    // Fetch top 100 wallets to include in sitemap for AI indexing
    let topWallets: { wallet_address: string }[] = []
    try {
        const res = await fetch('https://mainnet-data.sodex.dev/api/v1/leaderboard?window_type=ALL_TIME&sort_by=pnl&sort_order=desc&page=1&pageSize=100')
        if (res.ok) {
            const json = await res.json()
            topWallets = (json?.data?.items || []).map((item: { wallet_address: string }) => ({ wallet_address: item.wallet_address }))
        }
    } catch { /* ignore — sitemap degrades gracefully */ }

    const walletUrls = topWallets.map((w) => ({
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
        {
            url: `${baseUrl}/reverse-search`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.6,
        },
        {
            url: `${baseUrl}/sopoints`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.5,
        },
        {
            url: `${baseUrl}/aggregator`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.5,
        },
        {
            url: `${baseUrl}/ai`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: `${baseUrl}/impressum`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.3,
        },
        {
            url: `${baseUrl}/datenschutz`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.3,
        },
        {
            url: `${baseUrl}/terms`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.3,
        },
        ...walletUrls,
    ]
}
