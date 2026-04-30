// Shared helpers for the ValueChain block explorer (Blockscout v2.3.5).
// Base: https://main-scan.valuechain.xyz/api/v2/
//
// Pricing strategy for on-chain assets:
//   - Native SOSO  → Sodex spot market WSOSO_vUSDC (the chain's wrapped SOSO ticker).
//                    This is MORE accurate than the perps `SOSO-USD` mark price, which
//                    tracks a different product (SoSoValue perpetual on a separate book).
//   - sSOSO        → 1:1 with SOSO (standard staking wrapper). Priced via WSOSO_vUSDC.
//   - LP vault (vsX.SLP) → underlying spot ticker vXssi_vUSDC when available.
//   - Generic ERC-20 → valuescan `exchange_rate` if provided, else unpriced.

const BASE = 'https://main-scan.valuechain.xyz/api/v2'

async function fetchJson(url) {
  try {
    const res = await fetch(url, { next: { revalidate: 60 } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export function parseTokenAmount(rawValue, decimals) {
  const d = parseInt(decimals) || 18
  if (!rawValue) return 0
  try {
    const asBig = BigInt(rawValue)
    const divisor = BigInt(10) ** BigInt(d)
    const whole = asBig / divisor
    const frac = asBig % divisor
    return Number(whole) + Number(frac) / Number(divisor)
  } catch {
    return parseFloat(rawValue) / Math.pow(10, d)
  }
}

export function classifyToken(name = '', symbol = '') {
  const s = (symbol || '').toUpperCase()
  const n = (name || '').toLowerCase()
  if (n.includes('sodex lp vault') || (s.startsWith('VS') && s.endsWith('.SLP'))) return 'lp_vault'
  if (n.startsWith('staked ') || s === 'SSOSO' || (s.startsWith('VS') && s.endsWith('.SSI'))) return 'staked'
  return 'erc20'
}

// vsMAG7.SLP → VMAG7SSI_VUSDC  (SLP = SoDex LP for vX.ssi)
// NOTE: spot map keys are UPPERCASED (see getSpotPriceMap).
function lpVaultSpotSymbol(slpSymbol = '') {
  const m = /^vs([A-Za-z0-9]+)\.SLP$/i.exec(slpSymbol)
  if (!m) return null
  return `V${m[1].toUpperCase()}SSI_VUSDC`
}

// All valuescan exchange_rates are null — price everything via spot map.
// Strip non-alphanumeric chars so vDEFI.ssi → VDEFISSI, vMAG7.ssi → VMAG7SSI.
const EVM_STABLES = new Set(['VUSDC', 'VUSDT', 'USDC', 'USDT', 'TUSDC'])
function priceOnChainAsset({ category, symbol }, spotPrices) {
  const s = (symbol || '').toUpperCase()
  if (EVM_STABLES.has(s)) return 1
  if (s === 'SOSO' || s === 'WSOSO' || s === 'SSOSO') {
    return parseFloat(spotPrices['WSOSO_VUSDC']) || 0
  }
  if (category === 'lp_vault') {
    const lookup = lpVaultSpotSymbol(symbol)
    if (lookup) return parseFloat(spotPrices[lookup]) || 0
  }
  // Generic: clean symbol and try spot ticker (vETH→VETH_VUSDC, vDEFI.ssi→VDEFISSI_VUSDC)
  const clean = s.replace(/[^A-Z0-9]/g, '')
  return parseFloat(spotPrices[`${clean}_VUSDC`] || spotPrices[`${clean}_USDC`]) || 0
}

export async function fetchAddressInfo(address) {
  return fetchJson(`${BASE}/addresses/${address}`)
}

export async function fetchErc20Balances(address) {
  const data = await fetchJson(`${BASE}/addresses/${address}/tokens?type=ERC-20`)
  return data?.items ?? []
}

export async function fetchTransactions(address) {
  return fetchJson(`${BASE}/addresses/${address}/transactions`)
}

export async function fetchTokenTransfers(address) {
  return fetchJson(`${BASE}/addresses/${address}/token-transfers?type=ERC-20`)
}

// Returns full EVM USD breakdown. `spotPrices` is the SoDex spot ticker map
// (WSOSO_vUSDC, vMAG7ssi_vUSDC, etc.) — the source of truth for on-chain prices.
export async function getEvmUsdTotal(address, spotPrices = {}) {
  const [info, erc20Items] = await Promise.all([
    fetchAddressInfo(address),
    fetchErc20Balances(address),
  ])

  const sosoSpot = parseFloat(spotPrices['WSOSO_VUSDC']) || 0

  const nativeAmount = parseFloat(info?.coin_balance || 0) / 1e18
  // Prefer valuescan's exchange_rate if valuescan has one; fall back to SoDex spot WSOSO.
  const nativePrice = parseFloat(info?.exchange_rate) || sosoSpot
  const nativeUsd = nativePrice > 0 ? nativeAmount * nativePrice : 0

  const tokens = erc20Items.map(item => {
    const amount = parseTokenAmount(item.value, item.token?.decimals)
    const name = item.token?.name ?? ''
    const symbol = item.token?.symbol ?? ''
    const category = classifyToken(name, symbol)

    // Price resolution precedence:
    //   1. valuescan exchange_rate
    //   2. on-chain SoDex spot price (SOSO/sSOSO/LP vaults)
    //   3. unpriced → 0
    let price = parseFloat(item.token?.exchange_rate) || 0
    let priceSource = price > 0 ? 'valuescan' : null
    if (price === 0) {
      const onChainPrice = priceOnChainAsset({ category, symbol }, spotPrices)
      if (onChainPrice > 0) {
        price = onChainPrice
        priceSource = category === 'lp_vault' ? 'sodex_spot_underlying' : 'sodex_spot'
      }
    }
    const usd = price > 0 ? amount * price : 0

    return {
      address: item.token?.address,
      name,
      symbol,
      amount,
      decimals: parseInt(item.token?.decimals) || 18,
      price: price || null,
      price_source: priceSource,
      usd,
      category,
    }
  })

  const tokenUsd = tokens.reduce((s, t) => s + t.usd, 0)
  const lpVaults = tokens.filter(t => t.category === 'lp_vault')
  const staked = tokens.filter(t => t.category === 'staked')

  const summary = {
    native: { symbol: 'SOSO', amount: nativeAmount, price: nativePrice || null, usd: nativeUsd, price_source: info?.exchange_rate ? 'valuescan' : (sosoSpot > 0 ? 'sodex_spot' : null) },
    lp_vault_count: lpVaults.length,
    staked_count: staked.length,
    erc20_count: tokens.length - lpVaults.length - staked.length,
    priced_tokens_usd: tokenUsd,
  }

  return {
    nativeAmount,
    nativePrice: nativePrice || null,
    nativeUsd,
    tokens,
    tokenUsd,
    total: nativeUsd + tokenUsd,
    summary,
  }
}
