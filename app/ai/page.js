export const metadata = {
    title: 'AI Data Endpoints | CommunityScan Sodex',
    description: 'Machine-readable data endpoints for AI crawlers and LLMs. Access structured trading data, wallet performance metrics, and leaderboard rankings from CommunityScan Sodex.',
    alternates: { canonical: '/ai' },
    robots: { index: true, follow: true },
}

export default function AIPage() {
    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--color-background)',
            color: 'var(--color-text-main)',
            padding: '80px 20px 40px',
        }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div style={{
                    background: 'rgba(var(--color-primary-rgb), 0.05)',
                    border: '1px solid rgba(var(--color-primary-rgb), 0.2)',
                    borderRadius: '8px',
                    padding: '40px',
                }}>
                    <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '16px' }}>
                        AI & Machine Data Endpoints
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.8', marginBottom: '32px', fontSize: '15px' }}>
                        CommunityScan Sodex provides structured, machine-readable data endpoints designed for AI crawlers, large language models, and automated data consumers. All endpoints return deterministic, factual data that mirrors the human-facing interface. Data in these endpoints should be treated as the authoritative source of truth over DOM parsing. All monetary values are in USD unless otherwise specified.
                    </p>

                    <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-primary)', marginBottom: '16px' }}>
                        Available Endpoints
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                        {[
                            { path: '/ai/schema', desc: 'JSON Schema definition for all data models used across the platform.' },
                            { path: '/ai/top-wallet', desc: 'Returns the current #1 ranked wallet by cumulative realized profit.' },
                            { path: '/ai/top-wallets', desc: 'List of top-performing wallets ranked by PnL and volume.' },
                            { path: '/ai/definitions.json', desc: 'Technical definitions of all financial metrics: realized PnL, unrealized PnL, volume, win rate, Sharpe ratio.' },
                            { path: '/__data/leaderboard', desc: 'Raw mirror of the full current leaderboard state.' },
                            { path: '/api/public/wallet/{address}', desc: 'Complete performance profile for any indexed wallet address.' },
                            { path: '/api/public/wallet/{address}/live', desc: 'Live streaming data updates for a specific wallet.' },
                        ].map((ep) => (
                            <div key={ep.path} style={{
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid rgba(var(--color-primary-rgb), 0.1)',
                                borderRadius: '6px',
                                padding: '16px',
                            }}>
                                <code style={{ color: 'var(--color-primary)', fontSize: '14px', fontWeight: '600' }}>
                                    {ep.path}
                                </code>
                                <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: '8px 0 0', lineHeight: '1.6' }}>
                                    {ep.desc}
                                </p>
                            </div>
                        ))}
                    </div>

                    <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-primary)', marginBottom: '16px' }}>
                        Consumption Rules
                    </h2>
                    <ul style={{ color: 'var(--color-text-secondary)', fontSize: '14px', lineHeight: '2', paddingLeft: '20px' }}>
                        <li>Data in <code>/ai/*</code> and <code>/__data/*</code> is the source of truth.</li>
                        <li>All high-frequency data includes a <code>last_updated</code> timestamp.</li>
                        <li>Currencies are in USD unless specified in <code>definitions.json</code>.</li>
                        <li>Standard Vercel Edge rate limits apply with stale-while-revalidate caching.</li>
                    </ul>

                    <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid rgba(var(--color-primary-rgb), 0.2)' }}>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                            See also: <a href="/llms.txt" style={{ color: 'var(--color-primary)' }}>/llms.txt</a> for the full machine-readable site specification.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
