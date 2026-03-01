'use client'

import { useWalletData } from '../../../hooks/useWalletData'
import CoinLogo from '../../ui/CoinLogo'

function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return '-'
  const abs = Math.abs(n)
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (abs >= 1e3) return (n / 1e3).toFixed(2) + 'K'
  return Number(n).toFixed(2)
}

export default function PositionsWidget({ config, onUpdateConfig }) {
  const { data, isLoading } = useWalletData(config.walletAddress || null)

  if (!config.walletAddress) {
    return (
      <div className="agg-widget-address">
        <input placeholder="Enter wallet address..." onKeyDown={e => {
          if (e.key === 'Enter' && e.target.value.trim()) {
            onUpdateConfig({ ...config, walletAddress: e.target.value.trim() })
          }
        }} />
      </div>
    )
  }

  if (isLoading) return <div style={{ padding: 12, color: 'var(--color-text-muted)' }}>Loading...</div>

  // open positions from account_details.data.positions
  const positions = data?.data?.account_details?.data?.positions || []
  const showCoinLogos = config.showCoinLogos !== false
  const showSide = config.showSide !== false
  const showSize = config.showSize !== false
  const showEntry = config.showEntry !== false
  const showLeverage = config.showLeverage !== false
  const showMargin = config.showMargin !== false
  const showPnl = config.showPnl !== false

  if (!positions.length) {
    return <div style={{ padding: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>No open positions</div>
  }

  return (
    <div className="agg-widget-body">
      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            {showSide && <th>Side</th>}
            {showSize && <th className="text-right">Size</th>}
            {showEntry && <th className="text-right">Entry</th>}
            {showLeverage && <th className="text-right">Leverage</th>}
            {showMargin && <th className="text-right">Margin</th>}
            {showPnl && <th className="text-right">uPnL</th>}
          </tr>
        </thead>
        <tbody>
          {positions.map((p, i) => {
            const side = (p.positionSide || '').toUpperCase()
            const pnl = parseFloat(p.unrealizedProfit || 0)
            const symbol = p.symbol || ''
            return (
              <tr key={`${symbol}-${i}`}>
                <td style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {showCoinLogos && <CoinLogo symbol={symbol} size={16} />}
                  {symbol}
                </td>
                {showSide && <td style={{ color: side === 'LONG' ? 'var(--color-success)' : 'var(--color-error)' }}>
                  {side === 'LONG' ? 'Long' : 'Short'}
                </td>}
                {showSize && <td className="text-right">{fmt(parseFloat(p.positionSize))}</td>}
                {showEntry && <td className="text-right">{fmt(parseFloat(p.entryPrice))}</td>}
                {showLeverage && <td className="text-right">{p.leverage ? p.leverage + 'x' : '-'}</td>}
                {showMargin && <td className="text-right">${fmt(parseFloat(p.isolatedMargin || 0))}</td>}
                {showPnl && (
                  <td className={`text-right ${pnl > 0 ? 'positive' : pnl < 0 ? 'negative' : ''}`}>
                    ${pnl > 0 ? '+' : ''}{fmt(pnl)}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
