import { fetchWallet, priceSpotCoin, getSpotPriceMap } from './walletBundle'
import { getEvmUsdTotal } from './valuescan'

const SODEX_RANK = 'https://mainnet-data.sodex.dev/api/v1/leaderboard/rank'

async function fetchRank(wallet, sortBy) {
  try {
    const res = await fetch(`${SODEX_RANK}?window_type=ALL_TIME&sort_by=${sortBy}&wallet_address=${wallet}`)
    if (!res.ok) return null
    const json = await res.json()
    if (json.code !== 0 || !json.data?.found || !json.data?.item) return null
    return json.data.item
  } catch { return null }
}

function sumSpotUsd(spotItems, spotPrices, markPrices) {
  if (!Array.isArray(spotItems)) return 0
  let total = 0
  for (const bal of spotItems) {
    const amount = parseFloat(bal.balance) || 0
    if (!amount) continue
    total += amount * priceSpotCoin(bal.coin, spotPrices, markPrices)
  }
  return total
}

function futuresUsd(details) {
  const v = details?.data?.balances?.[0]?.walletBalance ?? details?.balances?.[0]?.walletBalance
  return parseFloat(v) || 0
}

function sumUnrealized(details) {
  const raw = details?.data?.positions ?? details?.positions ?? []
  return raw.reduce((s, p) => s + (parseFloat(p.unrealizedProfit ?? p.unrealizedPnl ?? 0) || 0), 0)
}

const r2 = n => Math.round(n * 100) / 100

const ALL_FIELDS = ['rank', 'balance', 'unrealized', 'cumulative', 'breakdown']

interface AccountOverviewResult {
  address: string
  account_id: string
  fields: string[]
  pnl_rank?: number | null
  volume_rank?: number | null
  cumulative_pnl?: number
  cumulative_volume?: number
  unrealized_pnl?: number
  total_equity?: number
  breakdown?: { futures: number; spot: number; vault: number; staked: number; evm: number }
  last_synced_at?: string | null
}

export async function get_account_overview({ address, fields }: { address: string; fields?: string[] }) {
  const selected = (Array.isArray(fields) && fields.length > 0) ? fields : ALL_FIELDS
  const want = new Set(selected)

  const needRank = want.has('rank') || want.has('cumulative')
  const needBalance = want.has('balance') || want.has('breakdown')
  const needUnrealized = want.has('unrealized')

  // Always need the bundle for accountId (and cheap since it's cached).
  const bundlePromise = fetchWallet(address)
  const pnlRankPromise = needRank ? fetchRank(address, 'pnl') : Promise.resolve(null)
  const volRankPromise = needRank ? fetchRank(address, 'volume') : Promise.resolve(null)

  const [bundle, pnlRankItem, volumeRankItem] = await Promise.all([
    bundlePromise, pnlRankPromise, volRankPromise,
  ])
  if (!bundle.accountId) return { error: 'Wallet not found', code: 404 }

  const out: AccountOverviewResult = {
    address,
    account_id: bundle.accountId,
    fields: selected,
  }

  if (want.has('rank')) {
    out.pnl_rank = pnlRankItem?.rank ?? null
    out.volume_rank = volumeRankItem?.rank ?? null
  }

  if (want.has('cumulative')) {
    const rankData = pnlRankItem || volumeRankItem
    out.cumulative_pnl = parseFloat(rankData?.pnl_usd ?? 0) || 0
    out.cumulative_volume = parseFloat(rankData?.volume_usd ?? 0) || 0
  }

  if (needUnrealized) {
    out.unrealized_pnl = r2(sumUnrealized(bundle.details))
  }

  if (needBalance) {
    const markPrices = bundle.markPrices || {}
    const spotItems = bundle.balances?.data?.spotBalance ?? []
    const spotPrices = await getSpotPriceMap()
    const evm = await getEvmUsdTotal(address, spotPrices)

    const spotUsd = sumSpotUsd(spotItems, spotPrices, markPrices)
    const futuresUsdVal = futuresUsd(bundle.details)
    const vaultUsd = evm.tokens.filter(t => t.category === 'lp_vault').reduce((s, t) => s + (t.usd || 0), 0)
    const stakedUsd = evm.tokens.filter(t => t.category === 'staked').reduce((s, t) => s + (t.usd || 0), 0)
    const evmOtherUsd = evm.total - vaultUsd - stakedUsd

    if (want.has('balance')) {
      out.total_equity = r2(spotUsd + futuresUsdVal + evm.total)
    }
    if (want.has('breakdown')) {
      out.breakdown = {
        futures: r2(futuresUsdVal),
        spot: r2(spotUsd),
        vault: r2(vaultUsd),
        staked: r2(stakedUsd),
        evm: r2(evmOtherUsd),
      }
    }
  }

  out.last_synced_at = bundle.leaderboard?.last_synced_at ?? null
  return out
}
