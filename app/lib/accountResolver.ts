import { supabase } from './supabaseClient'

/**
 * Converts wallet address to Sodex ID by querying leaderboard table
 * @param address - Wallet address to lookup
 * @returns Sodex account_id or null if not found
 */
export const getSodexIdFromWallet = async (address: string): Promise<string | null> => {
  // Trim whitespace to prevent "not found" from accidental spaces
  const cleanAddress = address.trim()

  // Use ilike for case-insensitive exact match (handles mixed case addresses)
  const { data, error } = await supabase
    .from('leaderboard')
    .select('account_id')
    .ilike('wallet_address', cleanAddress)
    .maybeSingle() // Gets one result or null

  if (error) {
    console.error("Database lookup failed:", error.message)
    return null
  }

  return data?.account_id || null
}
