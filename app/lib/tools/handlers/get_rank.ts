// Leaderboard rank lookup across supported Sodex windows.
// Upstream: /api/v1/leaderboard/rank only supports { ALL_TIME, DAILY_24H, WEEKLY_7D, MONTHLY_30D }.

const SODEX_RANK = 'https://mainnet-data.sodex.dev/api/v1/leaderboard/rank'

const WINDOW_MAP = {
  '24h': '24H',
  '7d': '7D',
  '30d': '30D',
  'all': 'ALL_TIME',
}

async function fetchRank(wallet, sortBy, windowType) {
  try {
    const res = await fetch(`${SODEX_RANK}?window_type=${windowType}&sort_by=${sortBy}&wallet_address=${wallet}`)
    if (!res.ok) return null
    const json = await res.json()
    if (json.code !== 0 || !json.data?.found || !json.data?.item) return null
    return json.data.item
  } catch { return null }
}

interface RankResult {
  address: string
  window: string | undefined
  sort: string
  pnl_rank?: number | null
  cumulative_pnl?: number
  volume_rank?: number | null
  cumulative_volume?: number
}

export async function get_rank({ address, window, sort }: { address: string; window?: string; sort?: string }) {
  const windowType = WINDOW_MAP[window as keyof typeof WINDOW_MAP] || 'ALL_TIME'
  const sortKey = sort || 'both'

  const [pnl, vol] = await Promise.all([
    (sortKey === 'pnl' || sortKey === 'both') ? fetchRank(address, 'pnl', windowType) : Promise.resolve(null),
    (sortKey === 'volume' || sortKey === 'both') ? fetchRank(address, 'volume', windowType) : Promise.resolve(null),
  ])

  const out: RankResult = { address, window, sort: sortKey }
  if (sortKey === 'pnl' || sortKey === 'both') {
    out.pnl_rank = pnl?.rank ?? null
    out.cumulative_pnl = parseFloat(pnl?.pnl_usd ?? 0) || 0
  }
  if (sortKey === 'volume' || sortKey === 'both') {
    out.volume_rank = vol?.rank ?? null
    out.cumulative_volume = parseFloat(vol?.volume_usd ?? 0) || 0
  }
  return out
}
