import { fetchWallet, priceSpotCoin, normalizeCoin, getSpotPriceMap } from './walletBundle'
import { getEvmUsdTotal } from './valuescan'

function sumSpotUsd(spotItems, spotPrices, markPrices) {
  if (!Array.isArray(spotItems)) return 0
  let total = 0
  for (const bal of spotItems) {
    const amount = parseFloat(bal.balance) || 0
    if (!amount) continue
    const price = priceSpotCoin(bal.coin, spotPrices, markPrices)
    total += amount * price
  }
  return total
}

function futuresUsd(details) {
  const v = details?.data?.balances?.[0]?.walletBalance ?? details?.balances?.[0]?.walletBalance
  return parseFloat(v) || 0
}

function pickToken(t) {
  return { symbol: t.symbol, amount: t.amount, price: t.price, usd: round2(t.usd), token_address: t.address }
}

export async function get_balance({ address, market }) {
  const bundle = await fetchWallet(address)
  if (!bundle.accountId) return { error: 'Wallet not found', code: 404 }

  const markPrices = bundle.markPrices || {}
  const spotItems = bundle.balances?.data?.spotBalance ?? []
  const perpsUsd = futuresUsd(bundle.details)

  if (market === 'spot') {
    const spotPrices = await getSpotPriceMap()
    return { address, market, balance: round2(sumSpotUsd(spotItems, spotPrices, markPrices)), currency: 'USD', updatedAt: new Date().toISOString() }
  }

  if (market === 'perps') {
    return { address, market, balance: round2(perpsUsd), currency: 'USD', updatedAt: new Date().toISOString() }
  }

  if (market === 'evm') {
    const spotPrices = await getSpotPriceMap()
    const evm = await getEvmUsdTotal(address, spotPrices)
    return {
      address, market,
      balance: round2(evm.total),
      currency: 'USD',
      native: { symbol: 'SOSO', amount: evm.nativeAmount, price: evm.nativePrice, usd: round2(evm.nativeUsd) },
      evm: evm.tokens.filter(t => t.category === 'erc20').map(pickToken),
      vault: evm.tokens.filter(t => t.category === 'lp_vault').map(pickToken),
      staked: evm.tokens.filter(t => t.category === 'staked').map(pickToken),
      updatedAt: new Date().toISOString(),
    }
  }

  // total — one spotPrices fetch shared by spot and EVM
  const spotPrices = await getSpotPriceMap()
  const spotUsd = sumSpotUsd(spotItems, spotPrices, markPrices)
  const evm = await getEvmUsdTotal(address, spotPrices)
  const total = spotUsd + perpsUsd + evm.total
  return {
    address,
    market: 'total',
    balance: round2(total),
    currency: 'USD',
    breakdown: { spot: round2(spotUsd), perps: round2(perpsUsd), evm: round2(evm.total) },
    updatedAt: new Date().toISOString(),
  }
}

function round2(n) { return Math.round(n * 100) / 100 }
