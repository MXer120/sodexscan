import { fetchTokenTransfers, parseTokenAmount } from './valuescan'

export async function get_evm_token_transfers({ address, limit }) {
  const cap = Math.min(limit ?? 50, 100)
  const data = await fetchTokenTransfers(address)
  if (!data) return { error: 'Failed to fetch EVM token transfers', code: 502 }

  const transfers = (data.items ?? []).slice(0, cap).map(t => {
    const amount = parseTokenAmount(t.total?.value, t.token?.decimals)
    return {
      tx_hash: t.tx_hash ?? null,
      from: t.from?.hash ?? null,
      to: t.to?.hash ?? null,
      token_address: t.token?.address ?? null,
      token_name: t.token?.name ?? null,
      token_symbol: t.token?.symbol ?? null,
      amount,
      timestamp: t.timestamp ?? null,
    }
  })

  return {
    address,
    transfers,
    has_more: !!data.next_page_params,
  }
}
