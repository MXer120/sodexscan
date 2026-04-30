// Shared wallet fetcher used by account/balance/position/funding handlers.
// Reuses the same Sodex endpoints that /api/public/wallet/[address] calls, so
// multiple tools can slice a single upstream fetch.

import { supabaseAdmin } from '../../supabaseServer'

const bundleCache = new Map()
const TTL = 60 * 1000
const MAX = 200

async function fetchJson(url: string, opts?: RequestInit) {
  try {
    const res = await fetch(url, opts)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function getAccountId(address) {
  const { data } = await supabaseAdmin
    .from('leaderboard_smart')
    .select('account_id')
    .ilike('wallet_address', address)
    .maybeSingle()
  return data?.account_id ?? null
}

// Mark prices are global (not per-wallet) — cache separately for 30s
let markPriceCache = { at: 0, map: {} }
export async function getMarkPriceMap() {
  if (Date.now() - markPriceCache.at < 30_000 && Object.keys(markPriceCache.map).length > 0) {
    return markPriceCache.map
  }
  const json = await fetchJson('https://mainnet-gw.sodex.dev/api/v1/perps/markets/mark-prices')
  const map = {}
  const items = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : []
  items.forEach(item => {
    const symbol = item.symbol || item.s
    const price = parseFloat(item.markPrice || item.p || item.price) || 0
    if (symbol && price > 0) map[symbol] = price
  })
  if (Object.keys(map).length > 0) markPriceCache = { at: Date.now(), map }
  return map
}

// Spot tickers from quotation endpoint. Keys stored UPPERCASED for case-insensitive lookup.
// e.g. vTSLA_vUSDC → stored as VTSLA_VUSDC, WSOSO_vUSDC → WSOSO_VUSDC
let spotPriceCache = { at: 0, map: {} }
export async function getSpotPriceMap() {
  if (Date.now() - spotPriceCache.at < 30_000 && Object.keys(spotPriceCache.map).length > 0) {
    return spotPriceCache.map
  }
  const json = await fetchJson('https://mainnet-gw.sodex.dev/pro/p/quotation/tickers')
  const map = {}
  const items = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : []
  items.forEach(item => {
    const symbol = (item.s || item.symbol || '').toUpperCase()
    const price = parseFloat(item.c || item.lastPx || item.markPx || item.px) || 0
    if (symbol && price > 0) map[symbol] = price
  })
  if (Object.keys(map).length > 0) spotPriceCache = { at: Date.now(), map }
  return map
}

export async function fetchWallet(address) {
  const key = address.toLowerCase()
  const cached = bundleCache.get(key)
  if (cached && Date.now() - cached.at < TTL) return cached.data

  const accountId = await getAccountId(address)
  if (!accountId) {
    const miss = { accountId: null, leaderboard: null, overview: null, details: null, balances: null, dailyPnl: null, positions: null, fundTransfers: null, markPrices: {} }
    return miss
  }

  const [leaderboard, overview, details, balances, dailyPnl, positions, fundTransfers, markPrices] = await Promise.all([
    supabaseAdmin.from('leaderboard_smart').select('*').eq('account_id', accountId).maybeSingle().then(r => r.data),
    fetchJson(`https://mainnet-data.sodex.dev/api/v1/perps/pnl/overview?account_id=${accountId}`),
    fetchJson(`https://mainnet-gw.sodex.dev/futures/fapi/user/v1/public/account/details?accountId=${accountId}`),
    fetchJson(`https://mainnet-gw.sodex.dev/pro/p/user/balance/list?accountId=${accountId}`),
    fetchJson(`https://mainnet-data.sodex.dev/api/v1/perps/pnl/daily_stats?account_id=${accountId}`),
    fetchJson(`https://mainnet-data.sodex.dev/api/v1/perps/positions?account_id=${accountId}&limit=500`),
    fetchJson(`https://sodex.dev/mainnet/chain/user/${accountId}/fund-transfers?userId=${accountId}&page=1&size=200`),
    getMarkPriceMap(),
  ])

  const data = { accountId, leaderboard, overview, details, balances, dailyPnl, positions, fundTransfers, markPrices }
  if (bundleCache.size >= MAX) bundleCache.delete(bundleCache.keys().next().value)
  bundleCache.set(key, { at: Date.now(), data })
  return data
}

// Mirror the scan page's getBaseCoin simplified: strip v/w prefixes, map USD-variants to USDC.
const QUOTE_AS_USDC = new Set(['USDC', 'USDT', 'USDE', 'DAI', 'VUSDC', 'WUSDC', 'WUSDT', 'USDBC', 'USD', 'VUSD'])
export function normalizeCoin(coin) {
  if (!coin) return ''
  let c = coin.toString().trim().toUpperCase()
  if (c === 'WSOSO') return 'SOSO'
  if (QUOTE_AS_USDC.has(c)) return 'USDC'
  // Strip leading v or w prefix if followed by a letter
  if (/^[VW][A-Z]/.test(c)) c = c.slice(1)
  if (QUOTE_AS_USDC.has(c)) return 'USDC'
  return c
}

export function priceForCoin(coin, markPrices = {}) {
  const base = normalizeCoin(coin)
  if (!base) return 0
  if (base === 'USDC') return 1
  // Special case: XAUt-USD (tracker uses this exact casing)
  if (base === 'XAUT') return markPrices['XAUt-USD'] || markPrices['XAUT-USD'] || 0
  return markPrices[`${base}-USD`] || 0
}

// Price a spot-balance coin. Map keys are UPPERCASED (see getSpotPriceMap).
// Balance coin names may contain dots (vDEFI.ssi, vMAG7.ssi) while tickers
// strip them (vDEFIssi_vUSDC → VDEFISSI_VUSDC). Strip non-alphanumerics before lookup.
export function priceSpotCoin(rawCoin, spotPrices = {}, markPrices = {}) {
  if (!rawCoin) return 0
  const upper = rawCoin.toString().toUpperCase()
  if (QUOTE_AS_USDC.has(upper)) return 1
  const base = normalizeCoin(rawCoin)
  if (base === 'USDC') return 1
  const clean = upper.replace(/[^A-Z0-9]/g, '')  // vDEFI.ssi → VDEFISSI
  const p = parseFloat(spotPrices[`${clean}_VUSDC`] || spotPrices[`${clean}_USDC`]) || 0
  if (p > 0) return p
  if (base === 'XAUT') return parseFloat(markPrices['XAUt-USD'] || markPrices['XAUT-USD']) || 0
  return parseFloat(markPrices[`${base}-USD`]) || 0
}

// Auto-paginating fetcher for Sodex list endpoints with 1000-row page limit.
// Contract:
//   buildUrl(cursor, pageSize) → url
//   extractItems(json) → array
//   getItemTime(item) → ms timestamp (for window filtering / cursor)
// Stop rules:
//   - fromMs given: stop when oldest item on page is older than fromMs
//     (cursor-less endpoints: we filter after fetch)
//   - fromMs null (all-time): stop when page returned < pageSize
//   - always stop at maxItems cap; set hasMore=true if capped
// Returns { items, hasMore, pages }
export async function fetchSodexPaginated({
  buildUrl,
  extractItems = j => (Array.isArray(j?.data) ? j.data : Array.isArray(j?.list) ? j.list : Array.isArray(j) ? j : []),
  getItemTime,
  fromMs = null,
  toMs = null,
  pageSize = 1000,
  maxItems = 5000,
  maxPages = 20,
  cursorParam = null,
}) {
  const items = []
  let hasMore = false
  let pages = 0
  let cursor = null

  for (let i = 0; i < maxPages; i++) {
    const url = buildUrl({ cursor, pageSize, page: i + 1 })
    let json
    try {
      const res = await fetch(url)
      if (!res.ok) break
      json = await res.json()
    } catch { break }

    const pageItems = extractItems(json)
    if (!Array.isArray(pageItems) || pageItems.length === 0) break
    pages++

    // Apply window filter
    let oldestOutsideWindow = false
    for (const it of pageItems) {
      const t = getItemTime ? getItemTime(it) : null
      if (toMs != null && t != null && t > toMs) continue
      if (fromMs != null && t != null && t < fromMs) { oldestOutsideWindow = true; continue }
      items.push(it)
      if (items.length >= maxItems) { hasMore = true; break }
    }
    if (items.length >= maxItems) break

    // Stop conditions
    if (fromMs != null && oldestOutsideWindow) break  // bounded window complete
    if (fromMs == null && pageItems.length < pageSize) break  // all-time exhausted
    if (cursorParam) {
      // cursor pagination: use last item's time as next cursor
      const last = pageItems[pageItems.length - 1]
      const lastTime = getItemTime ? getItemTime(last) : null
      if (!lastTime) break
      cursor = lastTime
    } else {
      // page-number pagination (handled by buildUrl reading page)
    }
  }

  return { items, hasMore, pages }
}

export function assetUsdFromBalance(b) {
  const amount = parseFloat(b.balance ?? b.total ?? b.amount ?? 0) || 0
  const price = parseFloat(b.priceUsd ?? b.usdPrice ?? b.markPrice ?? b.price ?? 0) || 0
  const direct = parseFloat(b.totalUsd ?? b.valueUsd ?? b.usdValue ?? 0) || 0
  if (direct > 0) return direct
  return amount * price
}
