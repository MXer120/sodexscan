/**
 * Load weekly leaderboard data.
 * - Week 0 (current live): Supabase RPC
 * - Week >= 1 (historical): Static JSON from GitHub CDN
 */

// Served from same Vercel deployment (public/ dir) — no CORS, CDN cached
const RAW_BASE = '/data/leaderboard'

// In-memory cache for historical weeks (immutable data, cache forever)
const weekCache = new Map()

/**
 * Fetch historical week JSON from GitHub raw CDN.
 * Returns { week, rows } where rows match the RPC format.
 */
export async function fetchHistoricalWeek(weekNumber) {
  if (weekCache.has(weekNumber)) return weekCache.get(weekNumber)

  const url = `${RAW_BASE}/week-${weekNumber}.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch week ${weekNumber}: ${res.status}`)

  const data = await res.json()

  // Expand compact keys to match RPC output format.
  // For weeks where sodex data wasn't synced yet (weeks 1-4),
  // fall back sodex fields to futures values so display isn't $0.
  const rows = data.rows.map(r => {
    const hasSodexPnl = r.sp !== 0
    return {
      account_id: r.a,
      wallet_address: r.w,
      weekly_pnl: r.pnl,
      weekly_volume: r.vol,
      unrealized_pnl: r.upnl,
      pnl_rank: r.pr,
      volume_rank: r.vr,
      weekly_sodex_volume: r.sv || r.vol,
      weekly_sodex_pnl: hasSodexPnl ? r.sp : r.pnl,
      weekly_spot_volume: r.spv,
      weekly_spot_pnl: hasSodexPnl ? r.spp : 0,
      is_sodex_owned: r.sox === 1
    }
  })

  const result = { week: data.week, rows, count: rows.length }
  weekCache.set(weekNumber, result)
  return result
}

/**
 * Query historical week data with same interface as RPC.
 * Sorting, filtering, pagination all done client-side.
 */
export function queryHistoricalWeek(weekData, { sort = 'volume', limit = 20, offset = 0, excludeSodex = true }) {
  let rows = weekData.rows

  if (excludeSodex) {
    rows = rows.filter(r => !r.is_sodex_owned)
  }

  // Sort
  const sortFn = getSortFn(sort)
  rows = [...rows].sort(sortFn)

  const totalCount = rows.length

  // Paginate
  const page = rows.slice(offset, offset + limit)

  return { rows: page, totalCount }
}

function getSortFn(sort) {
  switch (sort) {
    case 'pnl':
      // Use pnl_rank if available, else sort by actual PnL value DESC
      return (a, b) => {
        if (a.pnl_rank && b.pnl_rank) return a.pnl_rank - b.pnl_rank
        return (b.weekly_pnl || 0) - (a.weekly_pnl || 0)
      }
    case 'volume':
    case 'futures_volume':
      return (a, b) => {
        if (a.volume_rank && b.volume_rank) return a.volume_rank - b.volume_rank
        return (b.weekly_volume || 0) - (a.weekly_volume || 0)
      }
    case 'spot_volume':
      return (a, b) => (b.weekly_spot_volume || 0) - (a.weekly_spot_volume || 0)
    case 'total_pnl':
      return (a, b) => (b.weekly_sodex_pnl || 0) - (a.weekly_sodex_pnl || 0)
    case 'spot_pnl':
      return (a, b) => (b.weekly_spot_pnl || 0) - (a.weekly_spot_pnl || 0)
    default:
      return (a, b) => {
        if (a.volume_rank && b.volume_rank) return a.volume_rank - b.volume_rank
        return (b.weekly_volume || 0) - (a.weekly_volume || 0)
      }
  }
}

/**
 * Find a wallet in historical week data (for "Your Row").
 */
export function findWalletInWeek(weekData, walletAddress) {
  if (!weekData || !walletAddress) return null
  const lower = walletAddress.toLowerCase()
  return weekData.rows.find(r => r.wallet_address?.toLowerCase() === lower) || null
}

/**
 * Clear cache (if needed, e.g., dev).
 */
export function clearWeekCache() {
  weekCache.clear()
}
