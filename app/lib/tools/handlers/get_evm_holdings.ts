import { getEvmUsdTotal } from './valuescan'
import { getSpotPriceMap } from './walletBundle'

export async function get_evm_holdings({ address }) {
  const spotPrices = await getSpotPriceMap()
  const result = await getEvmUsdTotal(address, spotPrices)

  return {
    address,
    native: {
      symbol: 'SOSO',
      amount: result.nativeAmount,
      price: result.nativePrice,
      usd: result.nativeUsd,
    },
    tokens: result.tokens.filter(t => t.category === 'erc20'),
    lp_vaults: result.tokens.filter(t => t.category === 'lp_vault'),
    staked: result.tokens.filter(t => t.category === 'staked'),
    total_usd: Math.round(result.total * 100) / 100,
    updatedAt: new Date().toISOString(),
  }
}
