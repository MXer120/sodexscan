// Single source of truth for all tools exposed via /api/tools.
// Read-only tools default to tier:'public'; tools that touch user data are tier:'user'.
// Mutation tools have mutates:true. Destructive ops are flagged for UI confirmation.
// Handlers are resolved lazily by the gateway so the registry stays tree-shakeable
// and the manifest is easy to serialize.

import { fetchWallet } from './handlers/walletBundle'
import { get_balance } from './handlers/get_balance'
import { get_balance_breakdown } from './handlers/get_balance_breakdown'
import { get_account_overview } from './handlers/get_account_overview'
import { get_open_positions } from './handlers/get_open_positions'
import { get_pnl_daily } from './handlers/get_pnl_daily'
import { get_funding_total } from './handlers/get_funding_total'
import { get_prices } from './handlers/get_prices'
import { get_symbols } from './handlers/get_symbols'
import { resolve_refcode } from './handlers/resolve_refcode'
import { get_alias } from './handlers/get_alias'
import { list_alerts } from './handlers/list_alerts'
import { get_account_id } from './handlers/get_account_id'
import { get_incoming_listings } from './handlers/get_incoming_listings'
import { watchlist_add } from './handlers/watchlist_add'
import { watchlist_remove } from './handlers/watchlist_remove'
import { alias_set } from './handlers/alias_set'
import { alias_delete } from './handlers/alias_delete'
import { group_create } from './handlers/group_create'
import { alert_create } from './handlers/alert_create'
import { alert_update } from './handlers/alert_update'
import { alert_delete } from './handlers/alert_delete'
import { alert_toggle } from './handlers/alert_toggle'
import { group_assign } from './handlers/group_assign'
import { get_evm_holdings } from './handlers/get_evm_holdings'
import { get_evm_transactions } from './handlers/get_evm_transactions'
import { get_evm_token_transfers } from './handlers/get_evm_token_transfers'
import { get_rank } from './handlers/get_rank'
import { get_pnl_history } from './handlers/get_pnl_history'
import { get_open_orders } from './handlers/get_open_orders'
import { get_trades } from './handlers/get_trades'
import { get_transfers } from './handlers/get_transfers'
import { get_funding_history } from './handlers/get_funding_history'
import { get_performance_by_asset } from './handlers/get_performance_by_asset'
import { get_recent_activity } from './handlers/get_recent_activity'
import { discover_tools } from './handlers/discover_tools'

const ADDR_PATTERN = '^0x[a-fA-F0-9]{40}$'
const WINDOW_ENUM = ['1h', '4h', '12h', '24h', '48h', '7d', '30d', 'all', 'custom']
const HISTORY_WINDOW_ENUM = ['24h', '48h', '7d', '30d', 'all', 'custom']
const RANK_WINDOW_ENUM = ['24h', '7d', '30d', 'all']

export const REGISTRY_VERSION = '1'

const BALANCE_SUPPORTED_TOKENS = {
  spot: [
    'WSOSO','vAAPL','vAAVE','vADA','vAMZN','vARB','vAVAX','vBNB','vBTC',
    'vDEFI.ssi','vDOGE','vETH','vGOOGL','vHYPE','vLINK','vLTC',
    'vMAG7.ssi','vMEME.ssi','vMETA','vMSFT','vNVDA','vPEPE','vSHIB',
    'vSOL','vSUI','vTON','vTSLA','vUNI','vUSDT','vUSSI','vXAUt','vXLM','vXRP',
  ],
  perps: [
    '1000BONK','1000PEPE','1000SHIB','AAPL','AAVE','ADA','AMD','AMZN','APT',
    'ARB','ASTER','AVAX','AXS','BASED','BCH','BERA','BNB','BREV','BTC','CHZ',
    'CL','COIN','COPPER','CRCL','DASH','DOGE','ENA','ETC','ETH','EWY',
    'FARTCOIN','FIL','GOOGL','HBAR','HOOD','HYPE','INTC','LINK','LIT','LTC',
    'META','MON','MSFT','MSTR','MU','NATGAS','NEAR','NVDA','ONDO','OP','ORCL',
    'PENGU','PLTR','PUMP','SILVER','SKHX','SNDK','SOL','SOSO','SUI','TAO',
    'TRUMP','TRX','TSLA','TSM','UNI','US500','USTECH100','VIRTUAL','WIF',
    'WLD','WLFI','XAUT','XLM','XMR','XPL','XRP','ZEC',
  ],
  evm: {
    native: ['SOSO','WSOSO'],
    staked: ['sSOSO', 'vsMAG7.ssi'],
    lp_vaults: ['vsMAG7.SLP'],
    tokens: [
      'vAAVE','vAAPL','vADA','vAMZN','vARB','vAVAX','vBNB','vBTC',
      'vCRCLx','vDEFI.ssi','vDOGE','vETH','vGOOGL','vHYPE','vLINK','vLTC',
      'vMAG7.ssi','vMEME.ssi','vMETA','vMSFT','vNVDA','vPEPE','vSHIB',
      'vSOL','vSUI','vTON','vTSLA','vUNI','vUSDC','vUSDT','vUSSI',
      'vXAUt','vXLM','vXRP',
    ],
  },
}

// ──────────────────────────────────────────────────────────────────────────
// Available tools (handlers wired)
// ──────────────────────────────────────────────────────────────────────────
const AVAILABLE = [
  // ── Account / Wallet Overview ───────────────────────────────────────────
  {
    id: 'get_account_overview',
    name: 'Account Overview',
    category: 'Account',
    surface: 'tracker',
    status: 'available', tier: 'public',
    shortDescription: 'Combined snapshot: rank, balance, unrealized & cumulative PnL, volume.',
    longDescription: 'Mirrors the tracker page left sidebar. One call returns everything needed for a high-level profile card. Use "fields" to skip upstream calls you do not need (cost saver).',
    features: ['Single round-trip', 'Togglable fields', 'Rank + equity + PnL', 'Cached 60s'],
    params: [
      { name: 'address', type: 'string', required: true, pattern: ADDR_PATTERN, description: 'EVM wallet address.' },
      { name: 'fields', type: 'array', itemType: 'enum', enum: ['rank', 'balance', 'unrealized', 'cumulative', 'breakdown'], default: ['rank', 'balance', 'unrealized', 'cumulative', 'breakdown'], description: 'Which sections to compute. Empty = all.' },
    ],
    returns: { type: 'object', shape: { address: 'string', account_id: 'string', fields: 'string[]', pnl_rank: 'number|null', volume_rank: 'number|null', total_equity: 'number', unrealized_pnl: 'number', cumulative_pnl: 'number', cumulative_volume: 'number', breakdown: '{futures,spot,vault,staked,evm}' } },
    examples: [
      { label: 'Everything', request: { address: '0x0000000000000000000000000000000000000000' } },
      { label: 'Rank + balance only', request: { address: '0x0000…', fields: ['rank', 'balance'] } },
    ],
    errors: { 400: 'Invalid address', 404: 'Wallet not found' },
    fullPageHref: '/tracker/{address}',
    relatedTools: ['get_balance', 'get_rank', 'get_performance_by_asset'],
    demo: 'AccountOverviewDemo',
    verified: true,
    handler: get_account_overview,
  },
  {
    id: 'get_balance',
    name: 'Get Balance',
    category: 'Account',
    surface: 'tracker',
    status: 'available', tier: 'public',
    shortDescription: 'Total assets: spot + futures + EVM funding (valuescan).',
    longDescription: 'Returns USD balance for the requested segment. "total" = spot + futures + on-chain EVM balance (native SOSO + ERC-20 tokens via valuescan). "evm" returns on-chain balance only.',
    features: ['spot / perps / evm / total', 'EVM via valuescan', 'USD-denominated', '60s server cache'],
    limits: 'Public — 60 req/min per IP.',
    params: [
      { name: 'address', type: 'string', required: true, pattern: ADDR_PATTERN, description: 'EVM wallet address.' },
      { name: 'market', type: 'enum', enum: ['spot', 'perps', 'evm', 'total'], default: 'total', description: 'Which balance to return. "total" includes EVM funding.' },
    ],
    returns: { type: 'object', shape: { address: 'string', market: 'string', balance: 'number', currency: 'string', breakdown: '{spot,futures,evm}?', updatedAt: 'iso8601' } },
    examples: [
      { label: 'Total (with EVM)', request: { address: '0x0000…', market: 'total' }, response: { balance: 12450.23, market: 'total', breakdown: { spot: 5000, futures: 4000, evm: 3450.23 }, currency: 'USD' } },
      { label: 'EVM only', request: { address: '0x0000…', market: 'evm' }, response: { balance: 3450.23, market: 'evm', currency: 'USD' } },
    ],
    errors: { 400: 'Invalid address', 404: 'Wallet not found' },
    fullPageHref: '/tracker/{address}',
    relatedTools: ['get_evm_holdings', 'get_balance_breakdown', 'get_account_overview'],
    demo: 'BalanceDemo',
    verified: true,
    supportedTokens: BALANCE_SUPPORTED_TOKENS,
    handler: get_balance,
  },
  {
    id: 'get_balance_breakdown',
    name: 'Balance Breakdown',
    category: 'Account',
    surface: 'tracker',
    status: 'available', tier: 'public',
    shortDescription: 'Per-coin breakdown with USD values for spot, perps, EVM, or all combined.',
    longDescription: 'Returns per-coin breakdown with amount, price, and USD value. spot uses quotation tickers; perps uses mark prices; evm distinguishes native/tokens/vault/staked. total includes all markets with subtotals.',
    params: [
      { name: 'address', type: 'string', required: true, pattern: ADDR_PATTERN },
      { name: 'market', type: 'enum', enum: ['spot', 'perps', 'evm', 'total'], default: 'total' },
    ],
    returns: { type: 'object', shape: { address: 'string', market: 'string', total_usd: 'number', breakdown: '{spot,perps,evm}?', coins: '[{coin,amount,price,usd}]?', spot: '[{coin,amount,price,usd}]?', perps: '[{coin,amount,price,usd}]?', evm: '{native,tokens,vault,staked}?' } },
    relatedTools: ['get_balance'],
    demo: 'BalanceBreakdownDemo',
    verified: true,
    supportedTokens: BALANCE_SUPPORTED_TOKENS,
    handler: get_balance_breakdown,
  },
  // ── EVM / ValueChain ────────────────────────────────────────────────────
  {
    id: 'get_evm_holdings',
    name: 'EVM Holdings',
    category: 'EVM',
    surface: 'tracker',
    status: 'available', tier: 'public',
    shortDescription: 'On-chain ERC-20 balances via valuescan: native SOSO, staked SOSO, LP vault tokens.',
    longDescription: 'Fetches the EVM wallet state from the ValueChain block explorer (Blockscout). Returns native SOSO balance, generic ERC-20 tokens, LP vault tokens, and staked tokens as separate arrays — staked/LP tokens never appear in the generic "tokens" array.',
    features: ['Native SOSO balance', 'LP vault tokens (separate)', 'Staked SOSO (separate)', 'Generic ERC-20 tokens', 'USD where price available'],
    params: [{ name: 'address', type: 'string', required: true, pattern: ADDR_PATTERN, description: 'EVM wallet address.' }],
    returns: { type: 'object', shape: { address: 'string', native: '{symbol,amount,price,usd}', tokens: 'Token[] (erc20 only)', lp_vaults: 'Token[]', staked: 'Token[]', total_usd: 'number', updatedAt: 'iso8601' } },
    errors: { 400: 'Invalid address' },
    relatedTools: ['get_balance', 'get_evm_transactions', 'get_evm_token_transfers'],
    demo: 'EvmHoldingsDemo',
    verified: true,
    handler: get_evm_holdings,
  },
  {
    id: 'get_evm_transactions',
    name: 'EVM Transactions',
    category: 'EVM',
    surface: 'tracker',
    status: 'available', tier: 'public',
    shortDescription: 'On-chain transaction history for an EVM address via valuescan.',
    longDescription: 'Returns the most recent EVM transactions for the wallet. Useful to determine when tokens were staked or LP positions were entered.',
    features: ['Type, method, status', 'Native value transferred', 'Fee in SOSO', 'Timestamp'],
    params: [
      { name: 'address', type: 'string', required: true, pattern: ADDR_PATTERN },
      { name: 'limit', type: 'integer', min: 1, max: 50, default: 25 },
    ],
    returns: { type: 'object', shape: { address: 'string', transactions: '[{hash,type,from,to,value_native,timestamp,status,method,fee_native}]', has_more: 'boolean' } },
    errors: { 400: 'Invalid address', 502: 'Valuescan unreachable' },
    relatedTools: ['get_evm_holdings', 'get_evm_token_transfers'],
    demo: 'EvmTransactionsDemo',
    handler: get_evm_transactions,
  },
  {
    id: 'get_evm_token_transfers',
    name: 'EVM Token Transfers',
    category: 'EVM',
    surface: 'tracker',
    status: 'available', tier: 'public',
    shortDescription: 'ERC-20 token transfer history for an EVM address via valuescan.',
    longDescription: 'Returns ERC-20 token transfer events. Shows inflows/outflows for staked tokens, LP vault shares, and any ERC-20 on ValueChain.',
    features: ['ERC-20 only', 'Token name + symbol', 'Amount (human-readable)', 'Timestamp'],
    params: [
      { name: 'address', type: 'string', required: true, pattern: ADDR_PATTERN },
      { name: 'limit', type: 'integer', min: 1, max: 100, default: 50 },
    ],
    returns: { type: 'object', shape: { address: 'string', transfers: '[{tx_hash,from,to,token_address,token_name,token_symbol,amount,timestamp}]', has_more: 'boolean' } },
    errors: { 400: 'Invalid address', 502: 'Valuescan unreachable' },
    relatedTools: ['get_evm_holdings', 'get_evm_transactions'],
    demo: 'EvmTokenTransfersDemo',
    verified: true,
    handler: get_evm_token_transfers,
  },

  {
    id: 'get_open_positions',
    name: 'Open Positions',
    category: 'Positions',
    surface: 'tracker',
    status: 'available', tier: 'public',
    shortDescription: 'Currently open perp positions for a wallet.',
    params: [
      { name: 'address', type: 'string', required: true, pattern: ADDR_PATTERN },
      { name: 'symbol', type: 'string', required: false, description: 'Optional symbol filter, e.g. BTC-USDT' },
      { name: 'sort_by', type: 'enum', enum: ['notional', 'unrealized_pnl', 'leverage'], default: 'notional' },
      { name: 'limit', type: 'integer', min: 1, max: 100, default: 50 },
    ],
    returns: { type: 'array', shape: '[{symbol,side,size,entry_price,mark_price,leverage,liquidation_price,unrealized_pnl,notional}]' },
    relatedTools: ['get_trade_history', 'get_liquidation_prices'],
    demo: 'OpenPositionsDemo',
    verified: true,
    handler: get_open_positions,
  },
  {
    id: 'get_pnl_daily',
    name: 'Daily PnL',
    category: 'PnL & Performance',
    surface: 'tracker',
    status: 'deprecated', tier: 'public',
    shortDescription: 'Daily PnL series for the last N days. (Use get_pnl_history instead.)',
    params: [
      { name: 'address', type: 'string', required: true, pattern: ADDR_PATTERN },
      { name: 'days', type: 'integer', min: 1, max: 365, default: 30 },
    ],
    returns: { type: 'array', shape: '[{date,pnl}]' },
    relatedTools: ['get_pnl_history'],
    demo: 'PnlDailyDemo',
    handler: get_pnl_daily,
  },
  {
    id: 'get_pnl_history',
    name: 'PnL History',
    category: 'PnL & Performance',
    surface: 'tracker',
    status: 'available', tier: 'public',
    shortDescription: 'PnL series: daily / weekly / monthly / yearly / rolling 7d.',
    longDescription: 'Derives a bucketed PnL series from the wallet bundle daily stats. Use view to pick the aggregation — "daily" for the chart, "weekly"/"monthly"/"yearly" for the calendar, "rolling_7d" for a sliding 7-day sum.',
    features: ['5 view modes', 'Daily + cumulative per bucket', 'from/to or days window'],
    params: [
      { name: 'address', type: 'string', required: true, pattern: ADDR_PATTERN },
      { name: 'view', type: 'enum', enum: ['daily', 'weekly', 'monthly', 'yearly', 'rolling_7d'], default: 'daily' },
      { name: 'days', type: 'integer', min: 1, max: 365, default: 90, description: 'Ignored if "from" is set.' },
      { name: 'from', type: 'iso8601', required: false },
      { name: 'to', type: 'iso8601', required: false },
    ],
    returns: { type: 'array', shape: '[{bucket, daily_pnl, cumulative_pnl}] | [{bucket, pnl}]' },
    relatedTools: ['get_pnl_daily', 'get_performance_by_asset'],
    demo: 'PnlHistoryDemo',
    handler: get_pnl_history,
  },
  {
    id: 'get_rank',
    name: 'Rank',
    category: 'Account',
    surface: 'tracker',
    status: 'available', tier: 'public',
    shortDescription: 'PnL / volume leaderboard rank for a wallet across windows.',
    longDescription: 'Queries the Sodex leaderboard-rank endpoint for 24h / 7d / 30d / all-time windows, by PnL, volume, or both.',
    params: [
      { name: 'address', type: 'string', required: true, pattern: ADDR_PATTERN },
      { name: 'window', type: 'enum', enum: RANK_WINDOW_ENUM, default: 'all' },
      { name: 'sort', type: 'enum', enum: ['pnl', 'volume', 'both'], default: 'both' },
    ],
    returns: { type: 'object', shape: { address: 'string', window: 'string', sort: 'string', pnl_rank: 'number|null', volume_rank: 'number|null', cumulative_pnl: 'number', cumulative_volume: 'number' } },
    relatedTools: ['get_account_overview', 'get_account_id'],
    demo: 'RankDemo',
    verified: true,
    handler: get_rank,
  },
  {
    id: 'get_open_orders',
    name: 'Open Orders',
    category: 'Positions',
    surface: 'tracker',
    status: 'available', tier: 'public',
    shortDescription: 'Outstanding limit/stop orders across perps + spot.',
    params: [
      { name: 'address', type: 'string', required: true, pattern: ADDR_PATTERN },
      { name: 'market', type: 'enum', enum: ['perps', 'spot', 'all'], default: 'all' },
      { name: 'symbol', type: 'string', required: false },
      { name: 'limit', type: 'integer', min: 1, max: 500, default: 100 },
    ],
    returns: { type: 'object', shape: { address: 'string', market: 'string', total: 'number', orders: '[{market,orderId,symbol,side,type,price,orig_qty,executed_qty,status,time}]' } },
    relatedTools: ['get_open_positions', 'get_trades'],
    demo: 'OpenOrdersDemo',
    handler: get_open_orders,
  },
  {
    id: 'get_trades',
    name: 'Trades',
    category: 'Positions',
    surface: 'tracker',
    status: 'available', tier: 'public',
    shortDescription: 'Filled trades — perps / spot / all — with auto-pagination.',
    longDescription: 'Fetches trade fills with endTime cursor pagination (1000/page). Handler loops until window covered or max_items hit.',
    features: ['Perps + spot', 'Auto-pagination (up to 5000)', 'Window or custom range'],
    params: [
      { name: 'address', type: 'string', required: true, pattern: ADDR_PATTERN },
      { name: 'market', type: 'enum', enum: ['perps', 'spot', 'all'], default: 'all' },
      { name: 'symbol', type: 'string', required: false },
      { name: 'window', type: 'enum', enum: HISTORY_WINDOW_ENUM, default: '30d' },
      { name: 'from', type: 'iso8601', required: false },
      { name: 'to', type: 'iso8601', required: false },
      { name: 'max_items', type: 'integer', min: 1, max: 5000, default: 5000, description: 'Safety cap on rows fetched. Defaults to the max so the full window is returned; lower it to short-circuit huge histories.' },
    ],
    returns: { type: 'object', shape: { address: 'string', count: 'number', has_more: 'boolean', first_time: 'ms|null', last_time: 'ms|null', trades: '[{market,symbol,side,price,qty,quote_qty,fee,fee_asset,realized_pnl,time,trade_id,order_id}]' } },
    relatedTools: ['get_open_orders', 'get_performance_by_asset'],
    demo: 'TradesDemo',
    handler: get_trades,
  },
  {
    id: 'get_transfers',
    name: 'Transfers',
    category: 'Transfers',
    surface: 'tracker',
    status: 'available', tier: 'public',
    shortDescription: 'Deposits + withdrawals + internal Spot↔Fund transfers, paginated.',
    longDescription: 'Merges two upstream sources: alpha-biz/account_flow (on-chain deposits & withdrawals) + mainnet/fund-transfers (internal Spot↔Fund). Paginated.',
    params: [
      { name: 'address', type: 'string', required: true, pattern: ADDR_PATTERN },
      { name: 'type', type: 'enum', enum: ['deposit', 'withdrawal', 'internal', 'all'], default: 'all' },
      { name: 'window', type: 'enum', enum: HISTORY_WINDOW_ENUM, default: '30d' },
      { name: 'from', type: 'iso8601', required: false },
      { name: 'to', type: 'iso8601', required: false },
      { name: 'max_items', type: 'integer', min: 1, max: 2000, default: 2000, description: 'Safety cap on rows fetched. Defaults to the max so the full window is returned.' },
    ],
    returns: { type: 'object', shape: { address: 'string', count: 'number', has_more: 'boolean', transfers: '[{time,type,symbol,amount,direction,tx_hash,from,to,source}]' } },
    relatedTools: ['get_funding_total', 'get_recent_activity'],
    demo: 'TransfersDemo',
    handler: get_transfers,
  },
  {
    id: 'get_funding_history',
    name: 'Funding History',
    category: 'Funding',
    surface: 'tracker',
    status: 'available', tier: 'public',
    shortDescription: 'Raw per-event funding rows with net paid/received totals.',
    params: [
      { name: 'address', type: 'string', required: true, pattern: ADDR_PATTERN },
      { name: 'symbol', type: 'string', required: false },
      { name: 'window', type: 'enum', enum: HISTORY_WINDOW_ENUM, default: '30d' },
      { name: 'from', type: 'iso8601', required: false },
      { name: 'to', type: 'iso8601', required: false },
      { name: 'max_items', type: 'integer', min: 1, max: 5000, default: 5000, description: 'Safety cap on rows fetched. Defaults to the max so the full window is returned.' },
    ],
    returns: { type: 'object', shape: { address: 'string', count: 'number', has_more: 'boolean', net: 'number', net_paid: 'number', net_received: 'number', events: '[{symbol,amount,direction,rate,mark_price,time}]' } },
    relatedTools: ['get_funding_total'],
    demo: 'FundingHistoryDemo',
    handler: get_funding_history,
  },
  {
    id: 'get_performance_by_asset',
    name: 'Performance by Asset',
    category: 'PnL & Performance',
    surface: 'tracker',
    status: 'available', tier: 'public',
    shortDescription: 'Per-symbol PnL + volume + win rate, derived from trade fills.',
    params: [
      { name: 'address', type: 'string', required: true, pattern: ADDR_PATTERN },
      { name: 'market', type: 'enum', enum: ['perps', 'spot', 'all'], default: 'perps' },
      { name: 'window', type: 'enum', enum: HISTORY_WINDOW_ENUM, default: 'all' },
      { name: 'sort', type: 'enum', enum: ['total_pnl', 'volume', 'trades'], default: 'total_pnl' },
      { name: 'limit', type: 'integer', min: 1, max: 100, default: 20 },
    ],
    returns: { type: 'array', shape: '[{symbol,total_pnl,volume,trade_count,closed_count,wins,losses,avg_pnl,win_rate}]' },
    longDescription: 'Volume + trade_count come from trade fills; total_pnl + wins/losses/win_rate come from closed POSITIONS (more accurate than fills). On Sodex perps, trade-fill realized PnL is often empty — closed-position history is the authoritative source.',
    relatedTools: ['get_trades', 'get_pnl_history'],
    demo: 'PerformanceByAssetDemo',
    handler: get_performance_by_asset,
  },
  {
    id: 'get_recent_activity',
    name: 'Recent Activity',
    category: 'Activity',
    surface: 'tracker',
    status: 'available', tier: 'public',
    shortDescription: 'Merged feed: trades + transfers + funding, sorted desc.',
    params: [
      { name: 'address', type: 'string', required: true, pattern: ADDR_PATTERN },
      { name: 'types', type: 'array', itemType: 'enum', enum: ['trade', 'deposit', 'withdrawal', 'internal', 'funding'], default: ['trade', 'deposit', 'withdrawal', 'internal', 'funding'] },
      { name: 'window', type: 'enum', enum: HISTORY_WINDOW_ENUM, default: '30d' },
      { name: 'limit', type: 'integer', min: 1, max: 500, default: 100 },
    ],
    returns: { type: 'object', shape: { address: 'string', count: 'number', items: '[{time,type,symbol,amount,side,market,details}]' } },
    relatedTools: ['get_trades', 'get_transfers', 'get_funding_history'],
    demo: 'RecentActivityDemo',
    verified: true,
    handler: get_recent_activity,
  },
  {
    id: 'discover_tools',
    name: 'Discover Tools',
    category: 'Meta',
    status: 'available', tier: 'public',
    shortDescription: 'Search the tool registry — AI-friendly tool discovery.',
    longDescription: 'Lightweight registry search so an AI can find the right tool without loading the full manifest.',
    params: [
      { name: 'query', type: 'string', required: false, description: 'Matches id, name, description, category.' },
      { name: 'category', type: 'string', required: false },
      { name: 'surface', type: 'enum', enum: ['tracker', 'market', 'alerts', 'all'], default: 'all' },
      { name: 'status', type: 'enum', enum: ['available', 'planned', 'deprecated'], required: false },
      { name: 'limit', type: 'integer', min: 1, max: 100, default: 25 },
    ],
    returns: { type: 'object', shape: { count: 'number', tools: '[{id,name,category,surface,status,tier,mutates,shortDescription,params,relatedTools}]' } },
    demo: 'DiscoverToolsDemo',
    verified: true,
    handler: discover_tools,
  },

  // ── Funding ─────────────────────────────────────────────────────────────
  {
    id: 'get_funding_total',
    name: 'Total Funding Paid/Received',
    category: 'Funding',
    surface: 'tracker',
    status: 'available', tier: 'public',
    shortDescription: 'Net/paid/received funding over a window, optionally per-symbol.',
    longDescription: 'Aggregates funding-fee events. Use preset windows (1h/4h/12h/24h/48h/7d/30d/all) or pass custom from/to. Breakdown flag returns a per-symbol split for attribution.',
    features: ['1h…30d/all/custom', 'Per-symbol breakdown', 'Net, paid, received'],
    params: [
      { name: 'address', type: 'string', required: true, pattern: ADDR_PATTERN },
      { name: 'window', type: 'enum', enum: WINDOW_ENUM, default: '24h' },
      { name: 'from', type: 'iso8601', required: false, description: 'Required if window=custom' },
      { name: 'to', type: 'iso8601', required: false },
      { name: 'symbol', type: 'string', required: false },
      { name: 'breakdown', type: 'boolean', default: false },
    ],
    returns: { type: 'object', shape: { net: 'number', paid: 'number', received: 'number', window: 'string', from: 'iso8601', to: 'iso8601', breakdown: '[{symbol,net,paid,received,count}]?' } },
    errors: { 400: 'Invalid window or range', 404: 'Account not found' },
    relatedTools: ['get_funding_history', 'get_pnl_window'],
    demo: 'FundingTotalDemo',
    handler: get_funding_total,
  },

  // ── Market Data ─────────────────────────────────────────────────────────
  {
    id: 'get_prices',
    name: 'Mark Prices',
    category: 'Market Data',
    status: 'available', tier: 'public',
    shortDescription: 'Current mark prices, optionally filtered to a set of symbols.',
    params: [
      { name: 'symbols', type: 'array', required: false, description: 'Array (or comma-separated string) of symbols to filter.' },
    ],
    returns: { type: 'object', shape: { mark: 'Record<symbol, price>' } },
    examples: [{ label: 'All symbols', request: {} }, { label: 'BTC+ETH', request: { symbols: ['BTC-USDT', 'ETH-USDT'] } }],
    relatedTools: ['get_price', 'get_symbols'],
    demo: 'PricesDemo',
    verified: true,
    handler: get_prices,
  },
  {
    id: 'get_symbols',
    name: 'List Symbols',
    category: 'Market Data',
    status: 'available', tier: 'public',
    shortDescription: 'All tradeable symbols with their current price + market.',
    params: [],
    returns: { type: 'array', shape: '[{symbol,base,market,price}]' },
    demo: 'SymbolsDemo',
    handler: get_symbols,
  },
  {
    id: 'get_account_id',
    name: 'Get Account ID',
    handler: get_account_id,
    category: 'Wallet',
    categories: ['Wallet'],
    shortDescription: 'Resolve account ID for a wallet address',
    longDescription: 'Returns the numeric Sodex account ID (aid) for any wallet address by calling the perps state endpoint.',
    status: 'available',
    tier: 'public',
    mutates: false,
    verified: true,
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Wallet address (0x...)', pattern: '^0x[a-fA-F0-9]{40}$' }
      },
      required: ['address']
    }
  },
  {
    id: 'get_incoming_listings',
    name: 'Incoming Listings',
    category: 'Listings',
    status: 'available', tier: 'public',
    shortDescription: 'Upcoming / queued symbol listings (futures, spot, or all).',
    params: [
      { name: 'market', type: 'enum', enum: ['all', 'futures', 'spot'], default: 'all' },
    ],
    returns: { type: 'array', shape: '[{symbol,base,market,status,list_time?}]' },
    demo: 'IncomingListingsDemo',
    handler: get_incoming_listings,
  },

  // ── Search / Identity / Alias ───────────────────────────────────────────
  {
    id: 'resolve_refcode',
    name: 'Resolve Ref Code',
    category: 'Search & Identity',
    status: 'available', tier: 'public',
    shortDescription: 'Look up the wallet behind a Sodex referral code.',
    params: [
      { name: 'code', type: 'string', required: true, description: 'Referral code (≥3 chars).' },
    ],
    returns: { type: 'object', shape: { wallet: 'string|null', code: 'string', source: 'string' } },
    errors: { 400: 'Invalid code', 502: 'Upstream API unreachable' },
    relatedTools: ['get_alias', 'get_account_overview'],
    demo: 'ResolveRefcodeDemo',
    verified: true,
    handler: resolve_refcode,
  },
  {
    id: 'get_alias',
    name: 'Get Alias',
    category: 'Search & Identity',
    categories: ['Search & Identity', 'Aliases & Groups'],
    status: 'available', tier: 'user',
    shortDescription: 'Your saved alias + group for any wallet address (if tagged).',
    longDescription: 'Lets an AI check if the current user has labeled an address. Returns null if no alias is set.',
    params: [
      { name: 'address', type: 'string', required: true, pattern: ADDR_PATTERN },
    ],
    returns: { type: 'object', shape: { address: 'string', alias: 'string|null', group: 'string|null', group_color: 'string|null' } },
    relatedTools: ['alias_set', 'alias_delete', 'group_create'],
    demo: 'GetAliasDemo',
    verified: true,
    handler: get_alias,
  },

  // ── Alerts (read) ───────────────────────────────────────────────────────
  {
    id: 'list_alerts',
    name: 'List My Alerts',
    category: 'Alerts',
    status: 'available', tier: 'user',
    shortDescription: 'All alerts configured by the current user.',
    longDescription: 'Returns only the authenticated user\'s own alerts — filtered server-side by user_id from the Bearer JWT, so other users\' alerts are never reachable.',
    params: [],
    returns: { type: 'object', shape: { alerts: '[user_alert_settings row]' } },
    fullPageHref: '/alerts',
    relatedTools: ['alert_create', 'alert_update', 'alert_delete', 'alert_toggle'],
    demo: 'ListAlertsDemo',
    verified: true,
    handler: list_alerts,
  },

  // ── Alerts (write) ─────────────────────────────────────────────────────
  {
    id: 'alert_create',
    name: 'Create Alert',
    category: 'Alerts',
    status: 'available', tier: 'user',
    mutates: true,
    shortDescription: 'Create a price / PnL / wallet / listing alert.',
    params: [
      { name: 'type', type: 'string', required: true, description: 'Alert type (e.g. price, pnl, wallet).' },
      { name: 'target', type: 'string', required: true, description: 'Symbol or wallet address to watch.' },
      { name: 'thresholds', type: 'object', required: false, description: 'Trigger conditions object.' },
      { name: 'channels', type: 'object', required: false, description: 'Delivery channels, e.g. { telegram: true }.' },
      { name: 'label', type: 'string', required: false },
      { name: 'market', type: 'enum', enum: ['spot', 'perps'], default: 'perps' },
      { name: 'max_triggers', type: 'integer', min: 1, required: false, description: 'Stop firing after N triggers.' },
      { name: 'active_for', type: 'enum', enum: ['15m', '1h', '1w', '1mo', '90d', '100d', 'unlimited'], default: '90d' },
      { name: 'price_source', type: 'enum', enum: ['sodex', 'sosovalue'], default: 'sodex' },
    ],
    returns: { type: 'object', shape: { alert: 'user_alert_settings row' } },
    relatedTools: ['list_alerts', 'alert_update', 'alert_delete', 'alert_toggle'],
    demo: 'AlertCreateDemo',
    handler: alert_create,
  },
  {
    id: 'alert_update',
    name: 'Update Alert',
    category: 'Alerts',
    status: 'available', tier: 'user',
    mutates: true,
    shortDescription: 'Patch an existing alert by id.',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Alert row id.' },
      { name: 'label', type: 'string', required: false },
      { name: 'type', type: 'string', required: false },
      { name: 'target', type: 'string', required: false },
      { name: 'thresholds', type: 'object', required: false },
      { name: 'channels', type: 'object', required: false },
      { name: 'enabled', type: 'boolean', required: false },
      { name: 'market', type: 'enum', enum: ['spot', 'perps'], required: false },
      { name: 'max_triggers', type: 'integer', min: 1, required: false },
      { name: 'active_for', type: 'enum', enum: ['15m', '1h', '1w', '1mo', '90d', '100d', 'unlimited'], required: false },
      { name: 'price_source', type: 'enum', enum: ['sodex', 'sosovalue'], required: false },
    ],
    returns: { type: 'object', shape: { alert: 'user_alert_settings row' } },
    relatedTools: ['list_alerts', 'alert_delete', 'alert_toggle'],
    demo: 'AlertUpdateDemo',
    handler: alert_update,
  },
  {
    id: 'alert_delete',
    name: 'Delete Alert',
    category: 'Alerts',
    status: 'available', tier: 'user',
    mutates: true, destructive: true,
    shortDescription: 'Delete an alert by id.',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Alert row id.' },
    ],
    returns: { type: 'object', shape: { deleted: 'boolean' } },
    relatedTools: ['list_alerts', 'alert_create'],
    demo: 'AlertDeleteDemo',
    handler: alert_delete,
  },
  {
    id: 'alert_toggle',
    name: 'Toggle Alert',
    category: 'Alerts',
    status: 'available', tier: 'user',
    mutates: true,
    shortDescription: 'Enable or disable an alert.',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Alert row id.' },
      { name: 'enabled', type: 'boolean', required: true },
    ],
    returns: { type: 'object', shape: { id: 'string', enabled: 'boolean', label: 'string|null', type: 'string', target: 'string' } },
    relatedTools: ['list_alerts', 'alert_update'],
    demo: 'AlertToggleDemo',
    handler: alert_toggle,
  },

  // ── Write tools (tier: user, mutates: true) ─────────────────────────────
  {
    id: 'watchlist_add',
    name: 'Add to Watchlist',
    category: 'Watchlist',
    status: 'available', tier: 'user',
    mutates: true,
    shortDescription: 'Add a wallet to your watchlist.',
    params: [
      { name: 'address', type: 'string', required: true, pattern: ADDR_PATTERN },
    ],
    returns: { type: 'object', shape: { id: 'number', wallet_address: 'string', created_at: 'iso8601' } },
    errors: { 409: 'Already in watchlist' },
    relatedTools: ['watchlist_remove', 'alias_set'],
    demo: 'WatchlistAddDemo',
    handler: watchlist_add,
  },
  {
    id: 'watchlist_remove',
    name: 'Remove from Watchlist',
    category: 'Watchlist',
    status: 'available', tier: 'user',
    mutates: true, destructive: true,
    shortDescription: 'Remove a wallet from your watchlist.',
    params: [
      { name: 'address', type: 'string', required: true, pattern: ADDR_PATTERN },
    ],
    returns: { type: 'object', shape: { removed: 'boolean' } },
    relatedTools: ['watchlist_add'],
    demo: 'WatchlistRemoveDemo',
    handler: watchlist_remove,
  },
  {
    id: 'alias_set',
    name: 'Set Alias',
    category: 'Aliases & Groups',
    status: 'available', tier: 'user',
    mutates: true,
    shortDescription: 'Tag a wallet with a custom alias (upsert).',
    params: [
      { name: 'address', type: 'string', required: true, pattern: ADDR_PATTERN },
      { name: 'name', type: 'string', required: true, description: 'Alias label, 1–64 chars.' },
    ],
    returns: { type: 'object', shape: { id: 'string', wallet_address: 'string', tag_name: 'string' } },
    relatedTools: ['alias_delete', 'group_assign'],
    demo: 'AliasSetDemo',
    verified: true,
    handler: alias_set,
  },
  {
    id: 'alias_delete',
    name: 'Delete Alias',
    category: 'Aliases & Groups',
    status: 'available', tier: 'user',
    mutates: true, destructive: true,
    shortDescription: 'Remove your alias for a wallet address.',
    params: [
      { name: 'address', type: 'string', required: true, pattern: ADDR_PATTERN, description: 'EVM wallet address whose alias to remove.' },
    ],
    returns: { type: 'object', shape: { deleted: 'boolean' } },
    relatedTools: ['alias_set'],
    demo: 'AliasDeleteDemo',
    verified: true,
    handler: alias_delete,
  },
  {
    id: 'group_create',
    name: 'Create Alias Group',
    category: 'Aliases & Groups',
    status: 'available', tier: 'user',
    mutates: true,
    shortDescription: 'Create a color-coded group for organizing aliases.',
    params: [
      { name: 'name', type: 'string', required: true, description: 'Group name, 1–64 chars.' },
      { name: 'color', type: 'enum', enum: ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink', 'gray', 'brown'], default: 'blue' },
    ],
    returns: { type: 'object', shape: { id: 'string', group_name: 'string', group_color: 'string' } },
    relatedTools: ['group_assign', 'alias_set'],
    demo: 'GroupCreateDemo',
    verified: true,
    handler: group_create,
  },
  {
    id: 'group_assign',
    name: 'Assign to Group',
    category: 'Aliases & Groups',
    status: 'available', tier: 'user',
    mutates: true,
    shortDescription: 'Move an alias into a group, or remove it from its group (group_name: null).',
    params: [
      { name: 'address', type: 'string', required: true, pattern: ADDR_PATTERN, description: 'EVM wallet address.' },
      { name: 'group_name', type: 'string', required: false, description: 'Target group name, or omit/null to remove from group.' },
    ],
    returns: { type: 'object', shape: { id: 'string', wallet_address: 'string', tag_name: 'string', group_name: 'string|null' } },
    relatedTools: ['alias_set', 'group_create', 'get_alias'],
    demo: 'GroupAssignDemo',
    verified: true,
    handler: group_assign,
  },
]

// ──────────────────────────────────────────────────────────────────────────
// Planned tools (roadmap — no handler, no demo)
// ──────────────────────────────────────────────────────────────────────────
const PLANNED = [
  { id: 'get_equity', name: 'Equity + Margin', category: 'Account', status: 'planned', tier: 'public', shortDescription: 'Equity with margin / free-margin split.', plannedFeatures: ['Isolated + cross margin', 'Free margin calc'] },
  { id: 'get_unrealized_pnl', name: 'Unrealized PnL', category: 'Account', status: 'planned', tier: 'public', shortDescription: 'Sum of unrealized PnL across open positions.' },
  { id: 'get_cumulative_pnl', name: 'Cumulative PnL', category: 'Account', status: 'planned', tier: 'public', shortDescription: 'All-time realized PnL.' },
  { id: 'get_cumulative_volume', name: 'Cumulative Volume', category: 'Account', status: 'planned', tier: 'public', shortDescription: 'All-time traded volume.' },
  { id: 'get_leverage_bracket', name: 'Leverage Brackets', category: 'Account', status: 'planned', tier: 'public', shortDescription: 'Per-symbol leverage tiers.' },
  { id: 'get_net_delta', name: 'Net Delta', category: 'Account', status: 'planned', tier: 'public', shortDescription: 'Long/short bias across open positions.' },
  { id: 'get_avg_leverage', name: 'Avg Leverage', category: 'Account', status: 'planned', tier: 'public', shortDescription: 'Weighted average leverage of open positions.' },
  { id: 'get_win_rate', name: 'Win Rate', category: 'PnL & Performance', status: 'planned', tier: 'public', shortDescription: 'Win rate from position history with window filter.' },
  { id: 'get_sharpe_ratio', name: 'Sharpe Ratio', category: 'PnL & Performance', status: 'planned', tier: 'public', shortDescription: 'Sharpe from daily PnL series.' },
  { id: 'get_max_drawdown', name: 'Max Drawdown', category: 'PnL & Performance', status: 'planned', tier: 'public', shortDescription: 'Max drawdown from daily PnL.' },
  { id: 'get_performance_summary', name: 'Performance Summary', category: 'PnL & Performance', status: 'planned', tier: 'public', shortDescription: 'Win rate + Sharpe + drawdown + expectancy combined.' },
  { id: 'get_social_metadata', name: 'Social Metadata', category: 'Search & Identity', status: 'planned', tier: 'public', shortDescription: 'Discord / Telegram / Twitter handles if linked.' },
  { id: 'get_position_history', name: 'Position History', category: 'Positions', status: 'planned', tier: 'public', shortDescription: 'Closed positions with realized PnL.' },
  { id: 'get_biggest_position', name: 'Biggest Position', category: 'Positions', status: 'planned', tier: 'public', shortDescription: 'Single largest position by notional.' },
  { id: 'get_liquidation_prices', name: 'Liquidation Prices', category: 'Positions', status: 'planned', tier: 'public', shortDescription: 'Liquidation prices for all open positions.' },
  { id: 'get_pnl_window', name: 'PnL Window', category: 'PnL & Performance', status: 'planned', tier: 'public', shortDescription: 'PnL over a custom date range.' },
  { id: 'get_pnl_calendar', name: 'PnL Calendar', category: 'PnL & Performance', status: 'planned', tier: 'public', shortDescription: 'Calendar heatmap: rolling/weekly/monthly/yearly.' },
  { id: 'get_pnl_by_symbol', name: 'PnL by Symbol', category: 'PnL & Performance', status: 'planned', tier: 'public', shortDescription: 'PnL attribution per symbol over a window.' },
  { id: 'get_funding_by_symbol', name: 'Funding by Symbol', category: 'Funding', status: 'planned', tier: 'public', shortDescription: 'Funding totals per symbol over a window.' },
  { id: 'get_current_funding_rates', name: 'Current Funding Rates', category: 'Funding', status: 'planned', tier: 'public', shortDescription: 'Mark-time funding rates for open-position symbols.' },
  { id: 'get_deposits', name: 'Deposits', category: 'Transfers', status: 'planned', tier: 'public', shortDescription: 'Deposits only.' },
  { id: 'get_withdrawals', name: 'Withdrawals', category: 'Transfers', status: 'planned', tier: 'public', shortDescription: 'Withdrawals only.' },
  { id: 'get_transfer_totals', name: 'Transfer Totals', category: 'Transfers', status: 'planned', tier: 'public', shortDescription: 'Totals (in / out / net) over a window.' },
  { id: 'get_balance_delta', name: 'Balance Delta', category: 'Transfers', status: 'planned', tier: 'public', shortDescription: 'Net balance change, separating PnL from transfer contribution.' },
  { id: 'get_price', name: 'Get Price', category: 'Market Data', status: 'planned', tier: 'public', shortDescription: 'Single symbol mark price.' },
  { id: 'get_symbol_info', name: 'Symbol Info', category: 'Market Data', status: 'planned', tier: 'public', shortDescription: 'Tick / min size / max leverage for a symbol.' },
  { id: 'get_top_pairs', name: 'Top Pairs', category: 'Market Data', status: 'planned', tier: 'public', shortDescription: 'Most-traded pairs by volume.' },
  { id: 'get_market_overview', name: 'Market Overview', category: 'Market Data', status: 'planned', tier: 'public', shortDescription: 'BTC/ETH snapshot + platform aggregates.' },
  { id: 'get_order_book', name: 'Order Book Depth', category: 'Market Data', status: 'planned', tier: 'public', shortDescription: 'Bid/ask depth for a symbol.' },
  { id: 'get_liquidations', name: 'Liquidations Feed', category: 'Market Data', status: 'planned', tier: 'public', shortDescription: 'Recent liquidations stream.' },
  { id: 'get_etf_flows', name: 'ETF Flows', category: 'Market Data', status: 'planned', tier: 'public', shortDescription: 'BTC/ETH ETF net flows.' },
  { id: 'get_soso_index', name: 'SoSo Index', category: 'Market Data', status: 'planned', tier: 'public', shortDescription: 'Sentiment index.' },

  { id: 'compare_traders', name: 'Compare Traders', category: 'Traders', status: 'planned', tier: 'public', shortDescription: 'Side-by-side stats for N wallets.' },
  { id: 'reverse_search', name: 'Reverse Search', category: 'Search & Identity', status: 'planned', tier: 'public', shortDescription: 'Identity → wallet (ENS, handle, ref code).' },
  { id: 'resolve_any', name: 'Resolve Any', category: 'Search & Identity', status: 'planned', tier: 'public', shortDescription: 'Best-effort classify+resolve any input string.' },
  { id: 'get_aliases_bulk', name: 'Bulk Aliases', category: 'Search & Identity', status: 'planned', tier: 'user', shortDescription: 'Aliases for many addresses at once.' },
  { id: 'get_groups', name: 'List Groups', category: 'Aliases & Groups', status: 'planned', tier: 'user', shortDescription: 'All alias groups for the current user.' },
  { id: 'get_group_members', name: 'Group Members', category: 'Aliases & Groups', status: 'planned', tier: 'user', shortDescription: 'Wallets inside a group.' },
  { id: 'verify_trade_screenshot', name: 'Verify Trade Screenshot', category: 'LARP', status: 'planned', tier: 'public', shortDescription: 'OCR + on-chain match: LARP / LEGIT / POSSIBLE.' },
  { id: 'ocr_trade_screenshot', name: 'OCR Screenshot', category: 'LARP', status: 'planned', tier: 'public', shortDescription: 'OCR step only — returns parsed fields.' },
  { id: 'get_sopoints_config', name: 'SoPoints Config', category: 'SoPoints', status: 'planned', tier: 'public', shortDescription: 'Current distribution parameters.' },
  { id: 'get_sopoints_leaderboard', name: 'SoPoints Leaderboard', category: 'SoPoints', status: 'planned', tier: 'public', shortDescription: 'Paginated SoPoints ranking.' },
  { id: 'get_sopoints_countdown', name: 'SoPoints Countdown', category: 'SoPoints', status: 'planned', tier: 'public', shortDescription: 'Time until next distribution.' },
  { id: 'get_my_sopoints_estimate', name: 'My SoPoints Estimate', category: 'SoPoints', status: 'planned', tier: 'user', shortDescription: 'Own estimated weekly points.' },
  { id: 'get_referral_code', name: 'My Referral Code', category: 'Referral', status: 'planned', tier: 'user', shortDescription: 'Own referral code + lifetime summary stats.' },
  {
    id: 'get_referral_stats',
    name: 'Referral Stats',
    category: 'Referral',
    status: 'planned',
    tier: 'user',
    shortDescription: 'Full referral analytics: referral count, referred volume, rebates earned, and leaderboard rank.',
    longDescription: 'Returns comprehensive referral program analytics for a wallet or code. Covers active and all-time referral counts, aggregate trading volume produced by referred wallets, cumulative rebate earnings, and whether the referrer currently ranks in the top 100 leaderboard.',
    plannedFeatures: [
      'Active and all-time referral count',
      'Total trading volume generated by referred wallets',
      'Rebate earnings (USD + token breakdown)',
      'Top-100 leaderboard rank check for the referrer',
      'Monthly trend data and conversion rate',
    ],
    params: [
      { name: 'code',    type: 'string', required: false, description: 'Referral code to analyse (resolved to wallet automatically).' },
      { name: 'address', type: 'string', required: false, description: 'Referrer wallet address (alternative to code).' },
    ],
    eta: 'Q3 2025',
  },
  { id: 'get_referral_list', name: 'Referral List', category: 'Referral', status: 'planned', tier: 'user', shortDescription: 'Referred wallets with 30D PnL, volume, and rebate contribution.' },
  { id: 'get_alert', name: 'Get Alert', category: 'Alerts', status: 'planned', tier: 'user', shortDescription: 'One alert by id.' },
  { id: 'get_alert_history', name: 'Alert History', category: 'Alerts', status: 'planned', tier: 'user', shortDescription: 'Triggered alerts feed.' },
  { id: 'alert_test_fire', name: 'Test-Fire Alert', category: 'Alerts', status: 'planned', tier: 'user', shortDescription: 'Dry-run an alert condition without persisting.' },
  { id: 'watchlist_list', name: 'Watchlist', category: 'Watchlist', status: 'planned', tier: 'user', shortDescription: "List wallets on the user's watchlist." },
  { id: 'watchlist_clear', name: 'Clear Watchlist', category: 'Watchlist', status: 'planned', tier: 'user', mutates: true, destructive: true, shortDescription: 'Remove every wallet from watchlist.' },
  { id: 'alias_rename', name: 'Rename Alias', category: 'Aliases & Groups', status: 'planned', tier: 'user', mutates: true, shortDescription: 'Rename an existing alias.' },
  { id: 'alias_bulk_set', name: 'Bulk Set Aliases', category: 'Aliases & Groups', status: 'planned', tier: 'user', mutates: true, shortDescription: 'Upsert many aliases at once.' },
  { id: 'group_rename', name: 'Rename Group', category: 'Aliases & Groups', status: 'planned', tier: 'user', mutates: true, shortDescription: 'Rename an alias group.' },
  { id: 'group_recolor', name: 'Recolor Group', category: 'Aliases & Groups', status: 'planned', tier: 'user', mutates: true, shortDescription: 'Change a group color.' },
  { id: 'group_delete', name: 'Delete Group', category: 'Aliases & Groups', status: 'planned', tier: 'user', mutates: true, destructive: true, shortDescription: 'Delete an alias group.' },
  { id: 'group_bulk_assign', name: 'Bulk Group Assign', category: 'Aliases & Groups', status: 'planned', tier: 'user', mutates: true, shortDescription: 'Bulk-assign aliases to a group.' },
  { id: 'follow_trader', name: 'Follow Trader', category: 'Copy Trading', status: 'planned', tier: 'user', mutates: true, shortDescription: 'Subscribe to a leader with size/symbol rules.' },
  { id: 'unfollow_trader', name: 'Unfollow Trader', category: 'Copy Trading', status: 'planned', tier: 'user', mutates: true, destructive: true, shortDescription: 'Unsubscribe from a leader.' },
  { id: 'update_follow_settings', name: 'Update Follow Settings', category: 'Copy Trading', status: 'planned', tier: 'user', mutates: true, shortDescription: 'Change size/symbol/stop rules for a leader.' },
  { id: 'list_followed', name: 'List Followed', category: 'Copy Trading', status: 'planned', tier: 'user', shortDescription: 'Leaders the user is currently subscribed to.' },
  { id: 'profile_get', name: 'Profile', category: 'Profile', status: 'planned', tier: 'user', shortDescription: 'Current user profile.' },
  { id: 'profile_set_own_wallet', name: 'Set Own Wallet', category: 'Profile', status: 'planned', tier: 'user', mutates: true, shortDescription: 'Link or unlink own wallet.' },
  { id: 'profile_toggle_show_zero_data', name: 'Toggle "Show Zero Data"', category: 'Profile', status: 'planned', tier: 'user', mutates: true, shortDescription: 'Toggle the zero-data visibility flag.' },
  { id: 'profile_link_telegram', name: 'Link Telegram', category: 'Profile', status: 'planned', tier: 'user', mutates: true, shortDescription: 'Start the Telegram linking flow.' },
  { id: 'profile_unlink_telegram', name: 'Unlink Telegram', category: 'Profile', status: 'planned', tier: 'user', mutates: true, destructive: true, shortDescription: 'Unlink Telegram.' },
  { id: 'aggregator_save_layout', name: 'Save Dashboard Layout', category: 'Aggregator', status: 'planned', tier: 'user', mutates: true, shortDescription: 'Persist widget layout.' },
  { id: 'aggregator_reset_layout', name: 'Reset Dashboard', category: 'Aggregator', status: 'planned', tier: 'user', mutates: true, destructive: true, shortDescription: 'Reset to defaults.' },
  { id: 'aggregator_apply_template', name: 'Apply Dashboard Template', category: 'Aggregator', status: 'planned', tier: 'user', mutates: true, shortDescription: 'Apply a preset layout.' },
  { id: 'list_widgets', name: 'List Widgets', category: 'Aggregator', status: 'planned', tier: 'public', shortDescription: 'Enumerate aggregator widget types.' },
  { id: 'content_create', name: 'Create Content', category: 'Content Planner', status: 'planned', tier: 'user', mutates: true, shortDescription: 'Create a content-library item.' },
  { id: 'content_schedule', name: 'Schedule Content', category: 'Content Planner', status: 'planned', tier: 'user', mutates: true, shortDescription: 'Add content to the calendar.' },
  { id: 'admin_usage_get', name: 'Admin Usage', category: 'Admin', status: 'planned', tier: 'owner', shortDescription: 'System usage stats.' },
  { id: 'admin_announcement_set', name: 'Set Announcement', category: 'Admin', status: 'planned', tier: 'owner', mutates: true, shortDescription: 'Set or clear the site announcement banner.' },
  { id: 'admin_navbar_update', name: 'Update Navbar', category: 'Admin', status: 'planned', tier: 'owner', mutates: true, shortDescription: 'Edit navigation items.' },
]

export const TOOLS = [...AVAILABLE, ...PLANNED]

export const TOOL_BY_ID = Object.fromEntries(TOOLS.map(t => [t.id, t]))

export function listCategories() {
  const seen = new Set()
  for (const t of TOOLS) seen.add(t.category)
  return Array.from(seen)
}

// Handler resolver — does NOT leak into the manifest.
export function resolveHandler(id: string) {
  const t = TOOL_BY_ID[id] as { handler?: (...args: unknown[]) => unknown } | undefined
  if (!t) return null
  return t.handler ?? null
}

// For compatibility with handlers that want the shared wallet fetcher.
export { fetchWallet }
