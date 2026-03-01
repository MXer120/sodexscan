'use client'

import { lazy } from 'react'

// ── Existing widgets ───────────────────────────────────────────────
const TopPairsWidget = lazy(() => import('./widgets/TopPairsWidget'))
const NewTradersWidget = lazy(() => import('./widgets/NewTradersWidget'))
const PerpsLeaderboardWidget = lazy(() => import('./widgets/PerpsLeaderboardWidget'))
const SpotLeaderboardWidget = lazy(() => import('./widgets/SpotLeaderboardWidget'))
const WeeklyPerpsLBWidget = lazy(() => import('./widgets/WeeklyPerpsLBWidget'))
const WeeklySpotLBWidget = lazy(() => import('./widgets/WeeklySpotLBWidget'))
const SnapshotCountdownWidget = lazy(() => import('./widgets/SnapshotCountdownWidget'))
const EstimatedRewardWidget = lazy(() => import('./widgets/EstimatedRewardWidget'))
const WeekTableWidget = lazy(() => import('./widgets/WeekTableWidget'))
const PointsLeaderboardWidget = lazy(() => import('./widgets/PointsLeaderboardWidget'))
const ReferralCodeWidget = lazy(() => import('./widgets/ReferralCodeWidget'))
const WatchlistWidget = lazy(() => import('./widgets/WatchlistWidget'))
const UserGrowthChartWidget = lazy(() => import('./widgets/UserGrowthChartWidget'))
const MilestoneProjectionWidget = lazy(() => import('./widgets/MilestoneProjectionWidget'))
const UpcomingListingsWidget = lazy(() => import('./widgets/UpcomingListingsWidget'))
const ReverseSearchWidget = lazy(() => import('./widgets/ReverseSearchWidget'))

// ── New scanner widgets ────────────────────────────────────────────
const AccountValueWidget = lazy(() => import('./widgets/AccountValueWidget'))
const AccountEquityWidget = lazy(() => import('./widgets/AccountEquityWidget'))
const FuturesStatsWidget = lazy(() => import('./widgets/FuturesStatsWidget'))
const FuturesPerformanceWidget = lazy(() => import('./widgets/FuturesPerformanceWidget'))
const DepositWithdrawalWidget = lazy(() => import('./widgets/DepositWithdrawalWidget'))
const RankingsWidget = lazy(() => import('./widgets/RankingsWidget'))
const SocialInfoWidget = lazy(() => import('./widgets/SocialInfoWidget'))
const PnlChartWidget = lazy(() => import('./widgets/PnlChartWidget'))
const PnlCalendarWidget = lazy(() => import('./widgets/PnlCalendarWidget'))
const ActivityTimelineWidget = lazy(() => import('./widgets/ActivityTimelineWidget'))
const PositionsWidget = lazy(() => import('./widgets/PositionsWidget'))
const BalancesWidget = lazy(() => import('./widgets/BalancesWidget'))
const TradesWidget = lazy(() => import('./widgets/TradesWidget'))
const TransfersWidget = lazy(() => import('./widgets/TransfersWidget'))
const PerformanceWidget = lazy(() => import('./widgets/PerformanceWidget'))
const MasterElementWidget = lazy(() => import('./widgets/MasterElementWidget'))

// smH / mdH = default h for sm (2-col) / md (6-col) breakpoints
export const WIDGET_REGISTRY = {
  // ── Market ─────────────────────────────────────────────────────
  'top-pairs': {
    component: TopPairsWidget,
    label: 'Top Pairs',
    description: 'Ranked pairs by 24h volume',
    category: 'market',
    defaultSize: { w: 4, h: 5, minW: 2, minH: 3 }, smH: 15, mdH: 5,
    defaultSettings: { filter: 'All' },
    settingsSchema: [
      { key: 'filter', type: 'select', label: 'Filter', options: ['All', 'Spot', 'Futures'] }
    ],
    visibilitySchema: [
      { key: 'showCoinLogos', label: 'Coin Logos', default: true },
      { key: 'showRank', label: 'Rank Column', default: true },
      { key: 'showVolume', label: 'Volume Column', default: true }
    ]
  },
  'new-traders': {
    component: NewTradersWidget,
    label: 'New Traders',
    description: 'Latest traders by first trade',
    category: 'market',
    defaultSize: { w: 4, h: 5, minW: 2, minH: 3 }, smH: 15, mdH: 5,
    defaultSettings: {},
    settingsSchema: [],
    visibilitySchema: []
  },
  'upcoming-listings': {
    component: UpcomingListingsWidget,
    label: 'Upcoming Listings',
    description: 'Upcoming spot & futures listings',
    category: 'market',
    defaultSize: { w: 4, h: 5, minW: 2, minH: 3 }, smH: 15, mdH: 5,
    defaultSettings: { filter: 'All' },
    settingsSchema: [
      { key: 'filter', type: 'select', label: 'Filter', options: ['All', 'Spot', 'Futures'] }
    ],
    visibilitySchema: []
  },

  // ── Leaderboards ───────────────────────────────────────────────
  'perps-leaderboard': {
    component: PerpsLeaderboardWidget,
    label: 'Perps Leaderboard',
    description: 'Top perps traders',
    category: 'leaderboard',
    defaultSize: { w: 6, h: 6, minW: 2, minH: 3 }, smH: 18, mdH: 6,
    defaultSettings: { sortBy: 'volume', timeRange: 'all', excludeSodex: true },
    settingsSchema: [
      { key: 'sortBy', type: 'select', label: 'Sort By', options: ['volume', 'pnl'] },
      { key: 'excludeSodex', type: 'toggle', label: 'Exclude Sodex' }
    ],
    visibilitySchema: [
      { key: 'showCoinLogos', label: 'Coin Logos', default: true },
      { key: 'showRank', label: 'Rank Column', default: true },
      { key: 'showWallet', label: 'Wallet Column', default: true },
      { key: 'showVolume', label: 'Volume Column', default: true },
      { key: 'showPnl', label: 'PnL Column', default: true }
    ]
  },
  'spot-leaderboard': {
    component: SpotLeaderboardWidget,
    label: 'Spot Leaderboard',
    description: 'Top spot traders by volume',
    category: 'leaderboard',
    defaultSize: { w: 6, h: 6, minW: 2, minH: 3 }, smH: 18, mdH: 6,
    defaultSettings: { timeRange: 'all' },
    settingsSchema: [],
    visibilitySchema: []
  },
  'weekly-perps-lb': {
    component: WeeklyPerpsLBWidget,
    label: 'Weekly Perps LB',
    description: 'Weekly perps leaderboard',
    category: 'leaderboard',
    defaultSize: { w: 6, h: 6, minW: 2, minH: 3 }, smH: 18, mdH: 6,
    defaultSettings: { sortBy: 'volume', weekOffset: 0 },
    settingsSchema: [
      { key: 'sortBy', type: 'select', label: 'Sort By', options: ['volume', 'pnl'] },
      { key: 'weekOffset', type: 'select', label: 'Week', options: [0, 1, 2, 3, 4], optionLabels: ['Current (Live)', 'Last Week', '2 Weeks Ago', '3 Weeks Ago', '4 Weeks Ago'] }
    ],
    visibilitySchema: []
  },
  'weekly-spot-lb': {
    component: WeeklySpotLBWidget,
    label: 'Weekly Spot LB',
    description: 'Weekly spot leaderboard',
    category: 'leaderboard',
    defaultSize: { w: 6, h: 6, minW: 2, minH: 3 }, smH: 18, mdH: 6,
    defaultSettings: { weekOffset: 0 },
    settingsSchema: [
      { key: 'weekOffset', type: 'select', label: 'Week', options: [0, 1, 2, 3, 4], optionLabels: ['Current (Live)', 'Last Week', '2 Weeks Ago', '3 Weeks Ago', '4 Weeks Ago'] }
    ],
    visibilitySchema: []
  },

  // ── SoPoints ───────────────────────────────────────────────────
  'snapshot-countdown': {
    component: SnapshotCountdownWidget,
    label: 'Snapshot Countdown',
    description: 'Time until next SoPoints snapshot',
    category: 'sopoints',
    defaultSize: { w: 3, h: 2, minW: 2, minH: 2 }, smH: 6, mdH: 2,
    defaultSettings: {},
    settingsSchema: [],
    visibilitySchema: [
      { key: 'showLabel', label: '"Next Snapshot" Label', default: true }
    ]
  },
  'estimated-reward': {
    component: EstimatedRewardWidget,
    label: 'Estimated Reward',
    description: 'Your estimated SoPoints reward',
    category: 'sopoints',
    defaultSize: { w: 3, h: 2, minW: 2, minH: 2 }, smH: 6, mdH: 2,
    defaultSettings: {},
    settingsSchema: [],
    visibilitySchema: []
  },
  'week-table': {
    component: WeekTableWidget,
    label: 'Week Table',
    description: 'SoPoints week statistics',
    category: 'sopoints',
    defaultSize: { w: 6, h: 5, minW: 2, minH: 3 }, smH: 14, mdH: 5,
    defaultSettings: {},
    settingsSchema: [],
    visibilitySchema: []
  },
  'points-leaderboard': {
    component: PointsLeaderboardWidget,
    label: 'Points Leaderboard',
    description: 'SoPoints rankings',
    category: 'sopoints',
    defaultSize: { w: 6, h: 6, minW: 2, minH: 3 }, smH: 18, mdH: 6,
    defaultSettings: {},
    settingsSchema: [],
    visibilitySchema: []
  },

  // ── Social ─────────────────────────────────────────────────────
  'referral-codes': {
    component: ReferralCodeWidget,
    label: 'Referral Codes',
    description: 'Browse referral codes',
    category: 'social',
    defaultSize: { w: 4, h: 5, minW: 2, minH: 3 }, smH: 14, mdH: 5,
    defaultSettings: {},
    settingsSchema: [],
    visibilitySchema: []
  },
  'watchlist': {
    component: WatchlistWidget,
    label: 'Watchlist',
    description: 'Your tracked wallets',
    category: 'social',
    defaultSize: { w: 6, h: 5, minW: 2, minH: 3 }, smH: 14, mdH: 5,
    defaultSettings: {},
    settingsSchema: [],
    visibilitySchema: []
  },

  // ── Platform ───────────────────────────────────────────────────
  'user-growth-chart': {
    component: UserGrowthChartWidget,
    label: 'User Growth Chart',
    description: 'Platform user growth with projection',
    category: 'platform',
    defaultSize: { w: 6, h: 4, minW: 2, minH: 2 }, smH: 12, mdH: 4,
    defaultSettings: { timeframeDays: 30, projectionDays: 7 },
    settingsSchema: [
      { key: 'timeframeDays', type: 'select', label: 'Timeframe', options: [7, 30, 90, null], optionLabels: ['1W', '1M', '3M', 'ALL'] },
      { key: 'projectionDays', type: 'select', label: 'Projection', options: [1, 2, 7, 30], optionLabels: ['24h', '48h', '7d', '30d'] }
    ],
    visibilitySchema: [
      { key: 'showPrediction', label: 'Prediction Line', default: true },
      { key: 'showMilestone', label: 'Milestone Markers', default: true }
    ]
  },
  'milestone-projection': {
    component: MilestoneProjectionWidget,
    label: 'Milestone Projection',
    description: 'User milestone ETAs',
    category: 'platform',
    defaultSize: { w: 3, h: 4, minW: 2, minH: 3 }, smH: 12, mdH: 4,
    defaultSettings: {},
    settingsSchema: [],
    visibilitySchema: []
  },

  // ── Tools ──────────────────────────────────────────────────────
  'reverse-search': {
    component: ReverseSearchWidget,
    label: 'Reverse Search',
    description: 'Find wallets by partial address',
    category: 'tools',
    defaultSize: { w: 6, h: 5, minW: 2, minH: 2 }, smH: 14, mdH: 5,
    defaultSettings: {},
    settingsSchema: [],
    visibilitySchema: [
      { key: 'showHelpers', label: 'Display Helpers', default: true }
    ]
  },

  // ── Scanner (wallet-specific) ──────────────────────────────────
  'account-value': {
    component: AccountValueWidget,
    label: 'Account Value',
    description: 'Total account value for a wallet',
    category: 'scanner',
    defaultSize: { w: 3, h: 2, minW: 2, minH: 2 }, smH: 6, mdH: 2,
    defaultSettings: { walletAddress: '' },
    settingsSchema: [
      { key: 'walletAddress', type: 'text', label: 'Wallet Address' }
    ],
    visibilitySchema: []
  },
  'account-equity': {
    component: AccountEquityWidget,
    label: 'Account Equity',
    description: 'Futures, Spot & Vault balances',
    category: 'scanner',
    defaultSize: { w: 3, h: 3, minW: 2, minH: 2 }, smH: 8, mdH: 3,
    defaultSettings: { walletAddress: '' },
    settingsSchema: [
      { key: 'walletAddress', type: 'text', label: 'Wallet Address' }
    ],
    visibilitySchema: [
      { key: 'showFutures', label: 'Futures Balance', default: true },
      { key: 'showSpot', label: 'Spot Balance', default: true }
    ]
  },
  'futures-stats': {
    component: FuturesStatsWidget,
    label: 'Futures Stats',
    description: 'Unrealized PnL, leverage, all-time stats',
    category: 'scanner',
    defaultSize: { w: 3, h: 3, minW: 2, minH: 2 }, smH: 8, mdH: 3,
    defaultSettings: { walletAddress: '' },
    settingsSchema: [
      { key: 'walletAddress', type: 'text', label: 'Wallet Address' }
    ],
    visibilitySchema: [
      { key: 'showUnrealizedPnl', label: 'Unrealized PnL', default: true },
      { key: 'showAvgLeverage', label: 'Avg Leverage', default: true },
      { key: 'showAllTimePnl', label: 'All Time PnL', default: true },
      { key: 'showAllTimeVolume', label: 'All Time Volume', default: true }
    ]
  },
  'futures-perf': {
    component: FuturesPerformanceWidget,
    label: 'Win Rate / Sharpe',
    description: 'Win rate & Sharpe ratio',
    category: 'scanner',
    defaultSize: { w: 3, h: 2, minW: 2, minH: 2 }, smH: 6, mdH: 2,
    defaultSettings: { walletAddress: '' },
    settingsSchema: [
      { key: 'walletAddress', type: 'text', label: 'Wallet Address' }
    ],
    visibilitySchema: []
  },
  'deposit-withdrawal': {
    component: DepositWithdrawalWidget,
    label: 'Deposit / Withdrawal',
    description: 'Deposited, withdrawn & delta',
    category: 'scanner',
    defaultSize: { w: 3, h: 3, minW: 2, minH: 2 }, smH: 8, mdH: 3,
    defaultSettings: { walletAddress: '' },
    settingsSchema: [
      { key: 'walletAddress', type: 'text', label: 'Wallet Address' }
    ],
    visibilitySchema: []
  },
  'rankings': {
    component: RankingsWidget,
    label: 'Rankings',
    description: 'PnL & volume rank for a wallet',
    category: 'scanner',
    defaultSize: { w: 3, h: 2, minW: 2, minH: 2 }, smH: 6, mdH: 2,
    defaultSettings: { walletAddress: '' },
    settingsSchema: [
      { key: 'walletAddress', type: 'text', label: 'Wallet Address' }
    ],
    visibilitySchema: []
  },
  'social-info': {
    component: SocialInfoWidget,
    label: 'Social Info',
    description: 'Referral code, Discord, Telegram, X',
    category: 'scanner',
    defaultSize: { w: 3, h: 3, minW: 2, minH: 2 }, smH: 8, mdH: 3,
    defaultSettings: { walletAddress: '' },
    settingsSchema: [
      { key: 'walletAddress', type: 'text', label: 'Wallet Address' }
    ],
    visibilitySchema: []
  },
  'pnl-chart': {
    component: PnlChartWidget,
    label: 'PnL Chart',
    description: 'Cumulative & daily PnL chart',
    category: 'scanner',
    defaultSize: { w: 6, h: 4, minW: 2, minH: 2 }, smH: 12, mdH: 4,
    defaultSettings: { walletAddress: '', timeframe: '1M' },
    settingsSchema: [
      { key: 'walletAddress', type: 'text', label: 'Wallet Address' },
      { key: 'timeframe', type: 'select', label: 'Timeframe', options: ['1W', '1M', '3M', '1Y', 'ALL'] }
    ],
    visibilitySchema: [
      { key: 'showCumulative', label: 'Cumulative Line', default: true },
      { key: 'showDaily', label: 'Daily Bars', default: true }
    ]
  },
  'pnl-calendar': {
    component: PnlCalendarWidget,
    label: 'PnL Calendar',
    description: 'Calendar heatmap of daily PnL',
    category: 'scanner',
    defaultSize: { w: 6, h: 4, minW: 2, minH: 2 }, smH: 12, mdH: 4,
    defaultSettings: { walletAddress: '', view: 'monthly' },
    settingsSchema: [
      { key: 'walletAddress', type: 'text', label: 'Wallet Address' },
      { key: 'view', type: 'select', label: 'View', options: ['monthly', 'weekly', 'yearly'] }
    ],
    visibilitySchema: []
  },
  'activity-timeline': {
    component: ActivityTimelineWidget,
    label: 'Activity Feed',
    description: 'Recent trades, deposits, withdrawals',
    category: 'scanner',
    defaultSize: { w: 4, h: 5, minW: 2, minH: 2 }, smH: 14, mdH: 5,
    defaultSettings: { walletAddress: '' },
    settingsSchema: [
      { key: 'walletAddress', type: 'text', label: 'Wallet Address' }
    ],
    visibilitySchema: [
      { key: 'showCoinLogos', label: 'Trade Coin Logos', default: true },
      { key: 'showTransferIcons', label: 'Transfer Icons', default: true },
      { key: 'showDepositIcons', label: 'Deposit Icons', default: true },
      { key: 'showWithdrawIcons', label: 'Withdraw Icons', default: true }
    ]
  },
  'positions': {
    component: PositionsWidget,
    label: 'Open Positions',
    description: 'Active futures positions',
    category: 'scanner',
    defaultSize: { w: 6, h: 5, minW: 2, minH: 2 }, smH: 15, mdH: 5,
    defaultSettings: { walletAddress: '' },
    settingsSchema: [
      { key: 'walletAddress', type: 'text', label: 'Wallet Address' }
    ],
    visibilitySchema: [
      { key: 'showCoinLogos', label: 'Coin Logos', default: true },
      { key: 'showSide', label: 'Side Column', default: true },
      { key: 'showSize', label: 'Size Column', default: true },
      { key: 'showEntry', label: 'Entry Column', default: true },
      { key: 'showLeverage', label: 'Leverage Column', default: true },
      { key: 'showMargin', label: 'Margin Column', default: true },
      { key: 'showPnl', label: 'PnL Column', default: true }
    ]
  },
  'balances': {
    component: BalancesWidget,
    label: 'Balances',
    description: 'Futures & spot coin balances',
    category: 'scanner',
    defaultSize: { w: 6, h: 5, minW: 2, minH: 2 }, smH: 15, mdH: 5,
    defaultSettings: { walletAddress: '', balanceType: 'futures' },
    settingsSchema: [
      { key: 'walletAddress', type: 'text', label: 'Wallet Address' },
      { key: 'balanceType', type: 'select', label: 'Type', options: ['futures', 'spot'] }
    ],
    visibilitySchema: [
      { key: 'showCoinLogos', label: 'Coin Logos', default: true },
      { key: 'showBalance', label: 'Balance Column', default: true },
      { key: 'showAvailable', label: 'Available Column', default: true },
      { key: 'showFrozen', label: 'Frozen Column', default: true }
    ]
  },
  'trades': {
    component: TradesWidget,
    label: 'Trade History',
    description: 'Closed positions & trades',
    category: 'scanner',
    defaultSize: { w: 6, h: 5, minW: 2, minH: 2 }, smH: 15, mdH: 5,
    defaultSettings: { walletAddress: '' },
    settingsSchema: [
      { key: 'walletAddress', type: 'text', label: 'Wallet Address' }
    ],
    visibilitySchema: [
      { key: 'showCoinLogos', label: 'Coin Logos', default: true },
      { key: 'showSide', label: 'Side Column', default: true },
      { key: 'showSize', label: 'Size Column', default: true },
      { key: 'showEntry', label: 'Entry Column', default: true },
      { key: 'showClose', label: 'Close Column', default: true },
      { key: 'showPnl', label: 'PnL Column', default: true },
      { key: 'showFees', label: 'Fees Column', default: true },
      { key: 'showDates', label: 'Date Column', default: true }
    ]
  },
  'transfers': {
    component: TransfersWidget,
    label: 'Transfers',
    description: 'Withdrawals & fund transfers',
    category: 'scanner',
    defaultSize: { w: 6, h: 5, minW: 2, minH: 2 }, smH: 15, mdH: 5,
    defaultSettings: { walletAddress: '' },
    settingsSchema: [
      { key: 'walletAddress', type: 'text', label: 'Wallet Address' }
    ],
    visibilitySchema: [
      { key: 'showCoinLogos', label: 'Coin Logos', default: true },
      { key: 'showType', label: 'Type Column', default: true },
      { key: 'showCoin', label: 'Coin Column', default: true },
      { key: 'showAmount', label: 'Amount Column', default: true },
      { key: 'showTime', label: 'Time Column', default: true }
    ]
  },
  'performance': {
    component: PerformanceWidget,
    label: 'Performance',
    description: 'Trade & asset performance analysis',
    category: 'scanner',
    defaultSize: { w: 6, h: 5, minW: 2, minH: 2 }, smH: 15, mdH: 5,
    defaultSettings: { walletAddress: '', view: 'trade' },
    settingsSchema: [
      { key: 'walletAddress', type: 'text', label: 'Wallet Address' },
      { key: 'view', type: 'select', label: 'View', options: ['trade', 'asset'] }
    ],
    visibilitySchema: [
      { key: 'showCoinLogos', label: 'Coin Logos', default: true }
    ]
  },

  // ── Containers ──────────────────────────────────────────────────
  'master-element': {
    component: MasterElementWidget,
    label: 'Master Element',
    description: 'Container that holds multiple sub-widgets',
    category: 'containers',
    defaultSize: { w: 6, h: 6, minW: 2, minH: 2 }, smH: 20, mdH: 6,
    defaultSettings: { columns: 2, subWidgets: [] },
    settingsSchema: [
      { key: 'columns', type: 'select', label: 'Columns', options: [1, 2, 3, 4], optionLabels: ['1', '2', '3', '4'] }
    ],
    visibilitySchema: []
  }
}

export const WIDGET_CATEGORIES = {
  market: { label: 'Market', icon: '📊' },
  leaderboard: { label: 'Leaderboards', icon: '🏆' },
  sopoints: { label: 'SoPoints', icon: '⭐' },
  social: { label: 'Social', icon: '👥' },
  platform: { label: 'Platform', icon: '📈' },
  tools: { label: 'Tools', icon: '🔧' },
  scanner: { label: 'Scanner', icon: '🔍' },
  containers: { label: 'Containers', icon: '📦' }
}

// ── Preset Templates ───────────────────────────────────────────────
// Read-only page presets mirroring the main site sections.
// Loaded by copy — no templateId linkage.
export const PRESET_TEMPLATES = [
  {
    id: 'preset-scan',
    name: 'Scan',
    icon: '🔍',
    description: 'Wallet scanner with PnL, positions & trades',
    layouts: {
      lg: [
        { i: 'ps-acv',   x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
        { i: 'ps-ace',   x: 3, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
        { i: 'ps-fst',   x: 6, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
        { i: 'ps-rnk',   x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
        { i: 'ps-pnlc',  x: 0, y: 3, w: 6, h: 4, minW: 2, minH: 2 },
        { i: 'ps-pos',   x: 6, y: 3, w: 6, h: 5, minW: 2, minH: 2 },
        { i: 'ps-trd',   x: 0, y: 7, w: 6, h: 5, minW: 2, minH: 2 },
        { i: 'ps-bal',   x: 6, y: 8, w: 6, h: 5, minW: 2, minH: 2 },
      ],
      md: [
        { i: 'ps-acv',   x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
        { i: 'ps-ace',   x: 3, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
        { i: 'ps-fst',   x: 0, y: 3, w: 3, h: 3, minW: 2, minH: 2 },
        { i: 'ps-rnk',   x: 3, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
        { i: 'ps-pnlc',  x: 0, y: 6, w: 6, h: 4, minW: 2, minH: 2 },
        { i: 'ps-pos',   x: 0, y: 10, w: 6, h: 5, minW: 2, minH: 2 },
        { i: 'ps-trd',   x: 0, y: 15, w: 6, h: 5, minW: 2, minH: 2 },
        { i: 'ps-bal',   x: 0, y: 20, w: 6, h: 5, minW: 2, minH: 2 },
      ],
      sm: [
        { i: 'ps-acv',   x: 0, y: 0,  w: 2, h: 2 },
        { i: 'ps-ace',   x: 0, y: 2,  w: 2, h: 3 },
        { i: 'ps-fst',   x: 0, y: 5,  w: 2, h: 3 },
        { i: 'ps-rnk',   x: 0, y: 8,  w: 2, h: 2 },
        { i: 'ps-pnlc',  x: 0, y: 10, w: 2, h: 4 },
        { i: 'ps-pos',   x: 0, y: 14, w: 2, h: 5 },
        { i: 'ps-trd',   x: 0, y: 19, w: 2, h: 5 },
        { i: 'ps-bal',   x: 0, y: 24, w: 2, h: 5 },
      ],
    },
    widgets: {
      'ps-acv':  { type: 'account-value',  settings: { walletAddress: '' } },
      'ps-ace':  { type: 'account-equity', settings: { walletAddress: '' } },
      'ps-fst':  { type: 'futures-stats',  settings: { walletAddress: '' } },
      'ps-rnk':  { type: 'rankings',       settings: { walletAddress: '' } },
      'ps-pnlc': { type: 'pnl-chart',      settings: { walletAddress: '', timeframe: '1M' } },
      'ps-pos':  { type: 'positions',      settings: { walletAddress: '' } },
      'ps-trd':  { type: 'trades',         settings: { walletAddress: '' } },
      'ps-bal':  { type: 'balances',       settings: { walletAddress: '', balanceType: 'futures' } },
    },
  },
  {
    id: 'preset-leaderboard',
    name: 'Leaderboard',
    icon: '🏆',
    description: 'Perps, spot & weekly rankings',
    layouts: {
      lg: [
        { i: 'pl-perp',  x: 0, y: 0,  w: 6, h: 6, minW: 2, minH: 2 },
        { i: 'pl-spot',  x: 6, y: 0,  w: 6, h: 6, minW: 2, minH: 2 },
        { i: 'pl-wperp', x: 0, y: 6,  w: 6, h: 6, minW: 2, minH: 2 },
        { i: 'pl-wspot', x: 6, y: 6,  w: 6, h: 6, minW: 2, minH: 2 },
        { i: 'pl-pairs', x: 0, y: 12, w: 4, h: 5, minW: 2, minH: 2 },
        { i: 'pl-new',   x: 4, y: 12, w: 4, h: 5, minW: 2, minH: 2 },
      ],
      md: [
        { i: 'pl-perp',  x: 0, y: 0,  w: 6, h: 6 },
        { i: 'pl-spot',  x: 0, y: 6,  w: 6, h: 6 },
        { i: 'pl-wperp', x: 0, y: 12, w: 6, h: 6 },
        { i: 'pl-wspot', x: 0, y: 18, w: 6, h: 6 },
        { i: 'pl-pairs', x: 0, y: 24, w: 3, h: 5 },
        { i: 'pl-new',   x: 3, y: 24, w: 3, h: 5 },
      ],
      sm: [
        { i: 'pl-perp',  x: 0, y: 0,  w: 2, h: 6 },
        { i: 'pl-spot',  x: 0, y: 6,  w: 2, h: 6 },
        { i: 'pl-wperp', x: 0, y: 12, w: 2, h: 6 },
        { i: 'pl-wspot', x: 0, y: 18, w: 2, h: 6 },
        { i: 'pl-pairs', x: 0, y: 24, w: 2, h: 5 },
        { i: 'pl-new',   x: 0, y: 29, w: 2, h: 5 },
      ],
    },
    widgets: {
      'pl-perp':  { type: 'perps-leaderboard', settings: { sortBy: 'volume', excludeSodex: true } },
      'pl-spot':  { type: 'spot-leaderboard',  settings: { timeRange: 'all' } },
      'pl-wperp': { type: 'weekly-perps-lb',   settings: { sortBy: 'volume' } },
      'pl-wspot': { type: 'weekly-spot-lb',    settings: {} },
      'pl-pairs': { type: 'top-pairs',         settings: { filter: 'All' } },
      'pl-new':   { type: 'new-traders',       settings: {} },
    },
  },
  {
    id: 'preset-sopoints',
    name: 'SoPoints',
    icon: '⭐',
    description: 'Snapshot timer, rewards & points rankings',
    layouts: {
      lg: [
        { i: 'psp-cd',   x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
        { i: 'psp-rw',   x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
        { i: 'psp-wt',   x: 6, y: 0, w: 6, h: 5, minW: 2, minH: 2 },
        { i: 'psp-plb',  x: 0, y: 2, w: 6, h: 6, minW: 2, minH: 2 },
        { i: 'psp-tp',   x: 6, y: 5, w: 6, h: 5, minW: 2, minH: 2 },
      ],
      md: [
        { i: 'psp-cd',   x: 0, y: 0,  w: 3, h: 2 },
        { i: 'psp-rw',   x: 3, y: 0,  w: 3, h: 2 },
        { i: 'psp-wt',   x: 0, y: 2,  w: 6, h: 5 },
        { i: 'psp-plb',  x: 0, y: 7,  w: 6, h: 6 },
        { i: 'psp-tp',   x: 0, y: 13, w: 6, h: 5 },
      ],
      sm: [
        { i: 'psp-cd',   x: 0, y: 0,  w: 2, h: 2 },
        { i: 'psp-rw',   x: 0, y: 2,  w: 2, h: 2 },
        { i: 'psp-wt',   x: 0, y: 4,  w: 2, h: 5 },
        { i: 'psp-plb',  x: 0, y: 9,  w: 2, h: 6 },
        { i: 'psp-tp',   x: 0, y: 15, w: 2, h: 5 },
      ],
    },
    widgets: {
      'psp-cd':  { type: 'snapshot-countdown', settings: {} },
      'psp-rw':  { type: 'estimated-reward',   settings: {} },
      'psp-wt':  { type: 'week-table',         settings: {} },
      'psp-plb': { type: 'points-leaderboard', settings: {} },
      'psp-tp':  { type: 'top-pairs',          settings: { filter: 'All' } },
    },
  },
  {
    id: 'preset-platform',
    name: 'Platform',
    icon: '📈',
    description: 'User growth, milestones & market overview',
    layouts: {
      lg: [
        { i: 'pp-ugc',   x: 0, y: 0, w: 8, h: 4, minW: 2, minH: 2 },
        { i: 'pp-mp',    x: 8, y: 0, w: 4, h: 4, minW: 2, minH: 3 },
        { i: 'pp-tp',    x: 0, y: 4, w: 4, h: 5, minW: 2, minH: 2 },
        { i: 'pp-nt',    x: 4, y: 4, w: 4, h: 5, minW: 2, minH: 2 },
        { i: 'pp-ul',    x: 8, y: 4, w: 4, h: 5, minW: 2, minH: 2 },
      ],
      md: [
        { i: 'pp-ugc',   x: 0, y: 0,  w: 6, h: 4 },
        { i: 'pp-mp',    x: 0, y: 4,  w: 3, h: 4 },
        { i: 'pp-tp',    x: 3, y: 4,  w: 3, h: 5 },
        { i: 'pp-nt',    x: 0, y: 9,  w: 3, h: 5 },
        { i: 'pp-ul',    x: 3, y: 9,  w: 3, h: 5 },
      ],
      sm: [
        { i: 'pp-ugc',   x: 0, y: 0,  w: 2, h: 4 },
        { i: 'pp-mp',    x: 0, y: 4,  w: 2, h: 4 },
        { i: 'pp-tp',    x: 0, y: 8,  w: 2, h: 5 },
        { i: 'pp-nt',    x: 0, y: 13, w: 2, h: 5 },
        { i: 'pp-ul',    x: 0, y: 18, w: 2, h: 5 },
      ],
    },
    widgets: {
      'pp-ugc': { type: 'user-growth-chart',   settings: { timeframeDays: 30, projectionDays: 7 } },
      'pp-mp':  { type: 'milestone-projection', settings: {} },
      'pp-tp':  { type: 'top-pairs',           settings: { filter: 'All' } },
      'pp-nt':  { type: 'new-traders',         settings: {} },
      'pp-ul':  { type: 'upcoming-listings',   settings: { filter: 'All' } },
    },
  },
  {
    id: 'preset-socials',
    name: 'Socials',
    icon: '👥',
    description: 'Watchlist, referrals & new trader feed',
    layouts: {
      lg: [
        { i: 'pso-wl',  x: 0, y: 0, w: 6, h: 5, minW: 2, minH: 2 },
        { i: 'pso-ref', x: 6, y: 0, w: 6, h: 5, minW: 2, minH: 2 },
        { i: 'pso-nt',  x: 0, y: 5, w: 6, h: 5, minW: 2, minH: 2 },
        { i: 'pso-rs',  x: 6, y: 5, w: 6, h: 5, minW: 2, minH: 2 },
      ],
      md: [
        { i: 'pso-wl',  x: 0, y: 0,  w: 6, h: 5 },
        { i: 'pso-ref', x: 0, y: 5,  w: 6, h: 5 },
        { i: 'pso-nt',  x: 0, y: 10, w: 6, h: 5 },
        { i: 'pso-rs',  x: 0, y: 15, w: 6, h: 5 },
      ],
      sm: [
        { i: 'pso-wl',  x: 0, y: 0,  w: 2, h: 5 },
        { i: 'pso-ref', x: 0, y: 5,  w: 2, h: 5 },
        { i: 'pso-nt',  x: 0, y: 10, w: 2, h: 5 },
        { i: 'pso-rs',  x: 0, y: 15, w: 2, h: 5 },
      ],
    },
    widgets: {
      'pso-wl':  { type: 'watchlist',      settings: {} },
      'pso-ref': { type: 'referral-codes', settings: {} },
      'pso-nt':  { type: 'new-traders',    settings: {} },
      'pso-rs':  { type: 'reverse-search', settings: {} },
    },
  },
]

// ── V2 Default Layout ──────────────────────────────────────────────
// Scan preset copied inline so DEFAULT_LAYOUT_V2 doesn't import PRESET_TEMPLATES
// (avoids circular reference issues at module init time)
const _scanPreset = PRESET_TEMPLATES[0]

export const DEFAULT_LAYOUT_V2 = {
  version: 2,
  navDock: 'left',
  navPosition: null,
  navExpanded: false,
  activePageIndex: 0,
  globalWallet: '',
  pages: [{
    name: 'Scan',
    templateId: null,
    defaultWallet: '',
    layouts: JSON.parse(JSON.stringify(_scanPreset.layouts)),
    widgets: JSON.parse(JSON.stringify(_scanPreset.widgets)),
  }],
  templates: [],
  quickLinks: [],
  folders: []
}

// Keep v1 export for backwards compat during migration
export const DEFAULT_LAYOUT = DEFAULT_LAYOUT_V2
