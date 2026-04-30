'use client'
import { useWatchlist } from '../../../hooks/useWatchlist'
import CopyableAddress from '../../ui/CopyableAddress'
import { SkeletonWidget } from '../../Skeleton'

export default function WatchlistWidget() {
  const { watchlist, isLoading, error } = useWatchlist()

  if (isLoading) return <SkeletonWidget />
  if (error) return <div style={{ padding: 12, color: 'var(--color-error)' }}>Error loading watchlist</div>
  if (!watchlist || watchlist.length === 0) {
    return <div style={{ padding: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>No wallets tracked yet</div>
  }

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>Wallet / Tag</th>
            <th>Position</th>
            <th className="text-right">PnL Rank</th>
          </tr>
        </thead>
        <tbody>
          {watchlist.slice(0, 15).map(item => (
            <tr key={item.id}>
              <td>
                {item.wallet_tags?.tag_name ? (
                  <span style={{ fontWeight: 500 }}>{item.wallet_tags.tag_name}</span>
                ) : (
                  <CopyableAddress address={item.wallet_address} />
                )}
              </td>
              <td>
                {item.current_position ? (
                  <span>
                    <span style={{ marginRight: 4 }}>{item.current_position.symbol}</span>
                    <span style={{ color: item.current_position.position_side === 'LONG' ? 'var(--color-success)' : 'var(--color-error)', fontSize: 11 }}>
                      {item.current_position.position_side}
                    </span>
                  </span>
                ) : '-'}
              </td>
              <td className="text-right">
                {item.leaderboard?.pnl_rank != null ? `#${item.leaderboard.pnl_rank}` : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {watchlist.length > 15 && (
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8, textAlign: 'center' }}>
          +{watchlist.length - 15} more
        </div>
      )}
    </div>
  )
}
