/**
 * Centralized Sodex Official Gateway API helpers.
 * Based on official docs: mainnet-gw.sodex.dev/api/v1/{spot|perps}/...
 *
 * All public read endpoints — no auth required.
 */

const PERPS = 'https://mainnet-gw.sodex.dev/api/v1/perps'
const SPOT  = 'https://mainnet-gw.sodex.dev/api/v1/spot'

interface HistoryOpts {
  symbol?: string
  startTime?: string | number
  endTime?: string | number
  limit?: number
}

// ─── Generic fetch with error handling ───
async function gw(url: string, opts: RequestInit = {}) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    ...opts,
  })
  if (!res.ok) throw new Error(`Sodex API ${res.status}: ${url}`)
  const json = await res.json()
  if (json.code !== undefined && json.code !== 0) {
    throw new Error(json.error || `Sodex API error code ${json.code}`)
  }
  return json.data ?? json
}

// ═══════════════════════════════════════
//  PERPS — Market Data
// ═══════════════════════════════════════

/** All perps symbols + config */
export const perpsSymbols = () => gw(`${PERPS}/markets/symbols`)

/** All perps tickers (24h stats) */
export const perpsTickers = () => gw(`${PERPS}/markets/tickers`)

/** All perps mini tickers */
export const perpsMiniTickers = () => gw(`${PERPS}/markets/miniTickers`)

/** All mark prices */
export const perpsMarkPrices = () => gw(`${PERPS}/markets/mark-prices`)

/** All book tickers (best bid/ask) */
export const perpsBookTickers = () => gw(`${PERPS}/markets/bookTickers`)

/** Order book for a symbol */
export const perpsOrderbook = (symbol, limit = 20) =>
  gw(`${PERPS}/markets/${symbol}/orderbook?limit=${limit}`)

/** Klines/candles */
export const perpsKlines = (symbol, interval = '1h', limit = 100) =>
  gw(`${PERPS}/markets/${symbol}/klines?interval=${interval}&limit=${limit}`)

/** Recent market trades */
export const perpsRecentTrades = (symbol, limit = 50) =>
  gw(`${PERPS}/markets/${symbol}/trades?limit=${limit}`)

/** All coins/assets */
export const perpsCoins = () => gw(`${PERPS}/markets/coins`)

// ═══════════════════════════════════════
//  PERPS — Account Data (by wallet address)
// ═══════════════════════════════════════

/** Perps account balances (equity, margin, etc.) */
export const perpsBalances = (address) =>
  gw(`${PERPS}/accounts/${address}/balances`)

/** Open perps positions */
export const perpsPositions = (address) =>
  gw(`${PERPS}/accounts/${address}/positions`)

/** Open perps orders */
export const perpsOrders = (address, symbol?: string) =>
  gw(`${PERPS}/accounts/${address}/orders${symbol ? `?symbol=${symbol}` : ''}`)

/** Full frontend state (balances + positions + orders) */
export const perpsState = (address) =>
  gw(`${PERPS}/accounts/${address}/state`)

/** Fee rate */
export const perpsFeeRate = (address, symbol) =>
  gw(`${PERPS}/accounts/${address}/fee-rate?symbol=${symbol}`)

/** Order history */
export const perpsOrderHistory = (address: string, { symbol, startTime, endTime, limit = 100 }: HistoryOpts = {}) => {
  const params = new URLSearchParams()
  if (symbol) params.set('symbol', symbol)
  if (startTime) params.set('startTime', String(startTime))
  if (endTime) params.set('endTime', String(endTime))
  params.set('limit', String(limit))
  return gw(`${PERPS}/accounts/${address}/orders/history?${params}`)
}

/** Position history (closed positions) */
export const perpsPositionHistory = (address: string, { symbol, startTime, endTime, limit = 100 }: HistoryOpts = {}) => {
  const params = new URLSearchParams()
  if (symbol) params.set('symbol', symbol)
  if (startTime) params.set('startTime', String(startTime))
  if (endTime) params.set('endTime', String(endTime))
  params.set('limit', String(limit))
  return gw(`${PERPS}/accounts/${address}/positions/history?${params}`)
}

/** Trade fills */
export const perpsTrades = (address: string, { symbol, startTime, endTime, limit = 100 }: HistoryOpts = {}) => {
  const params = new URLSearchParams()
  if (symbol) params.set('symbol', symbol)
  if (startTime) params.set('startTime', String(startTime))
  if (endTime) params.set('endTime', String(endTime))
  params.set('limit', String(limit))
  return gw(`${PERPS}/accounts/${address}/trades?${params}`)
}

/** Funding history */
export const perpsFundings = (address: string, { symbol, startTime, endTime, limit = 100 }: HistoryOpts = {}) => {
  const params = new URLSearchParams()
  if (symbol) params.set('symbol', symbol)
  if (startTime) params.set('startTime', String(startTime))
  if (endTime) params.set('endTime', String(endTime))
  params.set('limit', String(limit))
  return gw(`${PERPS}/accounts/${address}/fundings?${params}`)
}

/** API keys (public read) */
export const perpsApiKeys = (address) =>
  gw(`${PERPS}/accounts/${address}/api-keys`)

// ═══════════════════════════════════════
//  SPOT — Market Data
// ═══════════════════════════════════════

/** All spot symbols + config */
export const spotSymbols = () => gw(`${SPOT}/markets/symbols`)

/** All spot tickers (24h stats) */
export const spotTickers = () => gw(`${SPOT}/markets/tickers`)

/** All spot mini tickers */
export const spotMiniTickers = () => gw(`${SPOT}/markets/miniTickers`)

/** All spot book tickers */
export const spotBookTickers = () => gw(`${SPOT}/markets/bookTickers`)

/** Spot order book */
export const spotOrderbook = (symbol, limit = 20) =>
  gw(`${SPOT}/markets/${symbol}/orderbook?limit=${limit}`)

/** Spot klines */
export const spotKlines = (symbol, interval = '1h', limit = 100) =>
  gw(`${SPOT}/markets/${symbol}/klines?interval=${interval}&limit=${limit}`)

/** Spot recent trades */
export const spotRecentTrades = (symbol, limit = 50) =>
  gw(`${SPOT}/markets/${symbol}/trades?limit=${limit}`)

/** All spot coins */
export const spotCoins = () => gw(`${SPOT}/markets/coins`)

// ═══════════════════════════════════════
//  SPOT — Account Data (by wallet address)
// ═══════════════════════════════════════

/** Spot token balances */
export const spotBalances = (address) =>
  gw(`${SPOT}/accounts/${address}/balances`)

/** Open spot orders */
export const spotOrders = (address, symbol) =>
  gw(`${SPOT}/accounts/${address}/orders${symbol ? `?symbol=${symbol}` : ''}`)

/** Full spot frontend state */
export const spotState = (address) =>
  gw(`${SPOT}/accounts/${address}/state`)

/** Spot fee rate */
export const spotFeeRate = (address, symbol) =>
  gw(`${SPOT}/accounts/${address}/fee-rate?symbol=${symbol}`)

/** Spot order history */
export const spotOrderHistory = (address: string, { symbol, startTime, endTime, limit = 100 }: HistoryOpts = {}) => {
  const params = new URLSearchParams()
  if (symbol) params.set('symbol', symbol)
  if (startTime) params.set('startTime', String(startTime))
  if (endTime) params.set('endTime', String(endTime))
  params.set('limit', String(limit))
  return gw(`${SPOT}/accounts/${address}/orders/history?${params}`)
}

/** Spot trade fills */
export const spotTrades = (address: string, { symbol, startTime, endTime, limit = 100 }: HistoryOpts = {}) => {
  const params = new URLSearchParams()
  if (symbol) params.set('symbol', symbol)
  if (startTime) params.set('startTime', String(startTime))
  if (endTime) params.set('endTime', String(endTime))
  params.set('limit', String(limit))
  return gw(`${SPOT}/accounts/${address}/trades?${params}`)
}

/** Spot API keys */
export const spotApiKeys = (address) =>
  gw(`${SPOT}/accounts/${address}/api-keys`)

// ═══════════════════════════════════════
//  Convenience: Combined account data
// ═══════════════════════════════════════

/**
 * Fetch all account data for a wallet in parallel.
 * Returns { perps: { balances, positions, state }, spot: { balances, state } }
 */
export async function fullAccountSnapshot(address) {
  const [pState, sBalances] = await Promise.all([
    perpsState(address).catch(() => null),
    spotBalances(address).catch(() => null),
  ])
  return { perps: pState, spot: { balances: sBalances } }
}

/**
 * Fetch perps + spot trade history for a wallet.
 */
export async function fullTradeHistory(address, opts = {}) {
  const [pTrades, sTrades] = await Promise.all([
    perpsTrades(address, opts).catch(() => []),
    spotTrades(address, opts).catch(() => []),
  ])
  return { perps: pTrades, spot: sTrades }
}
