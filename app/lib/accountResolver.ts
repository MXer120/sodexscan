import { supabase } from './supabaseClient'

/**
 * Converts wallet address to Sodex ID by querying leaderboard table
 * @param address - Wallet address to lookup
 * @returns Sodex account_id or null if not found
 */
export const getSodexIdFromWallet = async (address: string): Promise<string | null> => {
  const cleanAddress = address.trim().toLowerCase()

  const { data, error } = await supabase
    .from('leaderboard')
    .select('account_id')
    .eq('wallet_address', cleanAddress)
    .maybeSingle()

  if (error) {
    console.error("Database lookup failed:", error.message)
    return null
  }

  return data?.account_id || null
}
