import { fetchTransactions } from './valuescan'

export async function get_evm_transactions({ address, limit }) {
  const cap = Math.min(limit ?? 25, 50)
  const data = await fetchTransactions(address)
  if (!data) return { error: 'Failed to fetch EVM transactions', code: 502 }

  const transactions = (data.items ?? []).slice(0, cap).map(tx => ({
    hash: tx.hash,
    type: tx.tx_types?.[0] ?? 'unknown',
    from: tx.from?.hash ?? null,
    to: tx.to?.hash ?? null,
    value_native: parseFloat(tx.value ?? 0) / 1e18,
    timestamp: tx.timestamp ?? null,
    status: tx.status ?? null,
    method: tx.method ?? null,
    fee_native: parseFloat(tx.fee?.value ?? 0) / 1e18,
  }))

  return {
    address,
    transactions,
    has_more: !!data.next_page_params,
  }
}
