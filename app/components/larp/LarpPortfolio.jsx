'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { perpsState, perpsBalances, perpsPositions, perpsOrders, perpsOrderHistory, perpsPositionHistory, perpsTrades, perpsFundings, spotBalances, spotOrders, perpsMarkPrices } from '../../lib/sodexApi'
import { useWalletData } from '../../hooks/useWalletData'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from 'recharts'
import LarpAnnouncements from './LarpAnnouncements'

const LOGO_BASE = 'https://yifkydhsbflzfprteots.supabase.co/storage/v1/object/public/coin-logos/'
const LOGO_EXT = { hype:'jpg', pump:'jpg', trump:'jpg', wld:'jpg', xlm:'jpg', ton:'jpg', mag7:'png', soso:'png', silver:'svg', wif:'jpeg' }
const LOGO_ALIASES = { wsoso: 'soso', mag7ssi: 'mag7', pepe: '1000pepe', shib: '1000shib', bonk: '1000bonk' }
const getCoinLogoUrl = (s) => { if (!s) return null; let l = s.toLowerCase(); if (LOGO_ALIASES[l]) l = LOGO_ALIASES[l]; return `${LOGO_BASE}${l}.${LOGO_EXT[l]||'png'}` }

// Clean coin names — same as scan's getBaseCoin
const QUOTE_CURRENCIES = ['USD', 'USDT', 'USDE', 'DAI']
const COIN_MAP = { 'WETH':'ETH','WBTC':'BTC','WBNB':'BNB','WUSDC':'USDC','WUSDT':'USDT','USDbC':'USDC','VUSDC':'USDC','USDE':'USDC','WSOSO':'SOSO','VUSD':'USDC','KDEFI':'DEFI','KMEME':'MEME','KGOLD':'GOLD','KSILVER':'SILVER' }
const getBaseCoin = (symbol) => {
  if (!symbol) return ''
  let clean = symbol.toString().trim().toUpperCase()
  if (clean === 'USD' || clean === 'VUSD') return 'USDC'
  if (COIN_MAP[clean]) return COIN_MAP[clean]
  const parts = clean.split(/[_./-]/)
  const networks = ['BASE','ARB','OP','POLYGON','BSC','SONIC','HYPER','ETH']
  if (networks.includes(parts[0]) && parts.length > 1) {
    const rest = parts.slice(1).join('_')
    return COIN_MAP[rest] || rest
  }
  for (const p of parts) {
    if (QUOTE_CURRENCIES.includes(p)) continue
    if (COIN_MAP[p]) return COIN_MAP[p]
    // Strip k prefix (index tokens like kDEFI, kMEME)
    if (/^K[A-Z]/.test(p) && p.length > 2) { const s = p.slice(1); if (COIN_MAP[s]) return COIN_MAP[s]; return s }
    if (/^[VW][A-Z]/.test(p)) { const s = p.slice(1); if (COIN_MAP[s]) return COIN_MAP[s]; return s }
    return p
  }
  return 'USDC'
}

const CoinLogo = ({ symbol, size = '18px' }) => {
  const [ok, setOk] = useState(true)
  const clean = getBaseCoin(symbol)
  const url = getCoinLogoUrl(clean)
  if (!url || !ok) return (
    <span style={{ width: size, height: size, borderRadius: '50%', background: '#1a1a1a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#666', border: '1px solid #333', flexShrink: 0 }}>
      {clean?.slice(0,1)}
    </span>
  )
  return <img src={url} alt={clean} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} onError={() => setOk(false)} />
}

const fmtNum = (n, d = 2) => { if (n == null) return '-'; return parseFloat(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) }
const fmtUsd = (n) => { if (n == null) return '-'; return '$' + fmtNum(n) }
const fmtTime = (ts) => { if (!ts) return '-'; const d = new Date(typeof ts === 'number' && ts < 1e12 ? ts * 1000 : ts); return d.toLocaleString() }
const fmtDateShort = (ts) => { const d = new Date(ts); return d.toISOString().slice(0, 10) }

const pnlClass = (v) => {
  const n = parseFloat(v)
  if (isNaN(n) || n === 0) return ''
  return n > 0 ? 'larp-green' : 'larp-red'
}

const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="8" cy="8" r="7" stroke="#A3A3A3" strokeWidth="1.2" />
    <path d="M8 7v4" stroke="#A3A3A3" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="8" cy="5" r="0.8" fill="#A3A3A3" />
  </svg>
)

const ShareIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
)

const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
)

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A3A3A3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

// Coins that are pending incoming (deposit/withdraw disabled)
const INCOMING_COINS = ['PURR', 'JEFF']

const ALL_TABS = [
  { key: 'balances', label: 'Balances' },
  { key: 'positions', label: 'Positions' },
  { key: 'orders', label: 'Open Orders' },
  { key: 'trades', label: 'Trade History' },
  { key: 'funding', label: 'Funding History' },
  { key: 'orderHistory', label: 'Order History' },
  { key: 'positionHistory', label: 'Position History' },
  { key: 'deposits', label: 'Deposits & Withdrawals' },
]

export default function LarpPortfolio({ wallet }) {
  const [balances, setBalances] = useState(null)
  const [positions, setPositions] = useState([])
  const [spotBals, setSpotBals] = useState([])
  const [openOrders, setOpenOrders] = useState([])
  const [tradeHistory, setTradeHistory] = useState([])
  const [fundingHistory, setFundingHistory] = useState([])
  const [orderHistory, setOrderHistory] = useState([])
  const [positionHistory, setPositionHistory] = useState([])
  const [activeTab, setActiveTab] = useState('balances')
  const [loading, setLoading] = useState(false)
  const [hideSmall, setHideSmall] = useState(false)
  const [searchCoin, setSearchCoin] = useState('')
  const [markPrices, setMarkPrices] = useState({}) // coin → price
  const [showMoreTabs, setShowMoreTabs] = useState(false)
  const [visibleTabCount, setVisibleTabCount] = useState(ALL_TABS.length)
  const [expandedCoins, setExpandedCoins] = useState({}) // coin → bool for USDC/USDT dropdown
  const intervalRef = useRef(null)
  const fastIntervalRef = useRef(null)
  const moreRef = useRef(null)
  const tabsRowRef = useRef(null)
  const markPricesLoadedRef = useRef(false)
  const { data: walletData } = useWalletData(wallet || null)

  // Fetch mark prices — maps symbol (BTC-USD) → baseCoin price
  const fetchMarkPrices = async () => {
    try {
      const mp = await perpsMarkPrices()
      if (!mp) return
      const priceMap = { USDC: 1, USDT: 1 }
      const arr = Array.isArray(mp) ? mp : []
      arr.forEach(item => {
        const sym = item.s || item.symbol || ''
        const price = parseFloat(item.p || item.markPrice || item.price || 0)
        if (!sym || !price) return
        // Store under raw prefix (e.g. kDEFI) AND cleaned base coin (e.g. DEFI)
        const rawBase = (sym.split('-')[0] || sym).toUpperCase()
        const cleanBase = getBaseCoin(rawBase)
        priceMap[rawBase] = price
        priceMap[cleanBase] = price
      })
      setMarkPrices(priceMap)
    } catch { /* ignore */ }
  }

  // Fast poll: balances + mark prices only (every 5s for top stats)
  const fetchFast = async (addr) => {
    const [rawBal] = await Promise.all([
      perpsBalances(addr).catch(() => null),
      fetchMarkPrices(),
    ])
    const bal = rawBal?.balances?.[0] ?? (Array.isArray(rawBal) ? rawBal[0] : rawBal)
    setBalances(bal || null)
  }

  // Full fetch: all tabs data (only on load + manual refresh)
  const fetchAll = async (addr) => {
    setLoading(true)
    await fetchFast(addr)

    const [rawPos, rawSpot, rawOrders, rawTrades, rawFunding, rawOH, rawPH] = await Promise.all([
      perpsPositions(addr).catch(() => null),
      spotBalances(addr).catch(() => null),
      perpsOrders(addr).catch(() => null),
      perpsTrades(addr, { limit: 50 }).catch(() => null),
      perpsFundings(addr, { limit: 50 }).catch(() => null),
      perpsOrderHistory(addr, { limit: 50 }).catch(() => null),
      perpsPositionHistory(addr, { limit: 50 }).catch(() => null),
    ])

    const pos = rawPos?.positions ?? (Array.isArray(rawPos) ? rawPos : rawPos ? [rawPos] : [])
    // Sort once by size (margin × leverage), largest first
    pos.sort((a, b) => {
      const sizeA = Math.abs(parseFloat(a.initialMargin ?? a.margin ?? 0)) * parseFloat(a.leverage ?? 1)
      const sizeB = Math.abs(parseFloat(b.initialMargin ?? b.margin ?? 0)) * parseFloat(b.leverage ?? 1)
      return sizeB - sizeA
    })
    setPositions(pos)
    setSpotBals(rawSpot?.balances ?? (Array.isArray(rawSpot) ? rawSpot : []))
    const ords = rawOrders?.orders ?? (Array.isArray(rawOrders) ? rawOrders : [])
    setOpenOrders(ords)
    setTradeHistory(Array.isArray(rawTrades) ? rawTrades : [])
    setFundingHistory(Array.isArray(rawFunding) ? rawFunding : [])
    setOrderHistory(Array.isArray(rawOH) ? rawOH : [])
    setPositionHistory(Array.isArray(rawPH) ? rawPH : [])

    // Refresh mark prices on full fetch too
    await fetchMarkPrices()
    setLoading(false)
  }

  // Close more-tabs dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setShowMoreTabs(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Responsive tabs — measure available width and hide overflow into "..." menu
  useEffect(() => {
    const el = tabsRowRef.current
    if (!el) return
    const measure = () => {
      const rowW = el.offsetWidth
      // toolbar ~280px + more btn ~30px + padding
      const availW = rowW - 320
      // approx 100px per tab on average
      const fit = Math.max(3, Math.floor(availW / 100))
      setVisibleTabCount(Math.min(fit, ALL_TABS.length))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Fetch mark prices on mount (before any wallet)
  useEffect(() => {
    if (!markPricesLoadedRef.current) {
      markPricesLoadedRef.current = true
      fetchMarkPrices()
    }
  }, [])

  useEffect(() => {
    if (fastIntervalRef.current) clearInterval(fastIntervalRef.current)
    if (!wallet) {
      setBalances(null)
      setPositions([])
      setSpotBals([])
      setOpenOrders([])
      setTradeHistory([])
      setFundingHistory([])
      setOrderHistory([])
      setPositionHistory([])
      return
    }
    fetchAll(wallet)
    // Fast poll: balances + positions every 5s for top stats
    fastIntervalRef.current = setInterval(() => fetchFast(wallet), 5000)
    return () => { if (fastIntervalRef.current) clearInterval(fastIntervalRef.current) }
  }, [wallet])

  // PnL from walletData (overview + leaderboard — same source as scan)
  const wdOverview = walletData?.data?.overview?.data ?? walletData?.data?.overview ?? null
  const wdLb = walletData?.data?.leaderboard_entry ?? null
  const unrealizedPnl = wdLb?.unrealized_pnl ?? balances?.unrealizedProfit ?? balances?.unRealizedProfit ?? null
  const cumulativePnl = wdOverview?.cumulative_pnl ?? wdLb?.cumulative_pnl ?? null
  const closedPnl = cumulativePnl != null && unrealizedPnl != null
    ? parseFloat(cumulativePnl) - parseFloat(unrealizedPnl)
    : (balances?.realizedProfit ?? balances?.realizedPnl ?? null)
  const totalPnl = cumulativePnl ?? (
    (unrealizedPnl != null && closedPnl != null) ? parseFloat(unrealizedPnl) + parseFloat(closedPnl) : null
  )
  const volume = wdOverview?.cumulative_quote_volume ?? null

  // Vault balance placeholder (API doesn't have vault)
  const vaultBalance = null

  // Compute totals from ALL balances (unfiltered) + spot
  const allBalanceTotals = useMemo(() => {
    // Perps balance USD
    const perpsTotal = parseFloat(balances?.total || 0)
    const perpsPrice = markPrices[getBaseCoin(balances?.coin || 'USDC')] ?? 1
    const perpsUsd = perpsTotal * perpsPrice

    // Spot balances USD
    let spotUsd = 0
    spotBals.forEach(s => {
      const bal = parseFloat(s.balance ?? s.total ?? 0)
      const coin = getBaseCoin(s.coin ?? s.asset ?? '')
      const price = markPrices[coin] ?? (coin === 'USDC' || coin === 'USDT' ? 1 : 0)
      spotUsd += bal * price
    })

    // Trading Value = all balances combined USD value
    const tradingValue = perpsUsd + spotUsd

    // Total Assets = everything (same as trading value when vault is 0)
    const totalAssets = tradingValue + (vaultBalance ?? 0)

    // Available Balance = perps available + spot free balances (not in orders/positions)
    const perpsAvail = parseFloat(balances?.availableBalance ?? balances?.available ?? 0) * perpsPrice
    let spotAvail = 0
    spotBals.forEach(s => {
      const free = parseFloat(s.free ?? s.available ?? s.balance ?? s.total ?? 0)
      const coin = getBaseCoin(s.coin ?? s.asset ?? '')
      const price = markPrices[coin] ?? (coin === 'USDC' || coin === 'USDT' ? 1 : 0)
      spotAvail += free * price
    })
    const availableBalance = perpsAvail + spotAvail

    return { tradingValue, totalAssets, availableBalance }
  }, [balances, spotBals, markPrices, vaultBalance])

  // PnL chart data — cumulative only, no daily changes (same source as scan)
  const pnlChartData = useMemo(() => {
    const items = walletData?.data?.daily_pnl?.data?.items
      ?? walletData?.data?.daily_pnl?.items
      ?? walletData?.data?.daily_pnl
    if (!items || !Array.isArray(items) || items.length === 0) return []
    return [...items]
      .sort((a, b) => (a.ts_ms ?? a.time ?? 0) - (b.ts_ms ?? b.time ?? 0))
      .map(item => ({
        ts_ms: item.ts_ms ?? item.time,
        pnl: parseFloat(item.pnl ?? item.cumulative ?? 0),
      }))
  }, [walletData])

  // Merge all balances for bottom table
  // USDC/USDT: group futures + spot into one parent row with expandable children
  const allBalances = useMemo(() => {
    const rows = []
    const stableSpot = {} // coin → spot balance entry

    // Futures balance (perps)
    let futuresBal = null
    if (balances) {
      const coinName = getBaseCoin(balances.coin || 'USDC')
      const price = markPrices[coinName] ?? 1
      const total = parseFloat(balances.total || 0)
      futuresBal = {
        coin: coinName,
        total,
        usdValue: total * price,
        available: parseFloat(balances.availableBalance ?? balances.available ?? 0),
        isSpot: false,
        label: 'Futures',
      }
    }

    // Spot balances
    const spotEntries = []
    spotBals.forEach(s => {
      const bal = parseFloat(s.balance ?? s.total ?? 0)
      const coinName = getBaseCoin(s.coin ?? s.asset ?? '')
      const price = markPrices[coinName] ?? 0
      const entry = {
        coin: coinName,
        total: bal,
        usdValue: bal * price,
        available: parseFloat(s.free ?? s.available ?? bal),
        isSpot: true,
        label: 'Spot',
      }
      // Group stablecoins for parent row
      if (coinName === 'USDC' || coinName === 'USDT') {
        stableSpot[coinName] = entry
      } else {
        spotEntries.push(entry)
      }
    })

    // Build USDC/USDT parent rows with children
    const stableCoins = futuresBal ? [futuresBal.coin] : []
    Object.keys(stableSpot).forEach(c => { if (!stableCoins.includes(c)) stableCoins.push(c) })

    for (const coin of stableCoins) {
      const futures = (futuresBal && futuresBal.coin === coin) ? futuresBal : null
      const spot = stableSpot[coin] || null
      const children = [futures, spot].filter(Boolean)
      if (children.length === 0) continue
      const totalBal = children.reduce((s, c) => s + c.total, 0)
      const totalUsd = children.reduce((s, c) => s + c.usdValue, 0)
      const totalAvail = children.reduce((s, c) => s + c.available, 0)
      rows.push({
        coin,
        total: totalBal,
        usdValue: totalUsd,
        available: totalAvail,
        isSpot: false,
        isParent: children.length > 1,
        children,
      })
    }

    // Non-stable spot coins
    spotEntries.forEach(e => {
      rows.push({ ...e, isParent: false, children: null })
    })

    let filtered = rows
    if (searchCoin) {
      filtered = filtered.filter(b => b.coin?.toLowerCase().includes(searchCoin.toLowerCase()))
    }
    if (hideSmall) {
      filtered = filtered.filter(b => b.usdValue >= 1)
    }
    return filtered
  }, [balances, spotBals, hideSmall, searchCoin, markPrices])

  // Tab counts
  const tabCounts = {
    balances: allBalances.length,
    positions: positions.length,
    orders: openOrders.length,
  }

  const connectBtn = (
    <button className="larp-port-connect-btn" onClick={() => {}}>
      Connect Wallet
    </button>
  )

  return (
    <div className="larp-page-with-sidebar">
    <div className="larp-portfolio">
      {/* Header */}
      <div className="larp-port-header">
        <div className="larp-port-title-row">
          <h2 className="larp-port-title">Portfolio</h2>
          <button
            className={`larp-port-share-btn${!wallet ? ' disabled' : ''}`}
            disabled={!wallet}
          >
            <span>Share</span>
            <ShareIcon />
          </button>
        </div>
        <div className="larp-port-header-actions">
          <button className="larp-port-action-btn">Transfer</button>
          <button className="larp-port-action-btn">Withdraw</button>
          <button className="larp-port-action-btn">Deposit</button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="larp-port-stats">
        <div className="larp-port-stat">
          <div className="larp-port-stat-label">
            <span>Total Assets</span>
            <InfoIcon />
          </div>
          <div className="larp-port-stat-value">
            {wallet ? (loading && !balances ? '-' : fmtUsd(allBalanceTotals.totalAssets)) : '-'}
          </div>
        </div>
        <div className="larp-port-stat">
          <div className="larp-port-stat-label">
            <span>Trading Value</span>
            <InfoIcon />
          </div>
          <div className="larp-port-stat-value">
            {wallet ? (loading && !balances ? '-' : fmtUsd(allBalanceTotals.tradingValue)) : '-'}
          </div>
        </div>
        <div className="larp-port-stat">
          <div className="larp-port-stat-label">
            <span>Available Balance</span>
            <InfoIcon />
          </div>
          <div className="larp-port-stat-value">
            {wallet ? (loading && !balances ? '-' : fmtUsd(allBalanceTotals.availableBalance)) : '-'}
          </div>
        </div>
        <div className="larp-port-stat">
          <div className="larp-port-stat-label">
            <span>Vault Balance</span>
            <InfoIcon />
          </div>
          <div className="larp-port-stat-value">
            {wallet ? (vaultBalance != null ? fmtUsd(vaultBalance) : '$0.00') : '-'}
          </div>
        </div>
      </div>

      {/* PnL Panels Row */}
      <div className="larp-port-pnl-row">
        {/* Left panel — PnL Summary */}
        <div className="larp-port-pnl-panel">
          <div className="larp-port-pnl-panel-header">
            <span className="larp-port-pnl-header-title">Total Assets (Futures + Vault) All-time</span>
          </div>
          <div className="larp-port-pnl-panel-body">
            <div className="larp-port-pnl-line">
              <span className="larp-port-pnl-label">Total PnL</span>
              <span className={`larp-port-pnl-value ${pnlClass(totalPnl)}`}>
                {wallet ? fmtUsd(totalPnl) : '-'}
              </span>
            </div>
            <div className="larp-port-pnl-line">
              <span className="larp-port-pnl-label">Unrealized PnL (Futures)</span>
              <span className={`larp-port-pnl-value ${pnlClass(unrealizedPnl)}`}>
                {wallet ? fmtUsd(unrealizedPnl) : '-'}
              </span>
            </div>
            <div className="larp-port-pnl-line">
              <span className="larp-port-pnl-label">Closed PnL (Futures)</span>
              <span className={`larp-port-pnl-value ${pnlClass(closedPnl)}`}>
                {wallet ? fmtUsd(closedPnl) : '-'}
              </span>
            </div>
            <div className="larp-port-pnl-line">
              <span className="larp-port-pnl-label">Vault PnL</span>
              <span className="larp-port-pnl-value">
                {wallet ? '$0.00' : '-'}
              </span>
            </div>
            <div className="larp-port-pnl-line">
              <span className="larp-port-pnl-label">Volume</span>
              <span className="larp-port-pnl-value">
                {wallet ? fmtUsd(volume) : '-'}
              </span>
            </div>
          </div>
          <div className="larp-port-pnl-panel-footer">
            <span>Updated just now</span>
          </div>
        </div>

        {/* Right panel — PnL Chart */}
        <div className="larp-port-pnl-panel">
          <div className="larp-port-pnl-panel-header larp-port-pnl-chart-header">
            <div className="larp-port-pnl-chart-tabs">
              <span className="larp-port-pnl-chart-tab active">PnL</span>
            </div>
            <span className="larp-port-pnl-chart-subtitle">Total Assets (Futures + Vault) All-time</span>
          </div>
          <div className="larp-port-pnl-chart-divider" />
          <div className="larp-port-pnl-chart-area">
            {wallet && pnlChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pnlChartData} margin={{ top: 16, right: 16, bottom: 8, left: 0 }}>
                  <defs>
                    <linearGradient id="pnlFade" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ade80" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#4ade80" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#262626" strokeDasharray="" vertical={false} />
                  <XAxis
                    dataKey="ts_ms"
                    tickFormatter={fmtDateShort}
                    stroke="#A3A3A3"
                    tick={{ fontSize: 11, fill: '#A3A3A3' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#A3A3A3"
                    tick={{ fontSize: 11, fill: '#A3A3A3' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => '$' + v.toFixed(0)}
                    width={55}
                    tickCount={8}
                  />
                  <Tooltip
                    contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 4, fontSize: 12 }}
                    labelFormatter={fmtDateShort}
                    formatter={(v) => ['$' + v.toFixed(2), 'PnL']}
                  />
                  <Area
                    type="monotone"
                    dataKey="pnl"
                    stroke="#4ade80"
                    strokeWidth={2}
                    fill="url(#pnlFade)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="larp-port-pnl-chart-empty">
                <span>{wallet ? 'No PnL data available' : 'Connect wallet to view PnL chart'}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Tabs */}
      <div className="larp-port-bottom-master">
        <div className="larp-port-tabs-row" ref={tabsRowRef}>
          <div className="larp-port-tabs">
            {ALL_TABS.slice(0, visibleTabCount).map(t => (
              <button
                key={t.key}
                className={`larp-port-tab${activeTab === t.key ? ' active' : ''}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}{tabCounts[t.key] != null ? `(${tabCounts[t.key]})` : ''}
              </button>
            ))}
          </div>
          {visibleTabCount < ALL_TABS.length && (
            <div className="larp-port-more-wrap" ref={moreRef}>
              <button
                className="larp-port-tab larp-port-more-btn"
                onClick={() => setShowMoreTabs(v => !v)}
              >...</button>
              {showMoreTabs && (
                <div className="larp-port-more-dropdown">
                  {ALL_TABS.slice(visibleTabCount).map(t => (
                    <button
                      key={t.key}
                      className={`larp-port-more-item${activeTab === t.key ? ' active' : ''}`}
                      onClick={() => { setActiveTab(t.key); setShowMoreTabs(false) }}
                    >{t.label}</button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Toolbar: hide small + search + refresh — same row */}
          <div className="larp-port-toolbar">
            <label className="larp-port-hide-small">
              <span className="larp-port-checkbox-wrap">
                <input
                  type="checkbox"
                  checked={hideSmall}
                  onChange={e => setHideSmall(e.target.checked)}
                />
                <span className="larp-port-checkmark" />
              </span>
              <span className="larp-port-hide-small-text">Hide small balances</span>
            </label>
            <div className="larp-port-search">
              <SearchIcon />
              <input
                type="text"
                placeholder="Search coin"
                value={searchCoin}
                onChange={e => setSearchCoin(e.target.value)}
                className="larp-port-search-input"
              />
            </div>
            <button className="larp-port-refresh-btn" onClick={() => wallet && fetchAll(wallet)}>
              <RefreshIcon />
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="larp-port-tab-content">
          {!wallet ? (
            <div className="larp-port-no-wallet">
              {connectBtn}
            </div>
          ) : loading ? (
            <div className="larp-port-no-wallet"><span>Loading...</span></div>
          ) : (
            <>
              {activeTab === 'balances' && (
                allBalances.length === 0 ? (
                  <div className="larp-port-no-wallet"><span>No balances</span></div>
                ) : (
                  <table className="larp-table">
                    <thead>
                      <tr>
                        <th>Coin</th><th>Total Balance</th><th>USD Value</th>
                        <th>Available Balance</th><th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allBalances.flatMap((b, i) => {
                        const isUsdc = b.coin === 'USDC'
                        const isIncoming = INCOMING_COINS.includes(b.coin)
                        const coinClass = isUsdc ? 'larp-port-coin-white' : 'larp-port-coin-blue'
                        const expanded = expandedCoins[b.coin]
                        const parentRows = [(
                          <tr key={i}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {b.isParent && (
                                  <span
                                    className={`larp-port-expand-arrow${expanded ? ' open' : ''}`}
                                    onClick={() => setExpandedCoins(prev => ({ ...prev, [b.coin]: !prev[b.coin] }))}
                                  >&#9654;</span>
                                )}
                                <CoinLogo symbol={b.coin} />
                                <span className={coinClass}>{b.coin}</span>
                              </div>
                            </td>
                            <td>{fmtNum(b.total, 4)}</td>
                            <td>{fmtUsd(b.usdValue)}</td>
                            <td>{fmtNum(b.available, 4)}</td>
                            <td className="larp-port-actions-cell">
                              <span className="larp-port-action-link">Transfer to/from</span>
                              <span className={`larp-port-action-link${isIncoming ? ' disabled' : ''}`}>Deposit</span>
                              <span className={`larp-port-action-link${isIncoming ? ' disabled' : ''}`}>Withdraw</span>
                            </td>
                          </tr>
                        )]
                        // Expanded children for USDC/USDT
                        if (b.isParent && expanded && b.children) {
                          b.children.forEach((child, ci) => {
                            parentRows.push(
                              <tr key={`${i}-${ci}`} className="larp-port-child-row">
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '24px' }}>
                                    <span className={coinClass}>{child.coin} ({child.label})</span>
                                  </div>
                                </td>
                                <td>{fmtNum(child.total, 4)}</td>
                                <td>{fmtUsd(child.usdValue)}</td>
                                <td>{fmtNum(child.available, 4)}</td>
                                <td className="larp-port-actions-cell">
                                  <span className="larp-port-action-link">Transfer to/from</span>
                                  <span className="larp-port-action-link">Deposit</span>
                                  <span className="larp-port-action-link">Withdraw</span>
                                </td>
                              </tr>
                            )
                          })
                        }
                        return parentRows
                      })}
                    </tbody>
                  </table>
                )
              )}

              {activeTab === 'positions' && (
                positions.length === 0 ? (
                  <div className="larp-port-no-wallet"><span>No positions</span></div>
                ) : (
                  <table className="larp-table">
                    <thead>
                      <tr>
                        <th>Coin</th><th>Amount</th><th>Position Value</th><th>Entry Price</th>
                        <th>Mark Price</th><th>Unrealized PnL (ROE%)</th><th>Liq. Price</th><th>Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((p, i) => {
                        const pnl = parseFloat(p.unrealizedProfit ?? p.unRealizedProfit ?? p.realizedPnL ?? 0)
                        const cleanSym = getBaseCoin(p.symbol)
                        const margin = parseFloat(p.initialMargin ?? p.margin ?? 0)
                        const lev = parseFloat(p.leverage ?? 1)
                        const amt = parseFloat(p.size ?? p.positionAmt ?? 0)
                        const markP = parseFloat(p.markPrice ?? p.price ?? 0)
                        const posValue = Math.abs(amt) * markP
                        const roe = margin > 0 ? (pnl / margin) * 100 : 0
                        const rowClass = pnl > 0 ? 'larp-pos-row-profit' : pnl < 0 ? 'larp-pos-row-loss' : 'larp-pos-row-neutral'
                        return (
                          <tr key={i} className={rowClass}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CoinLogo symbol={cleanSym} />
                                <span className={pnl > 0 ? 'larp-pos-coin-profit' : pnl < 0 ? 'larp-pos-coin-loss' : 'larp-port-coin-blue'}>{cleanSym}</span>
                                <span className="larp-pos-leverage">{p.marginMode === 'cross' ? 'Cross' : ''} {lev}x</span>
                              </div>
                            </td>
                            <td>{fmtNum(amt, 4)}</td>
                            <td>{fmtUsd(posValue)}</td>
                            <td>{fmtNum(p.avgEntryPrice ?? p.entryPrice, 4)}</td>
                            <td>{fmtNum(markP, 4)}</td>
                            <td className={pnlClass(pnl)}>
                              {fmtUsd(pnl)}
                              <span style={{ fontSize: '12px', marginLeft: '4px', opacity: 0.8 }}>
                                ({roe >= 0 ? '+' : ''}{roe.toFixed(2)}%)
                              </span>
                            </td>
                            <td>{fmtNum(p.liquidationPrice ?? p.liqPrice, 4)}</td>
                            <td>{fmtUsd(margin)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )
              )}

              {activeTab === 'orders' && (
                openOrders.length === 0 ? (
                  <div className="larp-port-no-wallet"><span>No open orders</span></div>
                ) : (
                  <table className="larp-table">
                    <thead>
                      <tr><th>Symbol</th><th>Side</th><th>Type</th><th>Price</th><th>Qty</th><th>Status</th><th>Time</th></tr>
                    </thead>
                    <tbody>
                      {openOrders.map((o, i) => (
                        <tr key={i}>
                          <td><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CoinLogo symbol={getBaseCoin(o.symbol)} /><span className="larp-port-coin-blue">{getBaseCoin(o.symbol)}</span></div></td>
                          <td>{o.side}</td>
                          <td>{o.type}</td>
                          <td>{fmtNum(o.price, 4)}</td>
                          <td>{fmtNum(o.origQty ?? o.qty, 4)}</td>
                          <td>{o.status}</td>
                          <td>{fmtTime(o.time ?? o.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {activeTab === 'trades' && (
                tradeHistory.length === 0 ? (
                  <div className="larp-port-no-wallet"><span>No trade history</span></div>
                ) : (
                  <table className="larp-table">
                    <thead>
                      <tr><th>Symbol</th><th>Side</th><th>Price</th><th>Qty</th><th>Fee</th><th>Time</th></tr>
                    </thead>
                    <tbody>
                      {tradeHistory.map((t, i) => (
                        <tr key={i}>
                          <td><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CoinLogo symbol={getBaseCoin(t.symbol)} /><span className="larp-port-coin-blue">{getBaseCoin(t.symbol)}</span></div></td>
                          <td>{t.side}</td>
                          <td>{fmtNum(t.price ?? t.p, 4)}</td>
                          <td>{fmtNum(t.quantity ?? t.qty ?? t.q, 4)}</td>
                          <td>{fmtNum(t.fee ?? t.commission, 6)}</td>
                          <td>{fmtTime(t.time ?? t.timestamp ?? t.T)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {activeTab === 'funding' && (
                fundingHistory.length === 0 ? (
                  <div className="larp-port-no-wallet"><span>No funding history</span></div>
                ) : (
                  <table className="larp-table">
                    <thead>
                      <tr><th>Symbol</th><th>Position Side</th><th>Funding Fee</th><th>Fee Coin</th><th>Time</th></tr>
                    </thead>
                    <tbody>
                      {fundingHistory.map((f, i) => (
                        <tr key={i}>
                          <td><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CoinLogo symbol={getBaseCoin(f.symbol)} /><span className="larp-port-coin-blue">{getBaseCoin(f.symbol)}</span></div></td>
                          <td>{f.positionSide}</td>
                          <td className={pnlClass(f.fundingFee)}>{fmtNum(f.fundingFee, 6)}</td>
                          <td>{f.feeCoin ?? f.asset ?? '-'}</td>
                          <td>{fmtTime(f.timestamp ?? f.time)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {activeTab === 'orderHistory' && (
                orderHistory.length === 0 ? (
                  <div className="larp-port-no-wallet"><span>No order history</span></div>
                ) : (
                  <table className="larp-table">
                    <thead>
                      <tr><th>Symbol</th><th>Side</th><th>Type</th><th>Price</th><th>Qty</th><th>Status</th><th>Time</th></tr>
                    </thead>
                    <tbody>
                      {orderHistory.map((o, i) => (
                        <tr key={i}>
                          <td><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CoinLogo symbol={getBaseCoin(o.symbol)} /><span className="larp-port-coin-blue">{getBaseCoin(o.symbol)}</span></div></td>
                          <td>{o.side}</td>
                          <td>{o.type}</td>
                          <td>{fmtNum(o.price, 4)}</td>
                          <td>{fmtNum(o.origQty ?? o.qty, 4)}</td>
                          <td>{o.status}</td>
                          <td>{fmtTime(o.createdAt ?? o.time ?? o.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {activeTab === 'positionHistory' && (
                positionHistory.length === 0 ? (
                  <div className="larp-port-no-wallet"><span>No position history</span></div>
                ) : (
                  <table className="larp-table">
                    <thead>
                      <tr><th>Symbol</th><th>Side</th><th>Size</th><th>Entry</th><th>Close</th><th>PnL</th><th>Time</th></tr>
                    </thead>
                    <tbody>
                      {positionHistory.map((p, i) => (
                        <tr key={i}>
                          <td><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CoinLogo symbol={getBaseCoin(p.symbol)} /><span className="larp-port-coin-blue">{getBaseCoin(p.symbol)}</span></div></td>
                          <td>{p.positionSide ?? p.side}</td>
                          <td>{fmtNum(p.size ?? p.positionAmt, 4)}</td>
                          <td>{fmtNum(p.avgEntryPrice ?? p.entryPrice, 4)}</td>
                          <td>{fmtNum(p.avgClosePrice ?? p.closePrice ?? p.exitPrice, 4)}</td>
                          <td className={pnlClass(p.realizedPnL ?? p.realizedPnl ?? p.pnl)}>{fmtUsd(p.realizedPnL ?? p.realizedPnl ?? p.pnl)}</td>
                          <td>{fmtTime(p.updatedAt ?? p.closeTime ?? p.timestamp ?? p.time)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {activeTab === 'deposits' && (
                <div className="larp-port-no-wallet"><span>No deposit/withdrawal history</span></div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
    <LarpAnnouncements />
    </div>
  )
}
