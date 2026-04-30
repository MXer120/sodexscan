// ─── Sodex / Exchange domain types ───────────────────────────────────────────

export interface SodexSymbol {
  symbol: string
  baseCoin: string
  quoteCoin: string
  contractType?: string
  status?: string
}

export interface PerpsTicker {
  symbol: string
  markPrice: string
  indexPrice: string
  lastPrice: string
  openInterest: string
  volume24h: string
  priceChangePercent24h: string
  fundingRate?: string
  nextFundingTime?: number
}

export interface SpotTicker {
  symbol: string
  lastPrice: string
  bidPrice: string
  askPrice: string
  volume: string
  quoteVolume: string
  priceChangePercent: string
}

export interface Position {
  symbol: string
  positionAmt: string
  entryPrice: string
  markPrice: string
  unrealizedProfit: string
  leverage: string
  marginType: string
  isolatedMargin?: string
  liquidationPrice?: string
  side: 'LONG' | 'SHORT'
}

export interface Trade {
  id: string
  symbol: string
  side: 'BUY' | 'SELL'
  price: string
  qty: string
  quoteQty: string
  realizedPnl: string
  commission: string
  time: number
}

export interface Balance {
  asset: string
  free: string
  locked: string
  total: string
  usdValue?: number
}

// ─── Supabase table row types ─────────────────────────────────────────────────

export interface Profile {
  id: string
  user_id: string
  own_wallet: string | null
  discord_id: string | null
  telegram_chat_id: string | null
  theme: string | null
  created_at: string
  updated_at: string
}

export interface AccountMapping {
  account_id: number
  wallet_address: string
  created_at: string
}

export interface Alert {
  id: string
  user_id: string
  symbol: string
  type: 'price_level' | 'price_movement'
  direction: 'above' | 'below' | 'any'
  threshold: number
  price_type: 'mark' | 'mid' | 'bid' | 'ask'
  active_for: string | null
  expires_at: string | null
  triggered: boolean
  trigger_count: number
  last_triggered_at: string | null
  created_at: string
}

export interface AlertSetting {
  user_id: string
  telegram_enabled: boolean
  telegram_chat_id: string | null
  updated_at: string
}

export interface WatchlistEntry {
  id: string
  user_id: string
  wallet_address: string
  label: string | null
  created_at: string
}

export interface NavConfigItem {
  path: string
  label: string
  enabled: boolean
  tag: string | null
  sort_order: number
  in_more: boolean
}

export interface PageConfig {
  path: string
  visible: boolean
  permission: string | null
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  account_id: number
  wallet_address: string
  rank: number
  pnl?: number
  volume?: number
  roi?: number
  display_name?: string
}

export interface WeeklyLeaderboardEntry extends LeaderboardEntry {
  week_num: number
  spot_volume?: number
  perps_volume?: number
  total_volume?: number
  points?: number
}

// ─── Copy Trading ─────────────────────────────────────────────────────────────

export interface CopyTrader {
  account_id: number
  wallet_address: string
  display_name?: string
  pnl_30d?: number
  win_rate?: number
  followers?: number
  tags?: string[]
}

// ─── Tools system ─────────────────────────────────────────────────────────────

export interface ToolParam {
  name: string
  type: string
  required: boolean
  description: string
  default?: unknown
}

export interface ToolDefinition {
  id: string
  name: string
  category: string
  surface: string
  status: string
  tier: string
  shortDescription: string
  longDescription: string
  features: string[]
  params: ToolParam[]
  returns?: string
  example?: unknown
  destructive?: boolean
}

export interface ToolValidationResult {
  ok: true
  value: Record<string, unknown>
}

export interface ToolValidationError {
  ok: false
  error: string
  code: number
  field?: string
}

export type ToolValidation = ToolValidationResult | ToolValidationError

export interface ToolResult {
  ok: boolean
  error?: string
  code?: number
  tool?: ToolDefinition
  version?: string
  field?: string
  value?: unknown
}

// ─── API response shapes ──────────────────────────────────────────────────────

export interface SodexApiResponse<T = unknown> {
  code: number
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface PriceMap {
  [symbol: string]: {
    mark?: number
    mid?: number
    bid?: number
    ask?: number
  }
}

// ─── Aggregator ───────────────────────────────────────────────────────────────

export interface WidgetConfig {
  id: string
  type: string
  title?: string
  settings?: Record<string, unknown>
  position?: { x: number; y: number; w: number; h: number }
}

export interface AggregatorLayout {
  id: string
  user_id: string
  name: string
  widgets: WidgetConfig[]
  created_at: string
  updated_at: string
}

// ─── Next.js helpers ──────────────────────────────────────────────────────────

export type RouteParams<T extends Record<string, string> = Record<string, string>> = {
  params: T
}

export type ApiResponse<T = unknown> = Response & { json(): Promise<T> }
