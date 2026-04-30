import { supabaseAdmin } from '../../supabaseServer'

export async function get_leaderboard({ sort, limit, offset }) {
  const sortCol = sort === 'volume' ? 'cumulative_volume' : 'cumulative_pnl'
  const { data, error } = await supabaseAdmin
    .from('leaderboard_smart')
    .select('wallet_address, account_id, cumulative_pnl, cumulative_volume, unrealized_pnl, pnl_rank, volume_rank')
    .order(sortCol, { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1)
  if (error) return { error: error.message, code: 500 }
  return data ?? []
}
