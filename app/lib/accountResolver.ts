import { supabase } from './supabaseClient'
import { perpsState } from './sodexApi'

/**
 * Converts wallet address to Sodex ID
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

  // Fallback: resolve via gateway API
  try {
    const state = await perpsState(cleanAddress)
    if (state?.aid != null) return String(state.aid)
  } catch (err) {
    console.error('perpsState lookup failed:', err)
  }

  return null
}
