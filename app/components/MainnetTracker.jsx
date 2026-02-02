import React, { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import ChartCard from './ChartCard'
import PnlCalendar from './PnlCalendar'
import { TimeSelector } from './ui/TimeSelector'
import { getSodexIdFromWallet } from '../lib/accountResolver'
import { globalCache } from '../lib/globalCache'
import { supabase } from '../lib/supabaseClient'
import '../styles/ScannerGrid.css'


import { motion, AnimatePresence } from 'framer-motion'
import { useWatchlist } from '../hooks/useWatchlist'
import { useWalletTags, useAddTag, useRenameTag, useDeleteTag, useAssignToGroup, useWalletGroups } from '../hooks/useWalletTags'
import { useSessionContext } from '../lib/SessionContext'
const LOGO_BASE_URL = 'https://yifkydhsbflzfprteots.supabase.co/storage/v1/object/public/coin-logos/'

const LOGO_EXTENSIONS = {
  hype: 'jpg', pump: 'jpg', trump: 'jpg', wld: 'jpg', xlm: 'jpg', ton: 'jpg',
  mag7: 'png', soso: 'png', silver: 'svg', wif: 'jpeg'
}

const LOGO_ALIASES = {
  mag7ssi: 'mag7', pepe: '1000pepe', shib: '1000shib', bonk: '1000bonk'
}

const getCoinLogoUrl = (symbol) => {
  if (!symbol) return null
  let lower = symbol.toLowerCase()
  if (LOGO_ALIASES[lower]) lower = LOGO_ALIASES[lower]
  const ext = LOGO_EXTENSIONS[lower] || 'png'
  return `${LOGO_BASE_URL}${lower}.${ext}`
}

// Will be populated from API - maps symbol (e.g. "BTC-USD") to baseCoin (e.g. "BTC")
let coinRegistry = {}

// Quote currencies - never return these as display names
const QUOTE_CURRENCIES = ['USD', 'USDT', 'USDE', 'DAI']

const getBaseCoin = (symbol, registry = coinRegistry) => {
  if (!symbol) return ''
  let clean = symbol.toString().trim()
  let cleanUpper = clean.toUpperCase()

  // Special cases
  if (cleanUpper === 'WSOSO') return 'SOSO'
  // USD variants should show as USDC
  if (cleanUpper === 'USD' || cleanUpper === 'VUSD') return 'USDC'

  // Direct lookup in registry (exact match)
  if (registry[cleanUpper]) return registry[cleanUpper]

  // Wrapped/alias coin mappings
  const coinMap = {
    'WETH': 'ETH', 'WBTC': 'BTC', 'WBNB': 'BNB',
    'WUSDC': 'USDC', 'WUSDT': 'USDT', 'USDbC': 'USDC',
    'VUSDC': 'USDC', 'USDT': 'USDC', 'USDE': 'USDC', 'DAI': 'USDC'
  }
  if (coinMap[cleanUpper]) return coinMap[cleanUpper]

  // Split by common separators
  const parts = clean.split(/[_./-]/)

  // Check if any part is in registry values (known base coins)
  const knownBaseCoins = new Set(Object.values(registry))
  for (const part of parts) {
    let uc = part.toUpperCase()
    // Skip quote currencies
    if (QUOTE_CURRENCIES.includes(uc)) continue
    // Check mapped
    if (coinMap[uc]) return coinMap[uc]
    // Check if it's a known base coin
    if (knownBaseCoins.has(uc)) return uc
    // Strip v/w prefix and check again
    if (/^[VW][A-Z]/.test(uc)) {
      let stripped = uc.slice(1)
      if (coinMap[stripped]) return coinMap[stripped]
      if (knownBaseCoins.has(stripped)) return stripped
      // Return stripped if not a quote currency
      if (!QUOTE_CURRENCIES.includes(stripped)) return stripped
    }
  }

  // Handle network prefixes (e.g. BASE_ETH)
  const networks = ['BASE', 'ARB', 'OP', 'POLYGON', 'BSC', 'SONIC', 'HYPER', 'ETH']
  if (networks.includes(parts[0].toUpperCase()) && parts.length > 1) {
    let candidate = getBaseCoin(parts.slice(1).join('_'), registry)
    if (candidate && !QUOTE_CURRENCIES.includes(candidate)) return candidate
  }

  // Fallback: return first non-quote part
  for (const part of parts) {
    let uc = part.toUpperCase()
    if (/^[vw][A-Z]/.test(uc)) uc = uc.slice(1)
    if (!QUOTE_CURRENCIES.includes(uc) && uc !== 'USDC') return uc
  }

  // Last resort: if everything is quote currency, return USDC
  return 'USDC'
}

const CoinLogo = ({ symbol, size = '18px' }) => {
  const logoUrl = getCoinLogoUrl(symbol)
  const [show, setShow] = useState(() => {
    if (!logoUrl) return false
    const cached = globalCache.getCoinLogoStatus(logoUrl)
    return cached === null ? true : cached
  })

  if (!logoUrl || !show) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px',
        color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0
      }}>
        {symbol?.slice(0, 1).toUpperCase()}
      </div>
    )
  }

  return (
    <img
      src={logoUrl} alt={symbol}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      onLoad={() => globalCache.setCoinLogoStatus(logoUrl, true)}
      onError={() => { globalCache.setCoinLogoStatus(logoUrl, false); setShow(false) }}
    />
  )
}

// Copyable address component
const CopyableAddress = ({ address, truncated = true }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  const displayAddr = truncated ? `${address.slice(0, 6)}...${address.slice(-4)}` : address

  return (
    <span className="copyable-address" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span className="addr-text">{displayAddr}</span>
      <button
        className="copy-btn"
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy address'}
        style={{
          background: 'transparent',
          border: 'none',
          padding: '2px',
          cursor: 'pointer',
          opacity: 1,
          transition: 'opacity 0.2s',
          display: 'inline-flex',
          alignItems: 'center'
        }}
      >
        {copied ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>
      <style>{`
        .copyable-address .copy-btn { opacity: 1 !important; }
        .copy-btn:hover svg { stroke: #4ade80; }
      `}</style>
    </span>
  )
}

const TransactionBadge = ({ type, color, bgColor, icon }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '2px 4px', gap: '2px', whiteSpace: 'nowrap', borderRadius: '2px',
    backgroundColor: bgColor, color: color, width: 'fit-content', height: 'fit-content'
  }}>
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icon}
    </svg>
    <span style={{ fontSize: '10px', fontWeight: '500' }}>{type}</span>
  </div>
)

const TransactionTypeBadge = ({ type }) => {
  const t = type.toLowerCase()
  if (t.includes('transfer')) {
    return (
      <TransactionBadge
        type="Transfer" color="#3B82F6" bgColor="rgba(59, 130, 246, 0.15)"
        icon={<><path d="M8 3 4 7l4 4" /><path d="M4 7h16" /><path d="m16 21 4-4-4-4" /><path d="M20 17H4" /></>}
      />
    )
  }
  if (t.includes('deposit')) {
    return (
      <TransactionBadge
        type="Deposit" color="#33AF80" bgColor="rgba(51, 175, 128, 0.15)"
        icon={<><path d="M7 13l5 5 5-5" /><path d="M12 18V6" /></>}
      />
    )
  }
  if (t.includes('withdraw')) {
    return (
      <TransactionBadge
        type="Withdrawal" color="#DB324D" bgColor="rgba(219, 50, 77, 0.15)"
        icon={<><path d="M7 11l5-5 5 5" /><path d="M12 18V6" /></>}
      />
    )
  }
  return <span style={{ fontSize: '11px' }}>{type}</span>
}

const SideBadge = ({ side, leverage, BULLISH_COLOR, BEARISH_COLOR }) => {
  const s = (side || '').toString().toUpperCase()
  const isLong = s === 'LONG' || s === '2'
  const color = isLong ? BULLISH_COLOR : BEARISH_COLOR
  const bgColor = isLong ? 'rgba(51, 175, 128, 0.15)' : 'rgba(219, 50, 77, 0.15)'
  const label = isLong ? 'Long' : 'Short'

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: '2px 6px', gap: '4px', whiteSpace: 'nowrap', borderRadius: '4px',
      backgroundColor: bgColor, color: color, width: 'fit-content', border: `1px solid ${color}33`
    }}>
      <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>{label}</span>
      {leverage && (
        <span style={{ fontSize: '10px', fontWeight: '500', opacity: 0.8, borderLeft: `1px solid ${color}44`, paddingLeft: '4px' }}>
          {leverage}x
        </span>
      )}
    </div>
  )
}

const getWithdrawalTypeMeta = (w) => {
  const t = (w.type || '').toLowerCase()
  const isInternal = t.includes('transfer')
  const isDeposit = t.includes('deposit') && !isInternal
  const isWithdraw = t.includes('withdraw') && !isInternal
  const typeLabel = t.includes('spot to fund') ? 'Transfer' :
    isInternal ? 'Transfer' :
      isDeposit ? 'Deposit' :
        isWithdraw ? 'Withdraw' : (w.type || '')
  return { isDeposit, isWithdraw, isInternal: isInternal || t.includes('spot to fund'), typeLabel }
}

// Formatter that handles large strings and prevents scientific notation/rounding
const formatPreciseAmount = (amount, decimals) => {
  if (amount === undefined || amount === null || amount === '') return '0'
  try {
    let s = amount.toString().split('.')[0]
    if (!s || s === '0') return '0'
    const raw = BigInt(s)
    const div = BigInt(10) ** BigInt(decimals)
    const integral = raw / div
    const fractional = raw % div
    if (fractional === BigInt(0)) return integral.toString()
    let fracStr = fractional.toString().padStart(decimals, '0')
    fracStr = fracStr.replace(/0+$/, '')
    return integral.toString() + '.' + fracStr
  } catch (e) {
    const val = parseFloat(amount) / Math.pow(10, decimals)
    return val.toLocaleString('en-US', { maximumFractionDigits: decimals, useGrouping: false })
  }
}

const formatCoin = (amount, decimals) => formatPreciseAmount(amount, decimals)

// Calculate liquidation price for a position
// Formula: Long: liqPrice = entryPrice * (1 - 1/leverage + MMR)
//          Short: liqPrice = entryPrice * (1 + 1/leverage - MMR)
const calculateLiquidationPrice = (pos, brackets) => {
  const entryPrice = parseFloat(pos.entryPrice || 0)
  const positionSize = parseFloat(pos.positionSize || 0)
  const leverage = parseFloat(pos.leverage || 1)
  const isLong = pos.positionSide === 'LONG' || pos.positionSide === '2' || pos.positionSide === 2
  const isolatedMargin = parseFloat(pos.isolatedMargin || 0)

  if (!entryPrice || !positionSize || !leverage) return 0

  // Get maintenance margin rate from brackets based on position notional value
  const notionalValue = positionSize * entryPrice
  let mmr = 0.004 // Default 0.4% if no bracket found

  const symbolBrackets = brackets[pos.symbol] || []
  for (const bracket of symbolBrackets) {
    const maxNotional = parseFloat(bracket.notionalCap || bracket.maxNotional || Infinity)
    if (notionalValue <= maxNotional) {
      mmr = parseFloat(bracket.maintMarginRate || bracket.mmr || 0.004)
      break
    }
  }

  // For isolated margin positions, use margin-based calculation
  // Liq Price = Entry Price ± (Margin - Maintenance Margin) / Position Size
  if (isolatedMargin > 0) {
    const maintenanceMargin = notionalValue * mmr
    if (isLong) {
      // Long: price drops, liquidated when loss exceeds (margin - maintenance)
      return entryPrice - (isolatedMargin - maintenanceMargin) / positionSize
    } else {
      // Short: price rises, liquidated when loss exceeds (margin - maintenance)
      return entryPrice + (isolatedMargin - maintenanceMargin) / positionSize
    }
  }

  // Fallback to leverage-based approximation
  if (isLong) {
    return entryPrice * (1 - 1 / leverage + mmr)
  } else {
    return entryPrice * (1 + 1 / leverage - mmr)
  }
}

export default function MainnetTracker({ walletAddress, accountId: propAccountId, searchBox, tagSection }) {
  const [accountId, setAccountId] = useState(propAccountId || null)
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingStep, setLoadingStep] = useState('Initializing scan...')
  const [activeTab, setActiveTab] = useState('Positions')
  const [manualIdInput, setManualIdInput] = useState('')
  const [balanceView, setBalanceView] = useState('Spot')
  const [notFound, setNotFound] = useState(false)

  // Using global cache that persists across component mounts (navigation)

  // Data states
  const [accountDetails, setAccountDetails] = useState(null)
  const [spotBalances, setSpotBalances] = useState([])
  const [fundTransfers, setFundTransfers] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [assetRegistry, setAssetRegistry] = useState({
    '0xcb7F80Dff2727c791fA491722c428e6657f7e2c6': { symbol: 'USDC', decimals: 6 },
    '0x40320022Ed613E638284f6F2220831E09FAB0E3B': { symbol: 'USDC', decimals: 6 },
    '0xD76544025769c13496Bf4a6c2b4E67eAD3F857D8': { symbol: 'ETH', decimals: 18 },
    '0x0000000000000000000000000000000000000000': { symbol: 'ETH', decimals: 18 },
    '0x3887A01Af83E53c960469d60908DEB83748f22FB': { symbol: 'MAG7.ssi', decimals: 8 }
  })
  const [pnlHistory, setPnlHistory] = useState([])
  const [pnlViewMode, setPnlViewMode] = useState('chart') // 'chart' | 'calendar'
  const [calendarView, setCalendarView] = useState('monthly') // 'weekly' | 'monthly' | 'yearly'
  const [positions, setPositions] = useState([])
  const [positionHistory, setPositionHistory] = useState([])
  const [totalAssets, setTotalAssets] = useState(0)
  const [symbolMap, setSymbolMap] = useState({})
  const [leverageBrackets, setLeverageBrackets] = useState({})
  const [leaderboardStats, setLeaderboardStats] = useState({ rank: null, volumeRank: null })
  const [overviewStats, setOverviewStats] = useState({ volume: 0, cumulativePnl: 0 })
  const [markPrices, setMarkPrices] = useState({})
  const [socialData, setSocialData] = useState({ dc_username: null, tg_username: null, tg_displayname: null, ref_code: null })
  const [socialTooltip, setSocialTooltip] = useState(null) // 'refcode' | 'discord' | 'telegram' | 'x' | null

  // Infinite Scroll Limits
  const [positionsLimit, setPositionsLimit] = useState(20)
  const [withdrawalsLimit, setWithdrawalsLimit] = useState(20)
  const [tradesLimit, setTradesLimit] = useState(20)
  const [performanceLimit, setPerformanceLimit] = useState(20)
  const [balancesLimit, setBalancesLimit] = useState(20)
  const [ordersLimit, setOrdersLimit] = useState(20)
  const [activityLimit, setActivityLimit] = useState(50)

  // Sorting states
  const [withdrawSortField, setWithdrawSortField] = useState('date')
  const [withdrawSortDir, setWithdrawSortDir] = useState('desc')
  const [positionSortField, setPositionSortField] = useState(null)
  const [positionSortDir, setPositionSortDir] = useState('desc')
  const [balanceSortField, setBalanceSortField] = useState(null)
  const [balanceSortDir, setBalanceSortDir] = useState('desc')
  const [tradeSortField, setTradeSortField] = useState('date')
  const [tradeSortDir, setTradeSortDir] = useState('desc')

  // Sidebar hooks & state
  const { user } = useSessionContext()
  const { watchlist, addToWatchlist, removeFromWatchlistByAddress, isAdding, isRemoving } = useWatchlist()
  const { data: tags } = useWalletTags()
  const { data: groups } = useWalletGroups()
  const addTag = useAddTag()
  const renameTag = useRenameTag()
  const deleteTag = useDeleteTag()
  const assignToGroup = useAssignToGroup()

  const [showEditMenu, setShowEditMenu] = useState(false)
  const [isEditingAlias, setIsEditingAlias] = useState(false)
  const [aliasInput, setAliasInput] = useState('')
  // Scroll state for sticky header (history tab)
  const historyHeaderRef = useRef(null)
  const historyContainerRef = useRef(null)

  // Mobile check
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900)
    handleResize() // Init
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const editMenuRef = useRef(null)
  const aliasInputRef = useRef(null)

  const activeTag = tags?.find(t => t.wallet_address.toLowerCase() === (walletAddress || '').toLowerCase())
  const isInWatchlist = watchlist?.some(w => w.wallet_address.toLowerCase() === (walletAddress || '').toLowerCase())

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (editMenuRef.current && !editMenuRef.current.contains(event.target)) {
        setShowEditMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (isEditingAlias && aliasInputRef.current) {
      aliasInputRef.current.focus()
    }
  }, [isEditingAlias])

  // Universal colors
  const BULLISH_COLOR = '#33AF80'
  const BEARISH_COLOR = '#DB324D'

  const totalUnrealizedPnl = positions.reduce((sum, pos) =>
    sum + parseFloat(pos.unrealizedProfit || 0), 0)

  // Calculations for sidebar
  const statsSummary = useMemo(() => {
    // 1. Account Equity
    const futuresValue = parseFloat(accountDetails?.balances?.[0]?.walletBalance || 0)
    const spotValue = totalAssets - futuresValue // totalAssets already includes futures vUSDC in the calc logic of fetchAllData
    const vaultValue = 0 // Placeholder/API not currently providing separate vault field

    // 2. Futures Stats & Sentiment
    const unrealized = totalUnrealizedPnl
    const avgLev = positions.length > 0
      ? positions.reduce((sum, p) => sum + parseFloat(p.leverage), 0) / positions.length
      : 0
    const allTimePnl = pnlHistory.length > 0 ? pnlHistory[pnlHistory.length - 1].cumulative : 0
    const allTimeVol = overviewStats.volume

    // Net Delta & Sentiment (Relative to Futures Equity)
    const futuresEquity = futuresValue + unrealized
    const netDelta = positions.reduce((sum, p) => {
      const sizeParsed = parseFloat(p.positionSize || p.positionAmt || 0)
      const pSide = (p.positionSide || '').toString().toUpperCase()
      const isLong = pSide === 'LONG' || pSide === '2' || (pSide === 'BOTH' && sizeParsed > 0)
      const isShort = pSide === 'SHORT' || pSide === '1' || (pSide === 'BOTH' && sizeParsed < 0)

      // Precise Notional Calculation
      let notional = Math.abs(parseFloat(p.notional || p.notionalValue || 0))
      if (notional === 0) {
        const symbol = p.symbol || ''
        const mPrice = parseFloat(markPrices[symbol] || p.markPrice || 0)
        notional = Math.abs(sizeParsed * mPrice)
      }
      if (notional === 0) {
        notional = Math.abs(parseFloat(p.isolatedMargin || 0) * parseFloat(p.leverage || 0))
      }

      if (isLong) return sum + notional
      if (isShort) return sum - notional
      return sum
    }, 0)

    // 3. Performance
    const completedTrades = positionHistory.filter(p => parseFloat(p.max_size) > 0)
    const wins = completedTrades.filter(p => parseFloat(p.realized_pnl) > 0).length
    const winRate = completedTrades.length > 0 ? (wins / completedTrades.length) * 100 : 0

    // Sharpe Ratio calculation
    let sharpe = 0
    if (pnlHistory.length > 1) {
      const dailyPnLs = pnlHistory.map(h => h.daily)
      const mean = dailyPnLs.reduce((a, b) => a + b, 0) / dailyPnLs.length
      const variance = dailyPnLs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / dailyPnLs.length
      const stdDev = Math.sqrt(variance)
      if (stdDev > 0) {
        sharpe = (mean / stdDev) * Math.sqrt(365)
      }
    }

    const deltaRatio = futuresEquity > 0 ? netDelta / futuresEquity : 0
    const absRatio = Math.abs(deltaRatio)
    const sideLabel = deltaRatio > 0.02 ? 'LONG' : (deltaRatio < -0.02 ? 'SHORT' : '')

    let rating = 'Neutral'
    let sentimentColor = 'rgba(255,255,255,0.4)'

    if (absRatio > 5.0) rating = 'Extremely'
    else if (absRatio > 2.0) rating = 'Very'
    else if (absRatio > 0.5) rating = ''
    else if (absRatio > 0.1) rating = 'Slightly'

    const sentiment = sideLabel ? `${rating} ${sideLabel}`.trim() : 'Neutral'
    if (deltaRatio > 0.02) sentimentColor = BULLISH_COLOR
    else if (deltaRatio < -0.02) sentimentColor = BEARISH_COLOR

    return {
      futuresValue, spotValue, vaultValue,
      unrealized, avgLev, allTimePnl, allTimeVol,
      winRate, sharpe,
      sentiment, sentimentColor
    }
  }, [accountDetails, totalAssets, positions, pnlHistory, overviewStats, totalUnrealizedPnl, positionHistory])

  const handleWithdrawSort = (field) => {
    setWithdrawalsLimit(20)
    setWithdrawSortDir(prev => withdrawSortField === field && prev === 'desc' ? 'asc' : 'desc')
    setWithdrawSortField(field)
  }

  const handlePositionSort = (field) => {
    setPositionSortDir(prev => positionSortField === field && prev === 'desc' ? 'asc' : 'desc')
    setPositionSortField(field)
  }

  const handleBalanceSort = (field) => {
    setBalanceSortDir(prev => balanceSortField === field && prev === 'desc' ? 'asc' : 'desc')
    setBalanceSortField(field)
  }

  const handleTradeSort = (field) => {
    setTradesLimit(20)
    setTradeSortDir(prev => tradeSortField === field && prev === 'desc' ? 'asc' : 'desc')
    setTradeSortField(field)
  }

  const SortArrows = ({ active, dir }) => (
    <div className="sort-arrows">
      <span className={`sort-arrow ${active && dir === 'asc' ? 'active' : ''}`}>▲</span>
      <span className={`sort-arrow ${active && dir === 'desc' ? 'active' : ''}`}>▼</span>
    </div>
  )



  useEffect(() => {
    if (walletAddress && !propAccountId) {
      setLoading(true)
      setNotFound(false)
      setAccountId(null)
      setLoadingProgress(10)
      setLoadingStep('Looking up account profile...')

      getSodexIdFromWallet(walletAddress).then(id => {
        if (id) {
          setAccountId(id)
          setNotFound(false)
        } else {
          setAccountId(null)
          setNotFound(true)
          setLoading(false)
        }
      })

      // Fetch social data from publicdns
      supabase
        .from('publicdns')
        .select('dc_username, tg_username, tg_displayname, ref_code')
        .ilike('wallet_address', walletAddress)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setSocialData(data)
          } else {
            setSocialData({ dc_username: null, tg_username: null, tg_displayname: null, ref_code: null })
          }
        })
    }
  }, [walletAddress, propAccountId])

  // Fetch all data when accountId is set
  useEffect(() => {
    if (accountId) {
      fetchAllData()
    }
  }, [accountId])

  // Prepare Activity Timeline - memoized to prevent random reordering on re-renders
  // Store rawSymbol so getBaseCoin can be called at render time with current coinRegistry
  // Must be placed before any early returns to maintain hook order
  const activityTimeline = useMemo(() => {
    const items = [
      // 1. Current Positions (as Opened events)
      ...positions.map((p, i) => {
        const isLongSide = p.positionSide === 'LONG' || p.positionSide === '2' || p.positionSide === 2
        const timestamp = p.updateTime || 0
        return {
          id: `pos-${p.symbol}-${i}`,
          date: p.updateTime ? new Date(p.updateTime).toISOString() : new Date().toISOString(),
          type: 'Trade Opened',
          subType: `${isLongSide ? 'Long' : 'Short'} Opened`,
          rawSymbol: p.symbol || '',
          size: p.positionSize,
          status: isLongSide ? 'pos' : 'neg',
          timestamp: timestamp > 1000000000000 ? timestamp : timestamp * 1000
        }
      }),
      // 2. Closed Trades
      ...positionHistory.map((p, i) => {
        const symbolName = symbolMap[p.symbol_id] || ''
        const isLong = parseInt(p.position_side) === 2
        const ts = new Date(p.updated_at).getTime()
        return {
          id: `trade-${p.symbol_id}-${p.updated_at}-${i}`,
          date: p.updated_at,
          type: 'Trade Closed',
          subType: `${isLong ? 'Long' : 'Short'} Closed`,
          rawSymbol: symbolName,
          symbolId: p.symbol_id,
          size: p.max_size,
          pnl: parseFloat(p.realized_pnl) || 0,
          status: parseFloat(p.realized_pnl) >= 0 ? 'pos' : 'neg',
          timestamp: isNaN(ts) ? 0 : ts
        }
      }),
      // 3. Transfers/Withdrawals
      ...withdrawals.map((w, i) => {
        const meta = getWithdrawalTypeMeta(w)
        const ts = w.stmp || 0
        return {
          id: `withdraw-${w.stmp}-${i}`,
          date: new Date((ts > 1000000000000 ? ts : ts * 1000)).toISOString(),
          type: meta.typeLabel,
          rawSymbol: w.coin || '',
          amount: formatCoin(w.amount, w.decimals),
          status: meta.isInternal ? 'internal' : (meta.isDeposit ? 'pos' : 'neg'),
          timestamp: ts > 1000000000000 ? ts : ts * 1000
        }
      }),
      // 4. Fund Transfers (Internal)
      ...fundTransfers.map((f, i) => {
        const ts = f.stmp || 0
        return {
          id: `fund-${f.stmp}-${i}`,
          date: new Date((ts > 1000000000000 ? ts : ts * 1000)).toISOString(),
          type: f.type,
          rawSymbol: f.coin || '',
          amount: formatCoin(f.amount, f.decimals),
          status: 'internal',
          timestamp: ts > 1000000000000 ? ts : ts * 1000
        }
      })
    ]
    // Sort by timestamp desc, then by id for stable ordering
    return items.sort((a, b) => b.timestamp - a.timestamp || a.id.localeCompare(b.id))
  }, [positions, positionHistory, withdrawals, fundTransfers, symbolMap])

  const displayedActivity = activityTimeline.slice(0, activityLimit)

  const handleManualIdSearch = () => {
    const id = manualIdInput.trim()
    if (id && !isNaN(parseInt(id))) {
      setAccountId(id)
      setNotFound(false)
    }
  }

  const fetchAllData = async () => {
    if (!accountId) return

    // Always fetch meta even if cached (fast, global context)
    const fetchMetadata = async () => {
      try {
        const [lbRes, bracketRes, symbolListRes, overviewRes] = await Promise.all([
          supabase.from('leaderboard_smart')
            .select('pnl_rank, volume_rank')
            .eq('account_id', accountId)
            .maybeSingle(),
          fetch('https://mainnet-gw.sodex.dev/futures/fapi/market/v1/public/leverage/bracket/list'),
          fetch('https://mainnet-gw.sodex.dev/futures/fapi/market/v1/public/symbol/list'),
          fetch(`https://mainnet-data.sodex.dev/api/v1/perps/pnl/overview?account_id=${accountId}`)
        ])

        if (lbRes.data) {
          setLeaderboardStats({
            rank: lbRes.data.pnl_rank,
            volumeRank: lbRes.data.volume_rank
          })
        }

        // Fetch volume from overview API
        try {
          const overviewData = await overviewRes.json()
          if (overviewData.code === 0 && overviewData.data) {
            setOverviewStats({
              volume: parseFloat(overviewData.data.cumulative_quote_volume) || 0,
              cumulativePnl: parseFloat(overviewData.data.cumulative_pnl) || 0
            })
          }
        } catch (e) {
          console.error('Overview fetch failed:', e)
        }

        const bracketData = await bracketRes.json()
        if (bracketData.code === 0 && bracketData.data) {
          const map = {}
          const brackets = {}
          bracketData.data.forEach(item => {
            if (item.symbolId) {
              map[item.symbolId] = item.symbol
              // Store bracket data with maintenance margin rates per symbol
              brackets[item.symbol] = item.brackets || []
            }
          })
          setSymbolMap(map)
          setLeverageBrackets(brackets)
        }

        // Build coin registry from symbol list
        const symbolListData = await symbolListRes.json()
        if (symbolListData.code === 0 && symbolListData.data) {
          const registry = {}
          symbolListData.data.forEach(item => {
            if (item.symbol && item.baseCoin) {
              registry[item.symbol.toUpperCase()] = item.baseCoin.toUpperCase()
            }
          })
          coinRegistry = registry
        }
      } catch (e) {
        console.error('Metadata fetch failed:', e)
      }
    }

    const cached = globalCache.getAccountData(accountId)
    if (cached) {
      setLoadingProgress(60)
      setLoadingStep('Restoring cached data...')
      setAccountDetails(cached.accountDetails)
      setSpotBalances(cached.spotBalances)
      setWithdrawals(cached.withdrawals)
      setPnlHistory(cached.pnlHistory)
      setPositionHistory(cached.positionHistory)
      setPositions(cached.positions)
      setTotalAssets(cached.totalAssets)

      // Still fetch map for names
      await fetchMetadata()

      setLoadingProgress(100)
      setTimeout(() => setLoading(false), 200)
      return
    }

    await fetchMetadata()

    setLoading(true)
    setLoadingProgress(25)
    setLoadingStep('Establishing link to Sodex Gateway...')

    try {
      // Fetch details first
      const detailsRes = await fetch(`https://mainnet-gw.sodex.dev/futures/fapi/user/v1/public/account/details?accountId=${accountId}`)
      const detailsData = await detailsRes.json()

      setLoadingProgress(45)
      setLoadingStep('Syncing cross-chain portfolio balances...')

      const balanceRes = await fetch(`https://mainnet-gw.sodex.dev/pro/p/user/balance/list?accountId=${accountId}`)
      const balanceData = await balanceRes.json()

      setLoadingProgress(65)
      setLoadingStep('Decrypting historical transactions...')

      const [withdrawalsRes, pnlRes, posHistoryRes, fundsRes] = await Promise.all([
        fetch('https://alpha-biz.sodex.dev/biz/mirror/account_flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ account: walletAddress || '', start: 0, limit: 200 })
        }),
        fetch(`https://mainnet-data.sodex.dev/api/v1/perps/pnl/daily_stats?account_id=${accountId}`),
        fetch(`https://mainnet-data.sodex.dev/api/v1/perps/positions?account_id=${accountId}&limit=500`),
        fetch(`https://sodex.dev/mainnet/chain/user/${accountId}/fund-transfers?userId=${accountId}&page=1&size=200`)
      ])

      setLoadingProgress(85)
      setLoadingStep('Analyzing performance metrics...')

      // Parse remaining responses
      const [withdrawalsData, pnlData, posHistoryData, fundsData] = await Promise.all([
        withdrawalsRes.json(),
        pnlRes.json(),
        posHistoryRes.json(),
        fundsRes.json()
      ])

      // Process account details
      let processedAccountDetails = null
      let processedPositions = []
      if (detailsData.code === 0 && detailsData.data) {
        processedAccountDetails = detailsData.data
        processedPositions = detailsData.data.positions || []
        setAccountDetails(processedAccountDetails)
        setPositions(processedPositions)
      }

      // Process spot balances & calculate total assets
      let processedBalances = []
      let processedTotalAssets = 0
      if (balanceData.code === '0' || balanceData.code === 0) {
        const balances = balanceData.data?.spotBalance || []
        processedBalances = balances
        setSpotBalances(balances)

        // Calculate total assets from balance * mark price
        try {
          const markPriceRes = await fetch('https://mainnet-gw.sodex.dev/futures/fapi/market/v1/public/q/mark-price')
          const markPriceData = await markPriceRes.json()

          let totalUSDC = 0
          const priceMap = {}

          // Build price map with symbol as key (e.g., "AVAX-USD" -> 11.981)
          if (markPriceData.code === 0 && markPriceData.data) {
            markPriceData.data.forEach(item => {
              priceMap[item.s] = parseFloat(item.p) || 0
            })
            setMarkPrices(priceMap)
          }

          // Add futures account wallet balance first (USDC)
          if (detailsData.code === 0 && detailsData.data?.balances?.[0]?.walletBalance) {
            totalUSDC += parseFloat(detailsData.data.balances[0].walletBalance) || 0
          }

          // Calculate total by multiplying balance * price for each coin in spot
          balances.forEach(bal => {
            const balance = parseFloat(bal.balance) || 0
            const coin = (bal.coin || '').trim()

            if (!coin || balance === 0) return

            // Clean up coin name to match mark price format
            let cleanCoin = getBaseCoin(coin)

            // USDC is 1:1 (handles both USDC and vUSDC)
            if (cleanCoin.toUpperCase() === 'USDC') {
              totalUSDC += balance
              return
            }

            // Convert to mark price symbol format (COIN-USD)
            // Special case: XAUt stays as XAUt (lowercase t)
            let symbol
            if (cleanCoin.toUpperCase() === 'XAUT') {
              symbol = 'XAUt-USD'
            } else {
              symbol = `${cleanCoin.toUpperCase()}-USD`
            }

            const price = priceMap[symbol] || 0

            if (price > 0) {
              totalUSDC += balance * price
            } else {
              console.log(`No price found for ${coin} -> ${symbol}`)
            }
          })

          processedTotalAssets = totalUSDC
          setTotalAssets(totalUSDC)
        } catch (err) {
          console.error('Failed to calculate total assets:', err)
          processedTotalAssets = 0
          setTotalAssets(0)
        }
      }

      // Process withdrawals
      let processedWithdrawals = []
      if (withdrawalsData.code === '0' && withdrawalsData.data?.accountFlows) {
        processedWithdrawals = withdrawalsData.data.accountFlows
        setWithdrawals(processedWithdrawals)
      }

      // Process fund transfers
      let processedFunds = []
      if (fundsData.code === 0 && fundsData.data?.fundTransfers) {
        processedFunds = fundsData.data.fundTransfers.map(f => {
          const fallback = f.amount && f.amount.length > 12
            ? { symbol: '?', decimals: 18 }
            : { symbol: '??', decimals: 6 }

          const assetInfo = assetRegistry[f.assetAddress] || {
            symbol: f.coin || f.token || f.asset || f.symbol || fallback.symbol,
            decimals: f.decimals || fallback.decimals
          }
          const isType2 = f.transferType === 2
          return {
            stmp: f.blockTimestamp,
            amount: f.amount,
            decimals: assetInfo.decimals,
            coin: assetInfo.symbol,
            type: isType2 ? 'Spot to Fund Transfer' : 'Chain Transfer',
            status: 'Success',
            txHash: f.txHash,
            fromOverride: isType2 ? 'Spot' : 'N/A',
            toOverride: isType2 ? 'Fund' : 'N/A',
            network: 'Sodex Chain',
            isFundTransfer: true
          }
        })
        setFundTransfers(processedFunds)
      }

      // Process position history
      let processedPosHistory = []
      if (posHistoryData.code === 0 && posHistoryData.data) {
        processedPosHistory = posHistoryData.data
        setPositionHistory(processedPosHistory)
      }

      // Process PnL history - API returns cumulative PnL per day
      let processedPnlHistory = []
      if (pnlData.code === 0 && pnlData.data?.items) {
        // Sort by timestamp ascending
        const sortedItems = [...pnlData.data.items].sort((a, b) => a.ts_ms - b.ts_ms)

        const formattedPnl = sortedItems.map((item, idx) => {
          const cumulative = parseFloat(item.pnl)
          const prevCumulative = idx > 0 ? parseFloat(sortedItems[idx - 1].pnl) : 0
          return {
            date: new Date(item.ts_ms).toISOString().split('T')[0],
            cumulative: cumulative,
            daily: cumulative - prevCumulative
          }
        })

        processedPnlHistory = formattedPnl
        setPnlHistory(formattedPnl)
      }

      // Store in global cache after all processing is complete
      globalCache.setAccountData(accountId, {
        accountDetails: processedAccountDetails,
        spotBalances: processedBalances,
        withdrawals: processedWithdrawals,
        fundTransfers: processedFunds,
        pnlHistory: processedPnlHistory,
        positionHistory: processedPosHistory,
        positions: processedPositions,
        totalAssets: processedTotalAssets
      })

      setLoadingProgress(100)
      setLoadingStep('Finalizing dashboard visualization...')
      setTimeout(() => setLoading(false), 300)
    } catch (error) {
      console.error('Failed to fetch mainnet data:', error)
      setLoading(false)
    }
  }

  const trimToMaxDecimals = (value, decimals = 2) => {
    if (isNaN(value)) return '0'
    const factor = Math.pow(10, decimals)
    const rounded = Math.round(value * factor) / factor
    let str = rounded.toFixed(decimals)
    // Remove trailing zeros and trailing decimal if none remain
    str = str.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '')
    return str
  }

  // For values < 1: keep leading zeros, then show 3 significant digits (first non-zero + 2),
  // e.g. 0.053454 -> 0.0535, 0.0001234 -> 0.000123
  const trimSmallWithSig3 = (value, maxDecimalsCap = 10) => {
    const abs = Math.abs(value)
    if (!isFinite(abs) || abs === 0) return '0'
    if (abs >= 1) return trimToMaxDecimals(value, 2)

    const exp = Math.floor(Math.log10(abs)) // negative
    const decimals = Math.min(-exp + 2, maxDecimalsCap)
    return trimToMaxDecimals(value, decimals)
  }

  const formatNumber = (num, decimals = 2) => {
    if (num === undefined || num === null) return '0'
    const n = parseFloat(num)
    if (Math.abs(n) >= 1000000000) return `${trimToMaxDecimals(n / 1000000000, decimals)}B`
    if (Math.abs(n) >= 1000000) return `${trimToMaxDecimals(n / 1000000, decimals)}M`
    if (Math.abs(n) >= 1000) return `${trimToMaxDecimals(n / 1000, decimals)}K`
    return trimToMaxDecimals(n, decimals)
  }

  // Format balance without rounding - show full precision with threshold rules
  const formatBalance = (num, coin = '') => {
    if (num === undefined || num === null) return '0'
    const n = parseFloat(num)
    if (isNaN(n)) return '0'
    if (n === 0) return '0'

    const coinUpper = (coin || '').toUpperCase()
    const isUSDC = coinUpper.includes('USDC')
    const isBTC = coinUpper.includes('BTC')

    // Threshold rules
    if (isUSDC && n > 0 && n < 0.01) return '<0.01'
    if (isBTC && n > 0 && n < 0.0000001) return '<0.0000001'
    if (!isUSDC && !isBTC && n > 0 && n < 0.000001) return '<0.000001'

    // Remove trailing zeros but keep full precision
    return n.toString().replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '')
  }

  const formatDateTime = (timestamp) => {
    const d = new Date(timestamp * 1000)
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    // Using a 200px buffer to trigger load before hitting absolute bottom
    if (scrollHeight - scrollTop <= clientHeight + 200) {
      if (activeTab === 'Positions' && positionsLimit < positions.length) {
        setPositionsLimit(prev => prev + 20)
      } else if (activeTab === 'Transfers' && withdrawalsLimit < (withdrawals.length + fundTransfers.length)) {
        setWithdrawalsLimit(prev => prev + 40)
      } else if (activeTab === 'Trades' && tradesLimit < positionHistory.length) {
        setTradesLimit(prev => prev + 40)
      } else if (activeTab === 'Performance' && performanceLimit < positionHistory.length) {
        setPerformanceLimit(prev => prev + 40)
      } else if (activeTab === 'Balances') {
        const totalBal = (balanceView === 'Futures' ? (accountDetails?.balances?.length || 0) : (spotBalances.length || 0))
        if (balancesLimit < totalBal) setBalancesLimit(prev => prev + 20)
      } else if (activeTab === 'Orders' && ordersLimit < 50) { // Just in case orders are added later
        setOrdersLimit(prev => prev + 20)
      }
    }
  }

  const formatTimeShort = (stmp) => {
    if (!stmp) return ''
    const date = new Date(stmp * (stmp > 1000000000000 ? 1 : 1000))
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = months[date.getMonth()]
    const day = date.getDate()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${month} ${day} ${hours}:${minutes}`
  }

  const normalizeNetworkLabel = (raw) => {
    const s = (raw ?? '').toString().trim()
    if (!s) return '-'
    const underscoreSplit = s.split('_')[0]
    const dotSplit = underscoreSplit.split('.')[0]
    return dotSplit || s
  }

  // Calculate total assets from wallet balance
  const walletBalance = accountDetails?.balances?.[0]?.walletBalance
    ? parseFloat(accountDetails.balances[0].walletBalance)
    : 0


  const tabs = ['Positions', 'Balances', 'Orders', 'Trades', 'Transfers', 'Performance']
  const tabIds = {
    'Positions': 'positions',
    'Balances': 'balances',
    'Orders': 'orders',
    'Trades': 'position-history',
    'Transfers': 'withdrawals',
    'Performance': 'pnl'
  }

  if (!accountId && !propAccountId && !loading) {
    return (
      <div className="scanner-grid">
        <div className="section-path">
          <div className="path-breadcrumbs">
            <Link href="/">Home</Link>
            <span>/</span>
            <a href="/tracker">Scanner</a>
            <span>/</span>
            <b>Dashboard</b>
          </div>
          <div className="path-search-wrapper">
            {searchBox}
          </div>
        </div>

        <aside className="section-sidebar">
          {tagSection}
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
            <h3 style={{ color: '#fff', fontSize: '14px', marginBottom: '8px' }}>Profile Search</h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
              Enter an Account ID or search for another wallet.
            </p>
          </div>
        </aside>

        <div className="section-top-center" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '40px',
          background: 'rgba(20,20,20,0.4)',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <h3 style={{ color: '#fff', marginBottom: '16px', fontSize: '18px' }}>Wallet Not Found</h3>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '24px', maxWidth: '400px' }}>
            This wallet address is not currently indexed in the leaderboard. You can try searching by its numerical Account ID instead:
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <input
              type="text"
              value={manualIdInput}
              onChange={(e) => setManualIdInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualIdSearch()}
              placeholder="e.g. 1234"
              style={{
                background: 'rgba(30, 30, 30, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '10px 16px',
                color: '#fff',
                fontSize: '14px',
                width: '160px'
              }}
            />
            <button
              onClick={handleManualIdSearch}
              style={{
                background: 'rgba(255, 118, 72, 0.15)',
                border: '1px solid rgba(255, 118, 72, 0.3)',
                color: '#FF7648',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Scan ID
            </button>
          </div>
        </div>

        <aside className="section-activity" style={{ background: 'rgba(20,20,20,0.4)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}></aside>

        <div className="section-bottom-center" style={{
          background: 'rgba(20,20,20,0.4)',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="scanner-grid">
        <div className="section-path">
          <div className="path-breadcrumbs">
            <Link href="/">Home</Link>
            <span>/</span>
            <a href="/tracker">Scanner</a>
            <span>/</span>
            <b>Dashboard</b>
          </div>
          <div className="path-search-wrapper">
            {searchBox}
          </div>
        </div>

        {/* Highly Accurate Sidebar Skeleton */}
        <aside className="section-sidebar" style={{ background: 'rgba(20,20,20,0.4)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
          {tagSection}
          <div style={{ padding: '20px' }}>
            {/* Section 1: Alias & Address info (Accurate positions) */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ width: '100px', height: '18px', marginBottom: '6px' }}></div>
                  <div className="skeleton" style={{ width: '140px', height: '14px', opacity: 0.6 }}></div>
                </div>
                <div className="skeleton" style={{ width: '70px', height: '22px', borderRadius: '4px' }}></div>
              </div>

              {/* Accurate Actions row */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <div className="skeleton" style={{ flex: 1, height: '28px', borderRadius: '6px' }}></div>
                <div className="skeleton" style={{ flex: 1, height: '28px', borderRadius: '6px' }}></div>
              </div>

              {/* Account Value block */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className="skeleton" style={{ width: '90px', height: '10px', opacity: 0.5 }}></div>
                <div className="skeleton" style={{ width: '120px', height: '28px' }}></div>
              </div>
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '14px 0' }} />

            {/* Section 2: Account Equity */}
            <div style={{ marginBottom: '0' }}>
              <div className="skeleton" style={{ width: '100px', height: '12px', marginBottom: '12px', opacity: 0.8 }}></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div className="skeleton" style={{ width: '45px', height: '11px', opacity: 0.5 }}></div>
                    <div className="skeleton" style={{ width: '65px', height: '11px' }}></div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '14px 0' }} />

            {/* Section 3: Futures */}
            <div style={{ marginBottom: '0' }}>
              <div className="skeleton" style={{ width: '70px', height: '12px', marginBottom: '12px', opacity: 0.8 }}></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div className="skeleton" style={{ width: '85px', height: '11px', opacity: 0.5 }}></div>
                    <div className="skeleton" style={{ width: '55px', height: '11px' }}></div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '14px 0' }} />

            {/* Section 4: Performance */}
            <div style={{ marginBottom: '0' }}>
              <div className="skeleton" style={{ width: '120px', height: '12px', marginBottom: '12px', opacity: 0.8 }}></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div className="skeleton" style={{ width: '60px', height: '11px', opacity: 0.5 }}></div>
                  <div className="skeleton" style={{ width: '50px', height: '11px' }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div className="skeleton" style={{ width: '75px', height: '11px', opacity: 0.5 }}></div>
                  <div className="skeleton" style={{ width: '40px', height: '11px' }}></div>
                </div>
              </div>
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '14px 0' }} />

            {/* Section 5: Rankings */}
            <div style={{ marginBottom: '0' }}>
              <div className="skeleton" style={{ width: '70px', height: '12px', marginBottom: '12px', opacity: 0.8 }}></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div className="skeleton" style={{ width: '40px', height: '11px', opacity: 0.5 }}></div>
                  <div className="skeleton" style={{ width: '30px', height: '11px' }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div className="skeleton" style={{ width: '50px', height: '11px', opacity: 0.5 }}></div>
                  <div className="skeleton" style={{ width: '35px', height: '11px' }}></div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Central Area: Chart Loading View */}
        <div className="section-top-center" style={{
          background: 'rgba(255, 118, 72, 0.05)',
          borderRadius: '8px',
          border: '1px dashed rgba(255, 118, 72, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '40px 20px',
          height: '475px',
          boxSizing: 'border-box'
        }}>
          <h3 style={{ color: '#fff', marginBottom: '12px', fontSize: '20px', fontWeight: '600' }}>Scanning Mainnet Wallet...</h3>
          <div className="loading-progress-container" style={{ maxWidth: 'calc(100% - 40px)' }}>
            <div className="loading-progress-bar" style={{ width: `${loadingProgress}%` }}></div>
          </div>
          <p className="loading-step-text" style={{ height: '20px' }}>{loadingStep}</p>
        </div>

        {/* Improved Accurate Activity Skeleton */}
        <aside className="section-activity" style={{ background: 'rgba(20,20,20,0.4)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', padding: '20px' }}>
          <div className="skeleton" style={{ width: '130px', height: '18px', marginBottom: '24px' }}></div>
          <div className="timeline" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div className="skeleton skeleton-circle" style={{ width: '18px', height: '18px' }}></div>
                    <div className="skeleton" style={{ width: '100px', height: '12px' }}></div>
                  </div>
                  <div className="skeleton" style={{ width: '40px', height: '10px', opacity: 0.3 }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '28px' }}>
                  <div className="skeleton" style={{ width: '60px', height: '10px', opacity: 0.4 }}></div>
                  <div className="skeleton" style={{ width: '45px', height: '10px', opacity: 0.5 }}></div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Improved Accurate Bottom Table Skeleton */}
        <div className="section-bottom-center" style={{
          background: 'rgba(20,20,20,0.4)',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '0'
        }}>
          {/* Tab Nav Skeleton */}
          <div style={{ padding: '16px 16px 0 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', gap: '24px', marginBottom: '0' }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="skeleton" style={{ height: '32px', width: '70px', borderRadius: '4px 4px 0 0' }}></div>
              ))}
            </div>
          </div>

          {/* Table Header Skeleton */}
          <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="skeleton" style={{ width: '120px', height: '14px' }}></div>
              <div className="skeleton" style={{ width: '60px', height: '14px' }}></div>
              <div className="skeleton" style={{ width: '80px', height: '14px' }}></div>
              <div className="skeleton" style={{ width: '80px', height: '14px' }}></div>
              <div className="skeleton" style={{ width: '80px', height: '14px' }}></div>
              <div className="skeleton" style={{ width: '80px', height: '14px' }}></div>
              <div className="skeleton" style={{ width: '80px', height: '14px' }}></div>
            </div>
          </div>

          {/* Table Body Skeleton */}
          <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div className="skeleton skeleton-circle" style={{ width: '18px', height: '18px' }}></div>
                  <div className="skeleton" style={{ width: '100px', height: '12px' }}></div>
                </div>
                <div className="skeleton" style={{ width: '60px', height: '14px' }}></div>
                <div className="skeleton" style={{ width: '70px', height: '14px' }}></div>
                <div className="skeleton" style={{ width: '70px', height: '14px' }}></div>
                <div className="skeleton" style={{ width: '70px', height: '14px' }}></div>
                <div className="skeleton" style={{ width: '70px', height: '14px' }}></div>
                <div className="skeleton" style={{ width: '70px', height: '14px' }}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const handleActivityScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (activityLimit < activityTimeline.length) {
        setActivityLimit(prev => prev + 25)
      }
    }
  }

  const INTERNAL_COLOR = '#3b82f6' // Blue for internal transfers

  return (
    <div className="scanner-grid">
      {/* 1. Path Bar */}
      <div className="section-path">
        <div className="path-breadcrumbs">
          <Link href="/">Home</Link>
          <span>/</span>
          <a href="/tracker">Scanner</a>
          <span>/</span>
          <b title={walletAddress}>
            {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Dashboard'}
          </b>
        </div>
        <div className="path-search-wrapper">
          {searchBox}
        </div>
      </div>

      <aside className="section-sidebar">
        {/* Section 1: Account */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {isEditingAlias ? (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input
                    ref={aliasInputRef}
                    type="text"
                    value={aliasInput}
                    onChange={(e) => setAliasInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (activeTag) renameTag.mutate({ tagId: activeTag.id, newName: aliasInput })
                        else if (walletAddress) addTag.mutate({ wallet: walletAddress, name: aliasInput })
                        setIsEditingAlias(false)
                      } else if (e.key === 'Escape') {
                        setIsEditingAlias(false)
                      }
                    }}
                    onBlur={() => setIsEditingAlias(false)}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '14px',
                      padding: '4px 8px',
                      width: '100%',
                      outline: 'none'
                    }}
                  />
                </div>
              ) : (
                <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: '700', margin: 0 }}>
                  {activeTag ? activeTag.tag_name : 'No Alias'}
                </h3>
              )}
              <div style={{ fontSize: '13px', fontFamily: 'monospace', display: 'flex', alignItems: 'center', opacity: 0.8 }}>
                <CopyableAddress address={walletAddress || '-'} truncated={true} />
              </div>
            </div>

            <div style={{
              fontSize: '11px',
              fontWeight: '700',
              color: statsSummary.sentimentColor,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              textAlign: 'right',
              padding: '4px 8px',
              background: `${statsSummary.sentimentColor}15`,
              borderRadius: '4px',
              border: `1px solid ${statsSummary.sentimentColor}25`
            }}>
              {statsSummary.sentiment}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', position: 'relative' }}>
            <button
              onClick={() => setShowEditMenu(!showEditMenu)}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (!walletAddress || isAdding || isRemoving) return
                if (isInWatchlist) {
                  removeFromWatchlistByAddress(walletAddress)
                } else {
                  addToWatchlist({ wallet_address: walletAddress })
                    .catch(err => console.error('Failed to add to watchlist:', err))
                }
              }}
              disabled={isAdding || isRemoving}
              style={{
                flex: 1,
                background: isInWatchlist ? 'rgba(255,255,255,0.05)' : '#FF7648',
                border: isInWatchlist ? '1px solid rgba(255,255,255,0.1)' : 'none',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: (isAdding || isRemoving) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: (isAdding || isRemoving) ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isAdding ? 'Adding...' : isRemoving ? 'Removing...' : isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
            </button>

            {/* Edit Dropdown */}
            <AnimatePresence>
              {showEditMenu && (
                <motion.div
                  ref={editMenuRef}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  style={{
                    position: 'absolute',
                    top: '36px',
                    left: 0,
                    width: '160px',
                    background: '#1a1a1a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    zIndex: 100,
                    padding: '4px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                  }}
                >
                  <button
                    onClick={() => {
                      setAliasInput(activeTag?.tag_name || '')
                      setIsEditingAlias(true)
                      setShowEditMenu(false)
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#fff', padding: '8px 12px', width: '100%', textAlign: 'left', cursor: 'pointer', fontSize: '11px', borderRadius: '4px' }}
                    className="menu-item-hover"
                  >
                    Rename Wallet
                  </button>
                  <button
                    onClick={() => {
                      const groupName = prompt('Enter Group Name:', activeTag?.group_name || '')
                      if (activeTag && groupName !== null) {
                        assignToGroup.mutate({ tagId: activeTag.id, groupName })
                      }
                      setShowEditMenu(false)
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#fff', padding: '8px 12px', width: '100%', textAlign: 'left', cursor: 'pointer', fontSize: '11px', borderRadius: '4px' }}
                    className="menu-item-hover"
                  >
                    Move to Group
                  </button>
                  <button
                    onClick={() => {
                      if (activeTag && confirm('Delete alias?')) {
                        deleteTag.mutate(activeTag.id)
                      }
                      setShowEditMenu(false)
                    }}
                    style={{ background: 'transparent', border: 'none', color: BEARISH_COLOR, padding: '8px 12px', width: '100%', textAlign: 'left', cursor: 'pointer', fontSize: '11px', borderRadius: '4px' }}
                    className="menu-item-hover"
                  >
                    Delete Alias
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: '#fff', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account value</span>
            <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: '400', margin: 0 }}>
              ${totalAssets.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
          </div>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '10px 0' }} />

        {/* Section 2: Account Equity */}
        <div style={{ marginBottom: '0' }}>
          <h4 style={{ color: '#fff', fontSize: '11px', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Equity</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: '#fff', fontWeight: '600' }}>Futures</span>
              <span style={{ color: '#fff', fontWeight: '600' }}>${formatNumber(statsSummary.futuresValue)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Spot</span>
              <span style={{ color: '#fff', fontWeight: '600' }}>${formatNumber(statsSummary.spotValue)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Vault</span>
              <span style={{ color: '#fff', fontWeight: '600' }}>${formatNumber(statsSummary.vaultValue)}</span>
            </div>
          </div>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '10px 0' }} />

        {/* Section 3: Futures */}
        <div style={{ marginBottom: '0' }}>
          <h4 style={{ color: '#fff', fontSize: '11px', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Futures</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Unrealized pnl</span>
              <span style={{ color: statsSummary.unrealized >= 0 ? BULLISH_COLOR : BEARISH_COLOR, fontWeight: '700' }}>
                {statsSummary.unrealized >= 0 ? '+' : ''}${formatNumber(statsSummary.unrealized)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Average Leverage</span>
              <span style={{ color: '#fff', fontWeight: '600' }}>{statsSummary.avgLev.toFixed(1)}x</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>All time PnL</span>
              <span style={{ color: statsSummary.allTimePnl >= 0 ? BULLISH_COLOR : BEARISH_COLOR, fontWeight: '600' }}>
                {statsSummary.allTimePnl >= 0 ? '+' : ''}${formatNumber(statsSummary.allTimePnl)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>All time Volume</span>
              <span style={{ color: '#fff', fontWeight: '600' }}>${formatNumber(statsSummary.allTimeVol)}</span>
            </div>
          </div>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '10px 0' }} />

        {/* Section 4: Futures Performance */}
        <div style={{ marginBottom: '0' }}>
          <h4 style={{ color: '#fff', fontSize: '11px', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Futures Performance</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Win rate</span>
              <span style={{ color: '#fff', fontWeight: '600' }}>{statsSummary.winRate.toFixed(1)}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Sharpe Ratio</span>
              <span style={{ color: INTERNAL_COLOR, fontWeight: '600' }}>
                {statsSummary.sharpe.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '10px 0' }} />

        {/* Section 5: Rankings */}
        <div style={{ marginBottom: '0' }}>
          <h4 style={{ color: '#fff', fontSize: '11px', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rankings</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>PnL</span>
              <span style={{ color: '#fff', fontWeight: '600' }}>
                {leaderboardStats.rank ? `#${leaderboardStats.rank}` : '-'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Volume</span>
              <span style={{ color: '#fff', fontWeight: '600' }}>
                {leaderboardStats.volumeRank ? `#${leaderboardStats.volumeRank}` : '-'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '10px 0' }} />

        {/* Section 6: Social */}
        <div style={{ marginBottom: '0' }}>
          <h4 style={{ color: '#fff', fontSize: '11px', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Social</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Referral Code */}
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', position: 'relative' }}
              onMouseEnter={() => setSocialTooltip('refcode')}
              onMouseLeave={() => setSocialTooltip(null)}
            >
              <span style={{ color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Ref Code
                <span style={{ cursor: 'help', color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>ⓘ</span>
              </span>
              {socialData.ref_code ? (
                <a
                  href={`https://sodex.com/join/${socialData.ref_code}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#4ade80', fontWeight: '600', textDecoration: 'none' }}
                >
                  {socialData.ref_code}
                </a>
              ) : (
                <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>Unknown</span>
              )}
              {socialTooltip === 'refcode' && (
                <div className="social-tooltip">
                  {socialData.ref_code
                    ? `Referral code ${socialData.ref_code} has been publicly observed in connection with this wallet. No claim of ownership or control.`
                    : `Referral code has not been publicly observed in connection with this wallet. No claim of ownership or control.`}
                </div>
              )}
            </div>
            {/* Discord */}
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', position: 'relative' }}
              onMouseEnter={() => setSocialTooltip('discord')}
              onMouseLeave={() => setSocialTooltip(null)}
            >
              <span style={{ color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '12px', height: '12px' }}>
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                Discord
                <span style={{ cursor: 'help', color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>ⓘ</span>
              </span>
              <span style={{ color: socialData.dc_username ? '#fff' : 'rgba(255,255,255,0.3)', fontWeight: '600' }}>
                {socialData.dc_username || 'Unknown'}
              </span>
              {socialTooltip === 'discord' && (
                <div className="social-tooltip">
                  {socialData.dc_username
                    ? `This wallet has been publicly observed in connection with Discord @${socialData.dc_username}. No claim of ownership or control.`
                    : `This wallet has not been publicly observed in connection with a Discord @handle. No claim of ownership or control.`}
                </div>
              )}
            </div>
            {/* Telegram */}
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', position: 'relative' }}
              onMouseEnter={() => setSocialTooltip('telegram')}
              onMouseLeave={() => setSocialTooltip(null)}
            >
              <span style={{ color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '12px', height: '12px' }}>
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
                Telegram
                <span style={{ cursor: 'help', color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>ⓘ</span>
              </span>
              <span style={{ color: (socialData.tg_username || socialData.tg_displayname) ? '#fff' : 'rgba(255,255,255,0.3)', fontWeight: '600' }}>
                {socialData.tg_username || socialData.tg_displayname || 'Unknown'}
              </span>
              {socialTooltip === 'telegram' && (
                <div className="social-tooltip">
                  {(socialData.tg_username || socialData.tg_displayname)
                    ? `This wallet has been publicly observed in connection with Telegram @${socialData.tg_username || socialData.tg_displayname}. No claim of ownership or control.`
                    : `This wallet has not been publicly observed in connection with a Telegram @handle. No claim of ownership or control.`}
                </div>
              )}
            </div>
            {/* X/Twitter placeholder */}
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', position: 'relative' }}
              onMouseEnter={() => setSocialTooltip('x')}
              onMouseLeave={() => setSocialTooltip(null)}
            >
              <span style={{ color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '12px', height: '12px' }}>
                  <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                </svg>
                X
                <span style={{ cursor: 'help', color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>ⓘ</span>
              </span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>
                Unknown
              </span>
              {socialTooltip === 'x' && (
                <div className="social-tooltip">
                  This wallet has not been publicly observed in connection with an X @handle. No claim of ownership or control.
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* 5. Top Center - PnL Chart */}
      <div
        className="section-top-center"
        style={{
          position: 'relative',
          height: isMobile && pnlViewMode === 'calendar' ? 'auto' : (pnlViewMode === 'chart' ? '475px' : calendarView === 'weekly' ? '320px' : calendarView === 'yearly' ? '380px' : '750px'),
          marginBottom: isMobile ? '16px' : '0',
          transition: 'height 0.3s ease'
        }}
      >
        {/* Chart/Calendar Switch - Top Left */}
        <div style={{
          position: 'absolute',
          left: '12px',
          top: '12px',
          zIndex: 10
        }}>
          <div style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.4)',
            borderRadius: '4px',
            padding: '2px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <button
              onClick={() => setPnlViewMode('chart')}
              style={{
                padding: '3px 8px',
                fontSize: '10px',
                fontWeight: '600',
                background: pnlViewMode === 'chart' ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: pnlViewMode === 'chart' ? '#fff' : 'rgba(255,255,255,0.4)',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Chart
            </button>
            <button
              onClick={() => setPnlViewMode('calendar')}
              style={{
                padding: '3px 8px',
                fontSize: '10px',
                fontWeight: '600',
                background: pnlViewMode === 'calendar' ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: pnlViewMode === 'calendar' ? '#fff' : 'rgba(255,255,255,0.4)',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Calendar
            </button>
          </div>
        </div>

        {pnlHistory.length > 0 ? (
          pnlViewMode === 'chart' ? (
            <ChartCard
              title=""
              data={pnlHistory}
              series={[
                { key: 'cumulative', label: 'Cumulative PnL', type: 'line', cumulative: true, hideLegend: true },
                { key: 'daily', label: 'Daily PnL', type: 'bar', hideLegend: true }
              ]}
              showCumulative={true}
              defaultSelected={['cumulative', 'daily']}
              fullHeight={true}
            />
          ) : (
            <PnlCalendar
              pnlHistory={pnlHistory}
              view={calendarView}
              onViewChange={setCalendarView}
              trades={positionHistory}
              symbolMap={symbolMap}
            />
          )
        ) : (
          <div style={{ background: 'rgba(20,20,20,0.4)', borderRadius: '12px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', border: '1px solid rgba(255,255,255,0.08)' }}>
            No PnL data available
          </div>
        )}
      </div>

      <aside className="section-activity" onScroll={handleActivityScroll} style={{ overflowY: 'auto' }}>
        <h3 style={{ color: '#fff', fontSize: '15px', marginBottom: '16px', fontWeight: '700', paddingLeft: '0px', marginTop: '4px' }}>Recent Activity</h3>
        <div className="timeline" style={{ paddingLeft: '12px', paddingRight: '12px', marginTop: '4px' }}>
          {displayedActivity.length > 0 ? (
            displayedActivity.map((item, idx) => {
              const isTrade = item.type.includes('Trade')
              const coin = getBaseCoin(item.rawSymbol)
              const color = item.status === 'pos' ? BULLISH_COLOR :
                item.status === 'neg' ? BEARISH_COLOR :
                  item.status === 'internal' ? INTERNAL_COLOR : '#fff'

              return (
                <div key={item.id} className={`timeline-item ${item.status}`} style={{
                  borderBottom: idx === displayedActivity.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.06)',
                  paddingTop: '6px',
                  paddingBottom: '8px',
                  marginBottom: '6px',
                  marginLeft: '-12px',
                  marginRight: '-12px',
                  paddingLeft: '24px',
                  paddingRight: '12px'
                }}>
                  <div className="timeline-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '2px' }}>
                    {isTrade || item.status === 'internal' ? (
                      <div className="timeline-icon-box" style={{
                        position: 'absolute',
                        left: '0px',
                        top: '8px',
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <CoinLogo symbol={coin} />
                      </div>
                    ) : (item.type === 'Deposit' || item.type === 'Withdraw') ? (
                      <div className="timeline-icon-box" style={{
                        position: 'absolute',
                        left: '0px',
                        top: '8px',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: item.type === 'Deposit' ? 'rgba(51, 175, 128, 0.15)' : 'rgba(219, 50, 77, 0.15)'
                      }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none"
                          stroke={item.type === 'Deposit' ? BULLISH_COLOR : BEARISH_COLOR} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          {item.type === 'Deposit' ? (
                            <><path d="M7 13l5 5 5-5" /><path d="M12 18V6" /></>
                          ) : (
                            <><path d="M7 11l5-5 5 5" /><path d="M12 18V6" /></>
                          )}
                        </svg>
                      </div>
                    ) : (item.status === 'pos' || item.status === 'neg') ? (
                      <div className="timeline-indicator" style={{
                        position: 'absolute',
                        left: '4px',
                        top: '12px',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: 'transparent',
                        border: `2px solid ${color}`,
                        zIndex: 1
                      }} />
                    ) : null}

                    <div className="timeline-content" style={{ color: isTrade ? '#fff' : color, fontSize: '11px', fontWeight: '600', paddingLeft: '4px' }}>
                      {isTrade ? (
                        <span>{coin} {item.subType}</span>
                      ) : (
                        <span>{item.type} {coin}</span>
                      )}
                    </div>

                    <div className="timeline-date" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textAlign: 'right' }}>
                      {formatTimeShort(item.timestamp / 1000)}
                    </div>
                  </div>

                  <div className="timeline-details" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '4px' }}>
                    {isTrade ? (
                      <>
                        <div className="timeline-desc" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                          {item.size} {coin}
                        </div>
                        {item.type === 'Trade Closed' && (
                          <div style={{ fontSize: '10px', fontWeight: '600', color: color }}>
                            {item.pnl >= 0 ? '+' : ''}${formatNumber(item.pnl)}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="timeline-desc" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                          {item.amount || '-'}
                        </div>
                        <div style={{ fontSize: '10px', fontWeight: '500', color: 'rgba(255,255,255,0.2)' }}>
                          Confirmed
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div style={{ color: '#666', fontSize: '12px' }}>No recent activity</div>
          )}
        </div>
      </aside>

      {/* 4. Bottom Center - Tabs */}
      <div className="section-bottom-center" onScroll={handleScroll} style={{ transition: 'all 0.3s ease' }}>
        {/* Tab Navigation */}
        <div style={{ position: 'relative', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="tab-nav-row" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 16px',
            marginBottom: '0',
            position: 'relative',
            zIndex: 20
          }}>
            <div className="tab-buttons" style={{ display: 'flex', gap: '0', position: 'relative' }}>
              {tabs.map((tab, idx) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '8px 0',
                    cursor: 'pointer',
                    color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.4)',
                    fontSize: '11px',
                    fontWeight: '600',
                    transition: 'color 0.2s ease',
                    position: 'relative',
                    outline: 'none',
                    textAlign: 'center',
                    flex: 1
                  }}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div
                      layoutId="tab-underline"
                      style={{
                        position: 'absolute',
                        bottom: '0',
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: '#FF7648',
                        zIndex: 2,
                        borderRadius: '2px 2px 0 0'
                      }}
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {activeTab === 'Balances' && (
              <div className="balance-view-switch" style={{
                display: 'flex',
                background: 'rgba(255,255,255,0.05)',
                padding: '2px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.08)',
                position: 'relative',
                zIndex: 10
              }}>
                {['Futures', 'Spot'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setBalanceView(mode)}
                    style={{
                      padding: '4px 12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      background: balanceView === mode ? 'rgba(255, 118, 72, 0.15)' : 'rgba(255,255,255,0.03)',
                      color: balanceView === mode ? '#FF7648' : 'rgba(255,255,255,0.4)',
                      transition: 'all 0.2s ease',
                      margin: '0 1px'
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', width: '100%' }} />
        </div>

        <div className="tab-scroll-area">
          {/* Tab Content */}
          {activeTab === 'Positions' && (
            <div>
              {positions.length === 0 ? (
                <div className="empty-state-container">
                  <p style={{ color: 'rgba(255,255,255,0.5)' }}>No open positions</p>
                </div>
              ) : (
                <>
                  <div className="table-scroll-wrapper">
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                      <thead>
                        <tr>
                          <th className={positionSortField === 'symbol' ? 'active' : ''} style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => handlePositionSort('symbol')}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              Symbol <SortArrows active={positionSortField === 'symbol'} dir={positionSortDir} />
                            </div>
                          </th>
                          <th className={positionSortField === 'side' ? 'active' : ''} style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => handlePositionSort('side')}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              Side <SortArrows active={positionSortField === 'side'} dir={positionSortDir} />
                            </div>
                          </th>
                          <th className={positionSortField === 'size' ? 'active' : ''} style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handlePositionSort('size')}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                              Size <SortArrows active={positionSortField === 'size'} dir={positionSortDir} />
                            </div>
                          </th>
                          <th className={positionSortField === 'entry' ? 'active' : ''} style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handlePositionSort('entry')}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                              Entry <SortArrows active={positionSortField === 'entry'} dir={positionSortDir} />
                            </div>
                          </th>
                          <th className={positionSortField === 'liq' ? 'active' : ''} style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handlePositionSort('liq')}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                              Liq. <SortArrows active={positionSortField === 'liq'} dir={positionSortDir} />
                            </div>
                          </th>
                          <th className={positionSortField === 'margin' ? 'active' : ''} style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handlePositionSort('margin')}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                              Margin <SortArrows active={positionSortField === 'margin'} dir={positionSortDir} />
                            </div>
                          </th>
                          <th className={positionSortField === 'pnl' ? 'active' : ''} style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handlePositionSort('pnl')}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                              PnL <SortArrows active={positionSortField === 'pnl'} dir={positionSortDir} />
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...positions]
                          .sort((a, b) => {
                            if (!positionSortField) return 0
                            const dir = positionSortDir === 'asc' ? 1 : -1
                            let valA, valB
                            switch (positionSortField) {
                              case 'symbol': valA = a.symbol; valB = b.symbol; break
                              case 'side': valA = a.positionSide; valB = b.positionSide; break
                              case 'size': valA = parseFloat(a.positionSize); valB = parseFloat(b.positionSize); break
                              case 'entry': valA = parseFloat(a.entryPrice); valB = parseFloat(b.entryPrice); break
                              case 'liq': valA = calculateLiquidationPrice(a, leverageBrackets); valB = calculateLiquidationPrice(b, leverageBrackets); break
                              case 'margin': valA = parseFloat(a.isolatedMargin); valB = parseFloat(b.isolatedMargin); break
                              case 'leverage': valA = parseFloat(a.leverage); valB = parseFloat(b.leverage); break
                              case 'pnl': valA = parseFloat(a.unrealizedProfit); valB = parseFloat(b.unrealizedProfit); break
                              default: return 0
                            }
                            if (valA < valB) return -1 * dir
                            if (valA > valB) return 1 * dir
                            return 0
                          })
                          .slice(0, positionsLimit)
                          .map((pos, i) => {
                            const unrealizedPnl = parseFloat(pos.unrealizedProfit || 0)
                            const estLiqPrice = calculateLiquidationPrice(pos, leverageBrackets)
                            return (
                              <tr key={i}>
                                <td style={{ fontWeight: '500' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <CoinLogo symbol={getBaseCoin(pos.symbol)} />
                                    <span>{getBaseCoin(pos.symbol)}</span>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'left' }}>
                                  <SideBadge
                                    side={pos.positionSide === 'LONG' ? 'LONG' : 'SHORT'}
                                    leverage={pos.leverage}
                                    BULLISH_COLOR={BULLISH_COLOR}
                                    BEARISH_COLOR={BEARISH_COLOR}
                                  />
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  {formatNumber(parseFloat(pos.positionSize), 6)}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  ${formatNumber(parseFloat(pos.entryPrice))}
                                </td>
                                <td style={{ textAlign: 'right', color: BEARISH_COLOR }}>
                                  ${formatNumber(estLiqPrice)}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  ${formatNumber(parseFloat(pos.isolatedMargin || 0))}
                                </td>
                                <td style={{
                                  textAlign: 'right',
                                  color: unrealizedPnl >= 0 ? BULLISH_COLOR : BEARISH_COLOR,
                                  fontWeight: '600'
                                }}>
                                  {unrealizedPnl >= 0 ? '+' : ''}${formatNumber(unrealizedPnl)}
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'Balances' && (
            <div>
              {/* Futures Balances */}
              {balanceView === 'Futures' && (
                accountDetails?.balances?.length > 0 ? (
                  <div className="table-scroll-wrapper" style={{ marginBottom: '32px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th className={balanceSortField === 'coin' ? 'active' : ''} style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => handleBalanceSort('coin')}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              Coin <SortArrows active={balanceSortField === 'coin'} dir={balanceSortDir} />
                            </div>
                          </th>
                          <th className={balanceSortField === 'wallet' ? 'active' : ''} style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleBalanceSort('wallet')}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                              Wallet <SortArrows active={balanceSortField === 'wallet'} dir={balanceSortDir} />
                            </div>
                          </th>
                          <th className={balanceSortField === 'available' ? 'active' : ''} style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleBalanceSort('available')}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                              Available <SortArrows active={balanceSortField === 'available'} dir={balanceSortDir} />
                            </div>
                          </th>
                          <th className={balanceSortField === 'frozen' ? 'active' : ''} style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleBalanceSort('frozen')}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                              Frozen <SortArrows active={balanceSortField === 'frozen'} dir={balanceSortDir} />
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...accountDetails.balances]
                          .sort((a, b) => {
                            if (!balanceSortField) return 0
                            const dir = balanceSortDir === 'asc' ? 1 : -1
                            let valA, valB
                            switch (balanceSortField) {
                              case 'coin': valA = a.coin; valB = b.coin; break
                              case 'wallet': valA = parseFloat(a.walletBalance); valB = parseFloat(b.walletBalance); break
                              case 'available': valA = parseFloat(a.availableBalance); valB = parseFloat(b.availableBalance); break
                              case 'frozen': valA = parseFloat(a.openOrderMarginFrozen); valB = parseFloat(b.openOrderMarginFrozen); break
                              default: return 0
                            }
                            if (valA < valB) return -1 * dir
                            if (valA > valB) return 1 * dir
                            return 0
                          })
                          .slice(0, balancesLimit)
                          .map((bal, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: '500' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <CoinLogo symbol={getBaseCoin(bal.coin)} />
                                  <span>{getBaseCoin(bal.coin)}</span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {formatBalance(bal.walletBalance, bal.coin)}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {formatBalance(bal.availableBalance, bal.coin)}
                              </td>
                              <td style={{ textAlign: 'right', color: BEARISH_COLOR }}>
                                {formatBalance(bal.openOrderMarginFrozen, bal.coin)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state-container">
                    <p style={{ color: 'rgba(255,255,255,0.5)' }}>No futures balances found</p>
                  </div>
                )
              )}

              {/* Spot Balances */}
              {balanceView === 'Spot' && (
                spotBalances.length > 0 ? (
                  <div className="table-scroll-wrapper">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th className={balanceSortField === 'coin' ? 'active' : ''} style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => handleBalanceSort('coin')}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              Coin <SortArrows active={balanceSortField === 'coin'} dir={balanceSortDir} />
                            </div>
                          </th>
                          <th className={balanceSortField === 'balance' ? 'active' : ''} style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleBalanceSort('balance')}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                              Balance <SortArrows active={balanceSortField === 'balance'} dir={balanceSortDir} />
                            </div>
                          </th>
                          <th className={balanceSortField === 'available' ? 'active' : ''} style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleBalanceSort('available')}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                              Available <SortArrows active={balanceSortField === 'available'} dir={balanceSortDir} />
                            </div>
                          </th>
                          <th className={balanceSortField === 'frozen' ? 'active' : ''} style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleBalanceSort('frozen')}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                              Frozen <SortArrows active={balanceSortField === 'frozen'} dir={balanceSortDir} />
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...spotBalances]
                          .sort((a, b) => {
                            if (!balanceSortField) return 0
                            const dir = balanceSortDir === 'asc' ? 1 : -1
                            let valA, valB
                            switch (balanceSortField) {
                              case 'coin': valA = a.coin; valB = b.coin; break
                              case 'balance': valA = parseFloat(a.balance); valB = parseFloat(b.balance); break
                              case 'available': valA = parseFloat(a.available); valB = parseFloat(b.available); break
                              case 'frozen': valA = parseFloat(a.frozen); valB = parseFloat(b.frozen); break
                              default: return 0
                            }
                            if (valA < valB) return -1 * dir
                            if (valA > valB) return 1 * dir
                            return 0
                          })
                          .slice(0, balancesLimit)
                          .map((bal, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: '500' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <CoinLogo symbol={getBaseCoin(bal.coin)} />
                                  <span>{getBaseCoin(bal.coin)}</span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {formatBalance(bal.balance, bal.coin)}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {formatBalance(bal.availableBalance, bal.coin)}
                              </td>
                              <td style={{ textAlign: 'right', color: BEARISH_COLOR }}>
                                {formatBalance(bal.freeze, bal.coin)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state-container">
                    <p style={{ color: 'rgba(255,255,255,0.5)' }}>No spot balances found</p>
                  </div>
                )
              )}
            </div>
          )}

          {activeTab === 'Orders' && (
            <div className="empty-state-container">
              <p style={{ color: 'rgba(255,255,255,0.5)' }}>No active orders found.</p>
            </div>
          )}

          {activeTab === 'Trades' && (
            <div>
              {positionHistory.length === 0 ? (
                <div className="empty-state-container">
                  <p style={{ color: 'rgba(255,255,255,0.5)' }}>No position history found</p>
                </div>
              ) : (
                <div className="table-scroll-wrapper">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th className={tradeSortField === 'symbol' ? 'active' : ''} style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => handleTradeSort('symbol')}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            Symbol <SortArrows active={tradeSortField === 'symbol'} dir={tradeSortDir} />
                          </div>
                        </th>
                        <th className={tradeSortField === 'side' ? 'active' : ''} style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => handleTradeSort('side')}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            Side <SortArrows active={tradeSortField === 'side'} dir={tradeSortDir} />
                          </div>
                        </th>
                        <th className={tradeSortField === 'size' ? 'active' : ''} style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleTradeSort('size')}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            Max Size <SortArrows active={tradeSortField === 'size'} dir={tradeSortDir} />
                          </div>
                        </th>
                        <th className={tradeSortField === 'entry' ? 'active' : ''} style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleTradeSort('entry')}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            Avg Entry <SortArrows active={tradeSortField === 'entry'} dir={tradeSortDir} />
                          </div>
                        </th>
                        <th className={tradeSortField === 'close' ? 'active' : ''} style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleTradeSort('close')}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            Avg Close <SortArrows active={tradeSortField === 'close'} dir={tradeSortDir} />
                          </div>
                        </th>
                        <th className={tradeSortField === 'pnl' ? 'active' : ''} style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleTradeSort('pnl')}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            Realized PnL <SortArrows active={tradeSortField === 'pnl'} dir={tradeSortDir} />
                          </div>
                        </th>
                        <th className={tradeSortField === 'fee' ? 'active' : ''} style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleTradeSort('fee')}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            Fees <SortArrows active={tradeSortField === 'fee'} dir={tradeSortDir} />
                          </div>
                        </th>
                        <th className={tradeSortField === 'date' ? 'active' : ''} style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleTradeSort('date')}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            Dates <SortArrows active={tradeSortField === 'date'} dir={tradeSortDir} />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...positionHistory]
                        .sort((a, b) => {
                          const dir = tradeSortDir === 'asc' ? 1 : -1
                          let valA, valB
                          switch (tradeSortField) {
                            case 'symbol':
                              valA = symbolMap[a.symbol_id] || ''
                              valB = symbolMap[b.symbol_id] || ''
                              break
                            case 'side': valA = a.position_side; valB = b.position_side; break
                            case 'size': valA = parseFloat(a.max_size || 0); valB = parseFloat(b.max_size || 0); break
                            case 'entry': valA = parseFloat(a.avg_entry_price || 0); valB = parseFloat(b.avg_entry_price || 0); break
                            case 'close': valA = parseFloat(a.avg_close_price || 0); valB = parseFloat(b.avg_close_price || 0); break
                            case 'pnl': valA = parseFloat(a.realized_pnl || 0); valB = parseFloat(b.realized_pnl || 0); break
                            case 'fee': valA = parseFloat(a.cum_trading_fee || 0); valB = parseFloat(b.cum_trading_fee || 0); break
                            case 'date': valA = new Date(a.updated_at).getTime(); valB = new Date(b.updated_at).getTime(); break
                            default: return 0
                          }
                          if (valA < valB) return -1 * dir
                          if (valA > valB) return 1 * dir
                          return 0
                        })
                        .slice(0, tradesLimit)
                        .map((pos, i) => {
                          const symbolName = symbolMap[pos.symbol_id] || ''
                          const symbolLabel = symbolName ? getBaseCoin(symbolName) : `ID #${pos.symbol_id}`
                          const isLong = parseInt(pos.position_side) === 2
                          const sideLabel = isLong ? 'Long' : 'Short'
                          const sideColor = isLong ? BULLISH_COLOR : BEARISH_COLOR
                          const pnl = parseFloat(pos.realized_pnl) || 0
                          const pnlColor = pnl >= 0 ? BULLISH_COLOR : BEARISH_COLOR

                          return (
                            <tr key={i}>
                              <td style={{ fontWeight: '600' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <CoinLogo symbol={symbolName ? getBaseCoin(symbolName) : ''} />
                                  <span>{symbolLabel}</span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'left' }}>
                                <SideBadge
                                  side={pos.position_side}
                                  leverage={pos.leverage}
                                  BULLISH_COLOR={BULLISH_COLOR}
                                  BEARISH_COLOR={BEARISH_COLOR}
                                />
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {pos.max_size}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                ${formatNumber(parseFloat(pos.avg_entry_price) || 0)}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                ${formatNumber(parseFloat(pos.avg_close_price) || 0)}
                              </td>
                              <td style={{ textAlign: 'right', color: pnlColor, fontWeight: '600' }}>
                                {pnl >= 0 ? '+' : ''}${formatNumber(pnl)}
                              </td>
                              <td style={{ textAlign: 'right', color: BEARISH_COLOR }}>
                                ${formatNumber(parseFloat(pos.cum_trading_fee) || 0)}
                              </td>
                              <td style={{ textAlign: 'right', color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>
                                {new Date(pos.created_at).toLocaleDateString()} - {new Date(pos.updated_at).toLocaleDateString()}
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'Transfers' && (
            <div>
              {withdrawals.length === 0 && fundTransfers.length === 0 ? (
                <div className="empty-state-container">
                  <p style={{ color: 'rgba(255,255,255,0.5)' }}>No withdrawals or transfers found</p>
                </div>
              ) : (
                <>
                  <div className="table-scroll-wrapper">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th className={withdrawSortField === 'date' ? 'active' : ''} style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => handleWithdrawSort('date')}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              TIME <SortArrows active={withdrawSortField === 'date'} dir={withdrawSortDir} />
                            </div>
                          </th>
                          <th className={withdrawSortField === 'type' ? 'active' : ''} style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => handleWithdrawSort('type')}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              Type <SortArrows active={withdrawSortField === 'type'} dir={withdrawSortDir} />
                            </div>
                          </th>
                          <th style={{ textAlign: 'left' }}>Asset</th>
                          <th className={withdrawSortField === 'amount' ? 'active' : ''} style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleWithdrawSort('amount')}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                              Amount <SortArrows active={withdrawSortField === 'amount'} dir={withdrawSortDir} />
                            </div>
                          </th>
                          <th style={{ textAlign: 'left' }}>From</th>
                          <th style={{ textAlign: 'left' }}>To</th>
                          <th style={{ textAlign: 'left' }}>Hash</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...withdrawals, ...fundTransfers]
                          .sort((a, b) => {
                            const dir = withdrawSortDir === 'asc' ? 1 : -1
                            const keyFor = (w) => {
                              switch (withdrawSortField) {
                                case 'date':
                                  return w.stmp || 0
                                case 'amount':
                                  return w.amount != null ? parseFloat(formatCoin(w.amount, w.decimals)) : 0
                                case 'type': {
                                  const { typeLabel } = getWithdrawalTypeMeta(w)
                                  return typeLabel.toLowerCase()
                                }
                                case 'network':
                                  return normalizeNetworkLabel(
                                    w.network || w.chain || w.chainName || w.networkName || w.chainId || ''
                                  ).toLowerCase()
                                case 'fee':
                                  return w.withdrawFee != null ? parseFloat(formatCoin(w.withdrawFee, w.decimals)) : 0
                                case 'status':
                                  return (w.status || '').toString().toLowerCase()
                                default:
                                  return 0
                              }
                            }
                            const ka = keyFor(a)
                            const kb = keyFor(b)
                            if (ka < kb) return -1 * dir
                            if (ka > kb) return 1 * dir
                            return 0
                          })
                          .slice(0, withdrawalsLimit)
                          .map((w, i) => {
                            const amount = formatCoin(w.amount, w.decimals)
                            const coin = (w.token || w.coin || '').trim()
                            const { isDeposit, isWithdraw, typeLabel } = getWithdrawalTypeMeta(w)
                            const flowColor = isDeposit ? BULLISH_COLOR : isWithdraw ? BEARISH_COLOR : '#fff'
                            const sign = isDeposit ? '+' : isWithdraw ? '-' : ''

                            // Determine From/To/Hash
                            let fromAddr = w.fromOverride || '-'
                            let toAddr = w.toOverride || '-'
                            const hash = w.txHash || w.tx_hash || w.hash || '-'

                            if (fromAddr === '-' && toAddr === '-') {
                              if (isDeposit) {
                                fromAddr = w.sender || '-'
                                toAddr = w.receiver || walletAddress || '-'
                              } else if (isWithdraw) {
                                fromAddr = w.sender || walletAddress || '-'
                                toAddr = w.receiver || '-'
                              } else {
                                fromAddr = w.sender || walletAddress || '-'
                                toAddr = w.receiver || '-'
                              }
                            }

                            const isSpecialLabel = (addr) => ['Spot', 'Fund', 'N/A'].includes(addr)

                            return (
                              <tr key={i}>
                                <td style={{ whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.6)' }}>
                                  {formatTimeShort(w.stmp)}
                                </td>
                                <td>
                                  <TransactionTypeBadge type={typeLabel} />
                                </td>
                                <td style={{ fontWeight: '500' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <CoinLogo symbol={getBaseCoin(coin)} />
                                    <span>{getBaseCoin(coin) || (coin ? coin : '???')}</span>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'right', color: flowColor, fontWeight: '600' }}>
                                  {sign}{amount}
                                </td>
                                <td style={{ color: isSpecialLabel(fromAddr) ? '#fff' : 'inherit' }}>
                                  {isSpecialLabel(fromAddr) ? fromAddr : <CopyableAddress address={fromAddr} />}
                                </td>
                                <td style={{ color: isSpecialLabel(toAddr) ? '#fff' : 'inherit' }}>
                                  {isSpecialLabel(toAddr) ? toAddr : <CopyableAddress address={toAddr} />}
                                </td>
                                <td>
                                  <CopyableAddress address={hash} />
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'Performance' && (
            <div>
              {positionHistory.length === 0 ? (
                <div className="empty-state-container">
                  <p style={{ color: 'rgba(255,255,255,0.5)' }}>No trade history available</p>
                </div>
              ) : (
                <div className="table-scroll-wrapper">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Symbol</th>
                        <th style={{ textAlign: 'left' }}>Side</th>
                        <th style={{ textAlign: 'right' }}>Max Size</th>
                        <th style={{ textAlign: 'right' }}>Avg Entry</th>
                        <th style={{ textAlign: 'right' }}>Avg Close</th>
                        <th style={{ textAlign: 'right' }}>Realized PnL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...positionHistory]
                        .sort((a, b) => parseFloat(b.realized_pnl || 0) - parseFloat(a.realized_pnl || 0))
                        .slice(0, performanceLimit)
                        .map((pos, i) => {
                          const symbolName = symbolMap[pos.symbol_id] || ''
                          const symbolLabel = symbolName ? getBaseCoin(symbolName) : `ID #${pos.symbol_id}`
                          const isLong = parseInt(pos.position_side) === 2
                          const sideLabel = isLong ? 'Long' : 'Short'
                          const sideColor = isLong ? BULLISH_COLOR : BEARISH_COLOR
                          const pnl = parseFloat(pos.realized_pnl) || 0
                          const pnlColor = pnl >= 0 ? BULLISH_COLOR : BEARISH_COLOR

                          return (
                            <tr key={i}>
                              <td style={{ fontWeight: '600' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <CoinLogo symbol={symbolName ? getBaseCoin(symbolName) : ''} />
                                  <span>{symbolLabel}</span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'left' }}>
                                <SideBadge
                                  side={pos.position_side}
                                  leverage={pos.leverage}
                                  BULLISH_COLOR={BULLISH_COLOR}
                                  BEARISH_COLOR={BEARISH_COLOR}
                                />
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {pos.max_size}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                ${formatNumber(parseFloat(pos.avg_entry_price) || 0)}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                ${formatNumber(parseFloat(pos.avg_close_price) || 0)}
                              </td>
                              <td style={{ textAlign: 'right', color: pnlColor, fontWeight: '600' }}>
                                {pnl >= 0 ? '+' : ''}${formatNumber(pnl)}
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div >
  )
}
