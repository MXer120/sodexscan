import { useQuery } from '@tanstack/react-query'
import CoinLogo, { getBaseCoin } from '../../ui/CoinLogo'
import { SkeletonIncomingListings } from '../../Skeleton'

export default function UpcomingListingsWidget({ config }) {
  const filter = config?.filter || 'All'

  const { data = { futures: [], spot: [] }, isLoading } = useQuery({
    queryKey: ['upcoming-listings'],
    queryFn: async () => {
      const res = await fetch('https://alpha-biz.sodex.dev/biz/config/symbol')
      const json = await res.json()
      if (json.code === 0 && json.data) {
        return {
          futures: json.data.futures || [],
          spot: json.data.spot || []
        }
      }
      throw new Error('Failed to load listings')
    },
    staleTime: 30 * 60 * 1000, // 30 minutes (listings don't change often)
    gcTime: 60 * 60 * 1000,    // 60 minutes
  })

  const { futures, spot } = data

  const listings = filter === 'Spot'
    ? spot.map(s => ({ symbol: s, type: 'spot' }))
    : filter === 'Futures'
      ? futures.map(f => ({ symbol: f, type: 'futures' }))
      : [...spot.map(s => ({ symbol: s, type: 'spot' })), ...futures.map(f => ({ symbol: f, type: 'futures' }))]

  if (isLoading) return <SkeletonIncomingListings rows={6} />

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Symbol</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((item, idx) => (
            <tr key={`${item.symbol}-${item.type}`}>
              <td className="rank">{idx + 1}</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CoinLogo symbol={getBaseCoin(item.symbol)} />
                  <span>{item.symbol}</span>
                </div>
              </td>
              <td>
                <span style={{
                  padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
                  background: item.type === 'spot' ? 'rgba(49, 179, 218, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                  color: item.type === 'spot' ? 'var(--color-spot, #31b3da)' : '#3b82f6'
                }}>
                  {item.type === 'spot' ? 'Spot' : 'Futures'}
                </span>
              </td>
            </tr>
          ))}
          {listings.length === 0 && (
            <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No listings</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
