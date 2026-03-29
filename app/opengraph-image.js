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
                    background: '#0A0A0A',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'sans-serif',
                    color: '#ffffff',
                    padding: '60px',
                    position: 'relative',
                }}
            >
                {/* Subtle gradient glow behind logo */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -60%)',
                    width: 500,
                    height: 500,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(72,203,255,0.08) 0%, transparent 70%)',
                    display: 'flex',
                }} />

                {/* Logo icon (favicon paths rendered as SVG) */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
                    <svg width="72" height="72" viewBox="0 0 32 32" fill="none" style={{ marginRight: 24 }}>
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
                    <div style={{ fontSize: 48, fontWeight: 'bold', letterSpacing: '-0.5px' }}>
                        CommunityScan
                    </div>
                </div>

                <div style={{
                    fontSize: 22,
                    color: 'rgba(255,255,255,0.5)',
                    marginBottom: 48,
                    textAlign: 'center',
                    maxWidth: 700,
                    lineHeight: 1.5,
                }}>
                    Real-time Data Intelligence for Sodex Mainnet Trading
                </div>

                <div style={{ display: 'flex', gap: 24 }}>
                    {[
                        { label: 'Wallet Scanner', desc: 'Track any wallet' },
                        { label: 'PnL Rankings', desc: 'Leaderboard data' },
                        { label: 'Trade Analysis', desc: 'Position insights' },
                    ].map((item) => (
                        <div key={item.label} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            background: 'rgba(72,203,255,0.06)',
                            border: '1px solid rgba(72,203,255,0.15)',
                            borderRadius: 12,
                            padding: '20px 36px',
                            minWidth: 200,
                        }}>
                            <div style={{ fontSize: 17, fontWeight: 700, color: '#48cbff', marginBottom: 4 }}>{item.label}</div>
                            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>{item.desc}</div>
                        </div>
                    ))}
                </div>

                <div style={{
                    position: 'absolute',
                    bottom: 28,
                    fontSize: 15,
                    color: 'rgba(255,255,255,0.25)',
                    letterSpacing: '0.5px',
                }}>
                    communityscan-sodex.com
                </div>
            </div>
        ),
        { ...size }
    )
}
