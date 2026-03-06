
import { ImageResponse } from 'next/og'
import { supabaseAdmin as supabase } from '../../lib/supabaseServer'

export const runtime = 'edge'
export const alt = 'Wallet Performance Card'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }) {
    const { address } = params

    const { data } = await supabase
        .from('leaderboard_smart')
        .select('pnl_rank, cumulative_pnl, cumulative_volume, win_rate')
        .ilike('wallet_address', address)
        .maybeSingle()

    // Default values if not found using Sodex branding colors
    const pnl = data ? parseFloat(data.cumulative_pnl || 0) : 0
    const isPositive = pnl >= 0
    const pnlStr = pnl.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    const rank = data?.pnl_rank ? `#${data.pnl_rank}` : 'Unranked'
    const volume = data ? parseFloat(data.cumulative_volume || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '$0.00'

    return new ImageResponse(
        (
            <div
                style={{
                    background: 'linear-gradient(to bottom right, #0f0f0f, #1a1a1a)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'sans-serif',
                    color: 'white',
                    border: '20px solid rgba(255,255,255,0.05)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 40 }}>
                    {/* Simulate Logo */}
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#48cbff', marginRight: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 'bold' }}>S</div>
                    <div style={{ fontSize: 40, fontWeight: 'bold', color: '#fff' }}>CommunityScan Sodex</div>
                </div>

                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.03)',
                    padding: '40px 60px',
                    borderRadius: 20,
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                }}>
                    <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>WALLET PROFILE</div>
                    <div style={{ fontSize: 48, fontWeight: 'bold', fontFamily: 'monospace', marginBottom: 40, color: '#e0e0e0' }}>
                        {address.slice(0, 8)}...{address.slice(-8)}
                    </div>

                    <div style={{ display: 'flex', gap: 60 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.5)', marginBottom: 5 }}>RANK</div>
                            <div style={{ fontSize: 60, fontWeight: 'bold', color: '#fff' }}>{rank}</div>
                        </div>

                        <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }}></div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.5)', marginBottom: 5 }}>REALIZED PNL</div>
                            <div style={{ fontSize: 60, fontWeight: 'bold', color: isPositive ? '#33AF80' : '#DB324D' }}>
                                {isPositive ? '+' : ''}{pnlStr}
                            </div>
                        </div>

                        <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }}></div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.5)', marginBottom: 5 }}>VOLUME</div>
                            <div style={{ fontSize: 60, fontWeight: 'bold', color: '#fff' }}>{volume}</div>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: 40, fontSize: 20, color: 'rgba(255,255,255,0.4)' }}>
                    Mainnet Verified Data • Last Updated {new Date().toLocaleDateString()}
                </div>
            </div>
        ),
        {
            ...size,
        }
    )
}
