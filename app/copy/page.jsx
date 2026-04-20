import CopyLeaderboard from '../components/copy/CopyLeaderboard'

export const metadata = {
  title: 'Copy-Trade Signals | CommunityScan SoDEX',
  description: 'Follow top Sodex traders and receive real-time signals when they open or close positions. Simulated copy-trade leaderboard — not financial advice.',
}

export default function CopyPage() {
  return (
    <div className="dashboard" style={{ padding: '24px 20px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>Copy-Trade Signals</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, maxWidth: 600 }}>
          Follow any top trader to receive instant Telegram or Discord signals when they open or close a position.
          Rankings below are based on hypothetical simulated trades — no real orders are placed on your behalf.
        </p>
      </div>
      <CopyLeaderboard />
    </div>
  )
}
