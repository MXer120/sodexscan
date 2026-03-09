import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'CommunityScan Sodex — Real-time Trading Intelligence'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'sans-serif',
                    color: 'white',
                    padding: '60px',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 30 }}>
                    <div style={{
                        width: 70,
                        height: 70,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #48cbff, #0891b2)',
                        marginRight: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 36,
                        fontWeight: 'bold',
                        boxShadow: '0 0 40px rgba(72,203,255,0.3)',
                    }}>S</div>
                    <div style={{ fontSize: 48, fontWeight: 'bold' }}>CommunityScan Sodex</div>
                </div>

                <div style={{
                    fontSize: 24,
                    color: 'rgba(255,255,255,0.6)',
                    marginBottom: 50,
                    textAlign: 'center',
                    maxWidth: '800px',
                    lineHeight: 1.4,
                }}>
                    Real-time Data Intelligence for Sodex Mainnet Trading
                </div>

                <div style={{ display: 'flex', gap: 40 }}>
                    {[
                        { label: 'Wallet Tracking', icon: '&#128270;' },
                        { label: 'PnL Rankings', icon: '&#128200;' },
                        { label: 'Trade Analysis', icon: '&#128202;' },
                    ].map((item) => (
                        <div key={item.label} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            background: 'rgba(72,203,255,0.08)',
                            border: '1px solid rgba(72,203,255,0.2)',
                            borderRadius: 16,
                            padding: '24px 40px',
                            minWidth: 200,
                        }}>
                            <div style={{ fontSize: 18, fontWeight: 600, color: '#48cbff' }}>{item.label}</div>
                        </div>
                    ))}
                </div>

                <div style={{
                    position: 'absolute',
                    bottom: 30,
                    fontSize: 16,
                    color: 'rgba(255,255,255,0.3)',
                }}>
                    communityscan-sodex.com
                </div>
            </div>
        ),
        { ...size }
    )
}
