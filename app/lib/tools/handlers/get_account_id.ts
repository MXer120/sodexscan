import { perpsState } from '../../sodexApi'

/**
 * Resolve the numeric Sodex account ID (aid) for a wallet address.
 * Calls the perps state endpoint; returns null if the address has no account.
 */
export async function get_account_id({ address }: { address: string }) {
  const clean = address.trim().toLowerCase()
  const state = await perpsState(clean)
  const aid = state?.aid ?? null
  return {
    address: clean,
    account_id: aid != null ? String(aid) : null,
  }
}
