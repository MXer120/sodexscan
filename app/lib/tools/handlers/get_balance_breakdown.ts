import { fetchWallet, priceSpotCoin, priceForCoin, normalizeCoin, getSpotPriceMap } from './walletBundle'
import { getEvmUsdTotal } from './valuescan'

const r2 = n => Math.round(n * 100) / 100

function buildSpot(rawSpot, spotPrices, markPrices) {
  return rawSpot
    .map(b => {
      const amount = parseFloat(b.balance ?? b.amount ?? 0) || 0
      const price = priceSpotCoin(b.coin, spotPrices, markPrices)
      return { coin: b.coin, amount, price: price || null, usd: r2(amount * price) }
    })
    .filter(a => a.amount > 0)
}

function buildPerps(bundle, markPrices) {
  const raw = Array.isArray(bundle.details?.balances) ? bundle.details.balances
    : Array.isArray(bundle.details?.data?.balances) ? bundle.details.data.balances : []
  return raw
    .map(b => {
      const amount = parseFloat(b.walletBalance ?? b.balance ?? b.total ?? b.amount ?? 0) || 0
      const coin = b.coin ?? b.symbol ?? '?'
      const direct = parseFloat(b.totalUsd ?? b.usdValue ?? b.valueUsd ?? 0) || 0
      let price = parseFloat(b.priceUsd ?? b.usdPrice ?? b.markPrice ?? b.price ?? 0) || 0
      if (!price) price = priceForCoin(coin, markPrices)
      const usd = direct > 0 ? r2(direct) : r2(amount * price)
      return { coin, amount, price: price || null, usd }
    })
    .filter(a => a.coin && a.coin !== '?')
}

function buildEvm(evmResult) {
  const pick = t => ({ symbol: t.symbol, amount: t.amount, price: t.price, usd: r2(t.usd), token_address: t.address })
  return {
    native: { symbol: 'SOSO', amount: evmResult.nativeAmount, price: evmResult.nativePrice, usd: r2(evmResult.nativeUsd) },
    tokens: evmResult.tokens.filter(t => t.category === 'erc20').map(pick),
    vault: evmResult.tokens.filter(t => t.category === 'lp_vault').map(pick),
    staked: evmResult.tokens.filter(t => t.category === 'staked').map(pick),
  }
}

function sum(coins) { return coins.reduce((s, c) => s + (c.usd || 0), 0) }

export async function get_balance_breakdown({ address, market }) {
  const bundle = await fetchWallet(address)
  if (!bundle.accountId) return { error: 'Wallet not found', code: 404 }

  const markPrices = bundle.markPrices || {}
  const rawSpot = bundle.balances?.data?.spotBalance ?? []

  if (market === 'spot') {
    const spotPrices = await getSpotPriceMap()
    const coins = buildSpot(rawSpot, spotPrices, markPrices)
    return { address, market, total_usd: r2(sum(coins)), coins }
  }

  if (market === 'perps') {
    const coins = buildPerps(bundle, markPrices)
    return { address, market, total_usd: r2(sum(coins)), coins }
  }

  if (market === 'evm') {
    const spotPrices = await getSpotPriceMap()
    const evmResult = await getEvmUsdTotal(address, spotPrices)
    return { address, market, total_usd: r2(evmResult.total), ...buildEvm(evmResult) }
  }

  // total — one spotPrices fetch shared across spot and EVM
  const spotPrices = await getSpotPriceMap()
  const [evmResult] = await Promise.all([getEvmUsdTotal(address, spotPrices)])
  const spotCoins = buildSpot(rawSpot, spotPrices, markPrices)
  const perpCoins = buildPerps(bundle, markPrices)
  const spotTotal = sum(spotCoins)
  const perpsTotal = sum(perpCoins)
  const evmTotal = evmResult.total

  return {
    address,
    market: 'total',
    total_usd: r2(spotTotal + perpsTotal + evmTotal),
    breakdown: { spot: r2(spotTotal), perps: r2(perpsTotal), evm: r2(evmTotal) },
    spot: spotCoins,
    perps: perpCoins,
    evm: buildEvm(evmResult),
  }
}
