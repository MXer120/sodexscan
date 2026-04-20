import { supabase } from './supabaseClient'

/**
 * Converts wallet address to Sodex ID by querying leaderboard table
 * @param address - Wallet address to lookup
 * @returns Sodex account_id or null if not found
 */
export const getSodexIdFromWallet = async (address: string): Promise<string | null> => {
  const cleanAddress = address.trim().toLowerCase()

  // Try account_mapping first (canonical wallet→account_id table)
  const { data: mappingData } = await supabase
    .from('account_mapping')
    .select('account_id')
    .eq('wallet_address', cleanAddress)
    .maybeSingle()

  if (mappingData?.account_id) return mappingData.account_id

  // Try leaderboard (exact match, lowercase)
  const { data, error } = await supabase
    .from('leaderboard')
    .select('account_id')
    .eq('wallet_address', cleanAddress)
    .maybeSingle()

  if (data?.account_id) return data.account_id

  // Fallback: try leaderboard_smart view (may have different filters)
  const { data: smartData } = await supabase
    .from('leaderboard_smart')
    .select('account_id')
    .ilike('wallet_address', cleanAddress)
    .maybeSingle()

  if (smartData?.account_id) return smartData.account_id

  if (error) {
    console.error("Database lookup failed:", error.message)
  }

  return null
}
