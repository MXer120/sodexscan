import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Wallet Performance Card'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }) {
    const { address } = params

    let pnl = 0
    let rankNum: number | null = null
    let volumeNum = 0
    try {
        const res = await fetch(`https://mainnet-data.sodex.dev/api/v1/leaderboard/rank?window_type=ALL_TIME&sort_by=pnl&wallet_address=${address}`)
        if (res.ok) {
            const json = await res.json()
            const d = json?.data
            if (d) {
                pnl = parseFloat(d.pnl_usd || 0)
                rankNum = d.rank ?? null
                volumeNum = parseFloat(d.volume_usd || 0)
            }
        }
    } catch { /* gracefully show zeros */ }

    const isPositive = pnl >= 0
    const pnlStr = pnl.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    const rank = rankNum ? `#${rankNum}` : 'Unranked'
    const volume = volumeNum.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

    return new ImageResponse(
        (
            <div
                style={{
                    background: '#0A0A0A',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'sans-serif',
                    color: 'white',
                    padding: '50px',
                    position: 'relative',
                }}
            >
                {/* Header with favicon */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36 }}>
                    <svg width="48" height="48" viewBox="0 0 32 32" fill="none" style={{ marginRight: 16 }}>
                        <path d="M3 11V5.5C3 4.12 4.12 3 5.5 3H11" stroke="#48cbff" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M21 3H26.5C27.88 3 29 4.12 29 5.5V11" stroke="#48cbff" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M29 21V26.5C29 27.88 27.88 29 26.5 29H21" stroke="#48cbff" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M11 29H5.5C4.12 29 3 27.88 3 26.5V21" stroke="#48cbff" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M14.5 21.5H11.75C11.06 21.5 10.5 20.94 10.5 20.25V17.5" stroke="#48cbff" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M17.5 21.5H20.25C20.94 21.5 21.5 20.94 21.5 20.25V17.5" stroke="#48cbff" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M13.5 21.5H16.25" stroke="#48cbff" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M14.49 10.5H11.74C11.05 10.5 10.49 11.06 10.49 11.75V14.5" stroke="#48cbff" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M17.49 10.5H20.24C20.93 10.5 21.49 11.06 21.49 11.75V14.5" stroke="#48cbff" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M7.5 17.5H10.25" stroke="#48cbff" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M24.64 17.5H21.89" stroke="#48cbff" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M11.5 17.5H18.14" stroke="#48cbff" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M13.5 10.5H16.25" stroke="#48cbff" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <div style={{ fontSize: 32, fontWeight: 'bold', color: '#fff' }}>CommunityScan</div>
                </div>

                {/* Wallet card */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: 'rgba(72,203,255,0.04)',
                    padding: '36px 56px',
                    borderRadius: 16,
                    border: '1px solid rgba(72,203,255,0.12)',
                }}>
                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 8, letterSpacing: '1.5px', fontWeight: 600 }}>WALLET PROFILE</div>
                    <div style={{ fontSize: 36, fontWeight: 'bold', fontFamily: 'monospace', marginBottom: 32, color: 'rgba(255,255,255,0.85)' }}>
                        {address.slice(0, 8)}...{address.slice(-8)}
                    </div>

                    <div style={{ display: 'flex', gap: 48 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600 }}>RANK</div>
                            <div style={{ fontSize: 44, fontWeight: 'bold', color: '#48cbff' }}>{rank}</div>
                        </div>

                        <div style={{ width: 1, background: 'rgba(255,255,255,0.08)', display: 'flex' }} />

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600 }}>REALIZED PNL</div>
                            <div style={{ fontSize: 44, fontWeight: 'bold', color: isPositive ? '#22c55e' : '#ef4444' }}>
                                {isPositive ? '+' : ''}{pnlStr}
                            </div>
                        </div>

                        <div style={{ width: 1, background: 'rgba(255,255,255,0.08)', display: 'flex' }} />

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600 }}>VOLUME</div>
                            <div style={{ fontSize: 44, fontWeight: 'bold', color: '#fff' }}>{volume}</div>
                        </div>
                    </div>
                </div>

                <div style={{
                    position: 'absolute',
                    bottom: 28,
                    fontSize: 14,
                    color: 'rgba(255,255,255,0.2)',
                    letterSpacing: '0.5px',
                }}>
                    communityscan-sodex.com
                </div>
            </div>
        ),
        { ...size }
    )
}
