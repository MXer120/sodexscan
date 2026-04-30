/**
 * SoSoValue API client — server-side only.
 * Base: https://openapi.sosovalue.com/openapi/v1
 * Auth: x-soso-api-key header (server env only, never client-side)
 * Free tier: 20 req/min — always read from sosovalue_cache in Supabase instead of calling directly from client.
 */

const BASE = 'https://openapi.sosovalue.com/openapi/v1'

async function gw(path, opts = {}) {
  const apiKey = process.env.SOSOVALUE_API_KEY
  if (!apiKey) throw new Error('SOSOVALUE_API_KEY not set')

  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'x-soso-api-key': apiKey,
      'Accept': 'application/json',
    },
    ...opts,
  })
  if (!res.ok) throw new Error(`SoSoValue API ${res.status}: ${path}`)
  const json = await res.json()
  if (json.code !== undefined && json.code !== 0) {
    throw new Error(json.message || `SoSoValue error code ${json.code}`)
  }
  return json.data ?? json
}

// ═══════════════════════════════════════
//  ETF
// ═══════════════════════════════════════

/** All ETF fund summaries */
export const etfSummary = () => gw('/etf/summary')

/** BTC spot-ETF daily net flows (inflow/outflow in USD) */
export const etfBtcFlows = () => gw('/etf/flows?assetType=BTC')

/** ETH spot-ETF daily net flows */
export const etfEthFlows = () => gw('/etf/flows?assetType=ETH')

/** ETF snapshot (latest AUM, volume, flows) */
export const etfSnapshot = (assetType = 'BTC') =>
  gw(`/etf/snapshot?assetType=${assetType}`)

// ═══════════════════════════════════════
//  SoSoValue Index
// ═══════════════════════════════════════

/** All available indices */
export const indicesList = () => gw('/index/list')

/** Index price chart for a given index ID */
export const indexChart = (indexId, period = '1M') =>
  gw(`/index/${indexId}/chart?period=${period}`)

/** Index snapshot (latest value) */
export const indexSnapshot = (indexId) =>
  gw(`/index/${indexId}/snapshot`)

// ═══════════════════════════════════════
//  Feeds / News
// ═══════════════════════════════════════

/** Featured news by currency (BTC, ETH, SOL …) */
export const newsByCurrency = (currencyId, pageNum = 1, pageSize = 10) =>
  gw(`/news/featured/currency?currencyId=${currencyId}&pageNum=${pageNum}&pageSize=${pageSize}`)

/** Trending news */
export const newsTrending = (pageNum = 1, pageSize = 10) =>
  gw(`/news/trending?pageNum=${pageNum}&pageSize=${pageSize}`)

// ═══════════════════════════════════════
//  Macro
// ═══════════════════════════════════════

/** Upcoming macro events (FOMC, CPI, NFP …) */
export const macroEvents = () => gw('/macro/events')

// ═══════════════════════════════════════
//  Analysis Charts
// ═══════════════════════════════════════

/** BTC on-chain / market analysis chart data */
export const analysisChart = (chartId) => gw(`/analysis/${chartId}`)
