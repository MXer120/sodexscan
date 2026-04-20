'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createChart, CandlestickSeries, HistogramSeries } from 'lightweight-charts'
import {
  perpsTickers, perpsSymbols, perpsOrderbook, perpsKlines,
  perpsRecentTrades, perpsPositions, perpsOrders, perpsBalances,
  spotTickers
} from '../../lib/sodexApi'

const fmtNum = (n, d = 2) => {
  if (n == null) return '-'
  return parseFloat(n).toLocaleString('en-US', { maximumFractionDigits: d })
}
const fmtUsd = (n) => {
  if (n == null) return '-'
  const v = parseFloat(n)
  if (Math.abs(v) >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B'
  if (Math.abs(v) >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M'
  if (Math.abs(v) >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K'
  return '$' + v.toFixed(2)
}
const fmtPct = (n) => {
  if (n == null) return '-'
  const v = parseFloat(n)
  return (v >= 0 ? '+' : '') + v.toFixed(2) + '%'
}

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1D', '1W']
const BOTTOM_TABS = [
  { key: 'balances', label: 'Balances' },
  { key: 'positions', label: 'Position' },
  { key: 'orders', label: 'Open Orders' },
  { key: 'tradeHistory', label: 'Trade History' },
  { key: 'fundingHistory', label: 'Funding History' },
  { key: 'orderHistory', label: 'Order History' },
  { key: 'positionHistory', label: 'Position History' },
  { key: 'deposits', label: 'Deposits and Withdrawals' },
]

export default function LarpTrade({ wallet }) {
  // --- State ---
  const [marketMode, setMarketMode] = useState('perps') // 'spot' | 'perps'
  const [selectedSymbol, setSelectedSymbol] = useState('BTC-USD')
  const [openTabs, setOpenTabs] = useState([
    { symbol: 'BTC-USD', type: 'Perp' },
    { symbol: 'ETH-USD', type: 'Perp' },
  ])
  const [symbols, setSymbols] = useState([])
  const [ticker, setTicker] = useState(null)
  const [tickers, setTickers] = useState([])
  const [spotTickerData, setSpotTickerData] = useState([])
  const [orderbook, setOrderbook] = useState({ bids: [], asks: [] })
  const [recentTrades, setRecentTrades] = useState([])
  const [obView, setObView] = useState('book') // 'book' | 'trades'
  const [klines, setKlines] = useState([])
  const [interval, setInterval_] = useState('1h')
  const [orderSide, setOrderSide] = useState('buy')
  const [orderType, setOrderType] = useState('Market')
  const [positions, setPositions] = useState([])
  const [orders, setOrders] = useState([])
  const [balances, setBalances] = useState(null)
  const [bottomTab, setBottomTab] = useState('positions')
  const [leverage, setLeverage] = useState(1)
  const [priceInput, setPriceInput] = useState('')
  const [sizeInput, setSizeInput] = useState('')
  const [reduceOnly, setReduceOnly] = useState(false)
  const [tpIoc, setTpIoc] = useState(false)
  const [hideSmallBalances, setHideSmallBalances] = useState(false)
  const [sizePercent, setSizePercentState] = useState(0)

  const chartContainerRef = useRef(null)
  const chartInstanceRef = useRef(null)
  const candleSeriesRef = useRef(null)
  const volumeSeriesRef = useRef(null)

  // --- Data fetching ---
  const fetchTickers = useCallback(async () => {
    try {
      const data = await perpsTickers()
      const arr = Array.isArray(data) ? data : []
      setTickers(arr)
      const t = arr.find(t => t.symbol === selectedSymbol)
      if (t) setTicker(t)
    } catch {}
  }, [selectedSymbol])

  const fetchSymbols = useCallback(async () => {
    try {
      const data = await perpsSymbols()
      setSymbols(Array.isArray(data) ? data : [])
    } catch {}
  }, [])

  const fetchOrderbook = useCallback(async () => {
    try {
      const data = await perpsOrderbook(selectedSymbol, 15)
      setOrderbook({
        bids: Array.isArray(data?.bids) ? data.bids : [],
        asks: Array.isArray(data?.asks) ? data.asks : [],
      })
    } catch {}
  }, [selectedSymbol])

  const fetchRecentTrades = useCallback(async () => {
    try {
      const data = await perpsRecentTrades(selectedSymbol, 30)
      setRecentTrades(Array.isArray(data) ? data : [])
    } catch {}
  }, [selectedSymbol])

  const fetchKlines = useCallback(async () => {
    try {
      const data = await perpsKlines(selectedSymbol, interval, 100)
      setKlines(Array.isArray(data) ? data : [])
    } catch {}
  }, [selectedSymbol, interval])

  const fetchAccount = useCallback(async () => {
    if (!wallet) return
    try {
      const [rawP, rawO, rawB] = await Promise.all([
        perpsPositions(wallet).catch(() => null),
        perpsOrders(wallet).catch(() => null),
        perpsBalances(wallet).catch(() => null),
      ])
      const p = rawP?.positions ?? (Array.isArray(rawP) ? rawP : [])
      setPositions(p)
      const o = rawO?.orders ?? (Array.isArray(rawO) ? rawO : [])
      setOrders(o)
      const bal = rawB?.balances?.[0] ?? rawB
      setBalances(bal)
    } catch {}
  }, [wallet])

  const fetchSpotTickers = useCallback(async () => {
    try {
      const data = await spotTickers()
      const arr = Array.isArray(data) ? data : []
      setSpotTickerData(arr)
    } catch {}
  }, [])

  // On mount
  useEffect(() => {
    fetchSymbols()
    fetchTickers()
    fetchSpotTickers()
  }, [fetchSymbols, fetchTickers, fetchSpotTickers])

  // On symbol/interval change
  useEffect(() => {
    fetchOrderbook()
    fetchRecentTrades()
    fetchKlines()
    fetchTickers()
  }, [selectedSymbol, interval, fetchOrderbook, fetchRecentTrades, fetchKlines, fetchTickers])

  // Orderbook refresh 2s
  useEffect(() => {
    const id = setInterval(fetchOrderbook, 2000)
    return () => clearInterval(id)
  }, [fetchOrderbook])

  // Tickers refresh 5s
  useEffect(() => {
    const id = setInterval(() => { fetchTickers(); fetchSpotTickers() }, 5000)
    return () => clearInterval(id)
  }, [fetchTickers, fetchSpotTickers])

  // Account refresh 10s
  useEffect(() => {
    fetchAccount()
    if (!wallet) return
    const id = setInterval(fetchAccount, 10000)
    return () => clearInterval(id)
  }, [wallet, fetchAccount])

  // Update ticker when tickers or symbol changes
  useEffect(() => {
    const t = tickers.find(t => t.symbol === selectedSymbol)
    if (t) setTicker(t)
  }, [tickers, selectedSymbol])

  // --- Funding countdown ---
  const [fundingCountdown, setFundingCountdown] = useState('')
  useEffect(() => {
    if (!ticker?.nextFundingTime) return
    const update = () => {
      const diff = Math.max(0, new Date(ticker.nextFundingTime).getTime() - Date.now())
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setFundingCountdown(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [ticker?.nextFundingTime])

  // --- Chart: create instance on mount ---
  useEffect(() => {
    const container = chartContainerRef.current
    if (!container) return

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { color: '#121212' },
        textColor: '#A3A3A3',
        fontFamily: 'monospace',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: { mode: 0 },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
    })

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#18B36B',
      downColor: '#F24237',
      borderUpColor: '#18B36B',
      borderDownColor: '#F24237',
      wickUpColor: '#18B36B',
      wickDownColor: '#F24237',
    })

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    })

    chartInstanceRef.current = chart
    candleSeriesRef.current = candleSeries
    volumeSeriesRef.current = volumeSeries

    return () => {
      chart.remove()
      chartInstanceRef.current = null
      candleSeriesRef.current = null
      volumeSeriesRef.current = null
    }
  }, [])

  // --- Chart: update data when klines change ---
  useEffect(() => {
    const candleSeries = candleSeriesRef.current
    const volumeSeries = volumeSeriesRef.current
    if (!candleSeries || !volumeSeries || klines.length === 0) return

    // Deduplicate and sort by time — API can return duplicates or unsorted data
    const seen = new Set()
    const sorted = [...klines]
      .map(k => ({ ...k, _ts: Math.floor(new Date(k.t).getTime() / 1000) }))
      .sort((a, b) => a._ts - b._ts)
      .filter(k => { if (seen.has(k._ts)) return false; seen.add(k._ts); return true })

    const candleData = sorted.map(k => ({
      time: k._ts,
      open: parseFloat(k.o),
      high: parseFloat(k.h),
      low: parseFloat(k.l),
      close: parseFloat(k.c),
    }))

    const volumeData = sorted.map(k => {
      const o = parseFloat(k.o), c = parseFloat(k.c)
      return {
        time: k._ts,
        value: parseFloat(k.v ?? k.volume ?? 0),
        color: c >= o ? 'rgba(24,179,107,0.25)' : 'rgba(242,66,55,0.25)',
      }
    })

    try {
      candleSeries.setData(candleData)
      volumeSeries.setData(volumeData)
    } catch (e) {
      console.warn('Chart setData error:', e.message)
    }

    if (chartInstanceRef.current) {
      chartInstanceRef.current.timeScale().fitContent()
    }
  }, [klines])

  // --- Derived values ---
  const symInfo = useMemo(() => symbols.find(s => s.symbol === selectedSymbol), [symbols, selectedSymbol])
  const priceDec = symInfo?.pricePrecision ?? 2

  const marginRequired = useMemo(() => {
    const s = parseFloat(sizeInput) || 0
    const p = orderType === 'Market' ? parseFloat(ticker?.lastPx) : parseFloat(priceInput) || 0
    if (!s || !p || !leverage) return '- USDC'
    return fmtUsd(s * p / leverage)
  }, [sizeInput, priceInput, ticker, orderType, leverage])

  const orderValue = useMemo(() => {
    const s = parseFloat(sizeInput) || 0
    const p = orderType === 'Market' ? parseFloat(ticker?.lastPx) : parseFloat(priceInput) || 0
    if (!s || !p) return '- USDC'
    return fmtUsd(s * p)
  }, [sizeInput, priceInput, ticker, orderType])

  const availBal = useMemo(() => {
    if (!wallet || !balances) return '0 USDC'
    const eq = balances.total ?? balances.totalEquity ?? balances.availableBalance ?? balances.balance
    return eq != null ? fmtUsd(eq) : '0 USDC'
  }, [wallet, balances])

  // --- Orderbook computed ---
  const sortedAsks = useMemo(() => {
    const a = [...orderbook.asks].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])).slice(0, 15)
    let cum = 0
    return a.map(r => { cum += parseFloat(r[1]); return { price: r[0], size: r[1], total: cum } })
  }, [orderbook.asks])

  const sortedBids = useMemo(() => {
    const b = [...orderbook.bids].sort((a, b) => parseFloat(b[0]) - parseFloat(a[0])).slice(0, 15)
    let cum = 0
    return b.map(r => { cum += parseFloat(r[1]); return { price: r[0], size: r[1], total: cum } })
  }, [orderbook.bids])

  const maxAskCum = useMemo(() => sortedAsks.length ? sortedAsks[sortedAsks.length - 1].total : 1, [sortedAsks])
  const maxBidCum = useMemo(() => sortedBids.length ? sortedBids[sortedBids.length - 1].total : 1, [sortedBids])

  const spread = useMemo(() => {
    if (!sortedAsks.length || !sortedBids.length) return null
    return parseFloat(sortedAsks[0].price) - parseFloat(sortedBids[0].price)
  }, [sortedAsks, sortedBids])

  const spreadPct = useMemo(() => {
    if (!spread || !sortedAsks.length) return null
    const mid = (parseFloat(sortedAsks[0].price) + parseFloat(sortedBids[0].price)) / 2
    return mid ? ((spread / mid) * 100).toFixed(3) + '%' : null
  }, [spread, sortedAsks, sortedBids])

  // --- Helpers ---
  const selectSymbol = (sym) => {
    setSelectedSymbol(sym)
    const exists = openTabs.find(t => t.symbol === sym)
    if (!exists) {
      setOpenTabs(prev => [...prev, { symbol: sym, type: marketMode === 'perps' ? 'Perp' : 'Spot' }])
    }
  }

  const closeTab = (sym, e) => {
    e.stopPropagation()
    setOpenTabs(prev => prev.filter(t => t.symbol !== sym))
    if (selectedSymbol === sym) {
      const remaining = openTabs.filter(t => t.symbol !== sym)
      if (remaining.length) setSelectedSymbol(remaining[0].symbol)
    }
  }

  const setSizePercent = (pct) => {
    setSizePercentState(pct)
    if (!wallet || !balances || !ticker?.lastPx) return
    const eq = parseFloat(balances.total ?? balances.totalEquity ?? balances.availableBalance ?? balances.balance ?? 0)
    const price = parseFloat(ticker.lastPx)
    if (!eq || !price) return
    const maxSize = (eq * leverage * pct) / (100 * price)
    setSizeInput(maxSize.toFixed(4))
  }

  const changePct = ticker?.changePct != null ? parseFloat(ticker.changePct) : null
  const change24hAbs = ticker?.change24h != null ? parseFloat(ticker.change24h) : (ticker?.lastPx && ticker?.prevDayPx ? parseFloat(ticker.lastPx) - parseFloat(ticker.prevDayPx) : null)

  return (
    <div className="larp-trade">
      {/* ====== LEFT COLUMN ====== */}
      <div className="larp-trade-left">
       <div className="larp-trade-top">

        {/* 1. Market tabs strip with $ and % icon buttons */}
        <div className="larp-market-strip">
          <button className="larp-strip-icon-btn" title="Currency">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </button>
          <button className="larp-strip-icon-btn" title="Percent">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
          </button>
          <div className="larp-strip-divider" />

          <div className="larp-spot-scroll">
            {spotTickerData.map((st, i) => {
              const rawSym = st.symbol || st.pair || ''
              // Clean: vBTC_vUSDC → BTC/USDC, WSOSO_vUSDC → SOSO/USDC
              const sym = rawSym.replace(/^[vW]+/, '').replace(/_v?/g, '/').replace(/^WSOSO/, 'SOSO')
              const chg = st.changePct != null ? parseFloat(st.changePct) : (st.change24hPercent != null ? parseFloat(st.change24hPercent) : null)
              return (
                <span key={i} className="larp-spot-item" onClick={() => {}}>
                  <span className="larp-spot-sym">{sym}</span>
                  <span className="larp-spot-type">Spot</span>
                  {chg != null && (
                    <span className={`larp-spot-chg ${chg >= 0 ? 'larp-green' : 'larp-red'}`}>
                      {fmtPct(chg)}
                    </span>
                  )}
                </span>
              )
            })}
          </div>
        </div>

        {/* 2. Pair Info Bar */}
        <div className="larp-trade-statsbar">
          <div className="larp-pair-info-left">
            <span className="larp-pair-star" title="Favorite">&#9734;</span>
            <span className="larp-pair-icon" style={{ background: '#F7931A', width: 20, height: 20, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>B</span>
            <span className="larp-stats-sym">{selectedSymbol}</span>
            <span className="larp-pair-search" title="Search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A3A3A3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <span className="larp-pair-caret">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A3A3A3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </span>
            <span className="larp-leverage-badge">{leverage > 1 ? leverage : 25}x</span>
          </div>
          <div className="larp-pair-info-right">
            <div className="larp-stat-item">
              <span className="larp-stat-label">Mark Price</span>
              <span className="larp-stat-value">{fmtNum(ticker?.markPrice, priceDec)}</span>
            </div>
            <div className="larp-stat-item">
              <span className="larp-stat-label">Index Price</span>
              <span className="larp-stat-value">{fmtNum(ticker?.indexPrice, priceDec)}</span>
            </div>
            <div className="larp-stat-item">
              <span className="larp-stat-label">24H Change</span>
              <span className={`larp-stat-value ${changePct != null && changePct >= 0 ? 'larp-green' : 'larp-red'}`}>
                {change24hAbs != null ? fmtNum(change24hAbs, priceDec) + ' / ' : ''}{fmtPct(ticker?.changePct)}
              </span>
            </div>
            <div className="larp-stat-item">
              <span className="larp-stat-label">24h Volume</span>
              <span className="larp-stat-value">{fmtUsd(ticker?.quoteVolume)}</span>
            </div>
            <div className="larp-stat-item">
              <span className="larp-stat-label">Open Interest</span>
              <span className="larp-stat-value">{fmtUsd(ticker?.openInterest)}</span>
            </div>
            <div className="larp-stat-item">
              <span className="larp-stat-label">Funding / Countdown</span>
              <span className="larp-stat-value">
                {ticker?.fundingRate != null ? fmtPct(parseFloat(ticker.fundingRate) * 100) : '-'}
                {fundingCountdown ? ` / ${fundingCountdown}` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Middle: chart + orderbook */}
        <div className="larp-trade-middle">

          {/* CHART */}
          <div className="larp-chart-area">
            <div className="larp-chart-toolbar">
              <span className="larp-chart-toolbar-label">Time</span>
              {TIMEFRAMES.map(tf => (
                <button
                  key={tf}
                  className={`larp-chart-tf${interval === tf ? ' active' : ''}`}
                  onClick={() => setInterval_(tf)}
                >
                  {tf}
                </button>
              ))}
              <div className="larp-chart-toolbar-sep" />
              <button className="larp-chart-tf">Tools</button>
              <div className="larp-chart-toolbar-sep" />
              <button className="larp-chart-tf" style={{ color: '#a3a3a3', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontStyle: 'italic', fontWeight: 600, fontSize: 11 }}>fx</span>
                Indicators
              </button>
            </div>
            <div className="larp-chart-canvas" ref={chartContainerRef} />
          </div>

          {/* ORDER BOOK */}
          <div className="larp-orderbook">
            <div className="larp-ob-tabs">
              <button className={`larp-ob-tab${obView === 'book' ? ' active' : ''}`} onClick={() => setObView('book')}>Order Book</button>
              <button className={`larp-ob-tab${obView === 'trades' ? ' active' : ''}`} onClick={() => setObView('trades')}>Market Trades</button>
            </div>

            {obView === 'book' ? (
              <>
                <div className="larp-ob-controls">
                  <div className="larp-ob-precision">
                    <span className="larp-ob-precision-val">1 &#9662;</span>
                  </div>
                  <div className="larp-ob-pair-toggle">
                    <button className="larp-ob-pair-btn active">{selectedSymbol.split('-')[0]} &#9662;</button>
                    <button className="larp-ob-pair-btn">All &#9662;</button>
                  </div>
                  <div className="larp-ob-precision">
                    <span className="larp-ob-precision-val">1 &#9662;</span>
                  </div>
                </div>
                <div className="larp-orderbook-header">
                  <span>Price(USDC)</span><span>Amount({selectedSymbol.split('-')[0]})</span><span>Total({selectedSymbol.split('-')[0]})</span>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>
                  {[...sortedAsks].reverse().map((r, i) => (
                    <div className="larp-ob-row ask" key={'a' + i} onClick={() => setPriceInput(r.price)}>
                      <div className="larp-ob-bg" style={{ width: (r.total / maxAskCum * 100) + '%', background: '#F24237' }} />
                      <span className="price">{fmtNum(r.price, priceDec)}</span>
                      <span className="size">{fmtNum(r.size, 4)}</span>
                      <span className="total">{fmtNum(r.total, 4)}</span>
                    </div>
                  ))}
                </div>

                <div className="larp-ob-spread">
                  {spread != null ? (
                    <>
                      <span style={{ color: '#18B36B', fontWeight: 600 }}>
                        {fmtNum(sortedBids[0]?.price ?? 0, priceDec)}
                      </span>
                      <span style={{ color: '#a3a3a3', fontSize: 11, marginLeft: 8 }}>
                        Spread
                      </span>
                      <span style={{ color: '#a3a3a3', fontSize: 11, marginLeft: 8 }}>
                        {spreadPct}
                      </span>
                    </>
                  ) : '-'}
                </div>

                <div style={{ flex: 1, overflow: 'hidden' }}>
                  {sortedBids.map((r, i) => (
                    <div className="larp-ob-row bid" key={'b' + i} onClick={() => setPriceInput(r.price)}>
                      <div className="larp-ob-bg" style={{ width: (r.total / maxBidCum * 100) + '%', background: '#18B36B' }} />
                      <span className="price">{fmtNum(r.price, priceDec)}</span>
                      <span className="size">{fmtNum(r.size, 4)}</span>
                      <span className="total">{fmtNum(r.total, 4)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="larp-orderbook-header">
                  <span>Price</span><span>Size</span><span>Time</span>
                </div>
                <div style={{ flex: 1, overflow: 'auto' }}>
                  {recentTrades.map((t, i) => {
                    const side = t.S ?? t.side
                    const isBuy = side === 'BUY' || side === 'buy'
                    return (
                      <div className={`larp-ob-row ${isBuy ? 'bid' : 'ask'}`} key={i}>
                        <span className="price">{fmtNum(t.p ?? t.price, priceDec)}</span>
                        <span className="size">{fmtNum(t.q ?? t.qty ?? t.size ?? t.amount, 4)}</span>
                        <span className="total" style={{ fontSize: 10 }}>
                          {(t.T ?? t.time) ? new Date(t.T ?? t.time).toLocaleTimeString() : '-'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
       </div>

        {/* 4. Bottom panel */}
        <div className="larp-bottom-panel">
          <div className="larp-bottom-tabs">
            {BOTTOM_TABS.map(tab => (
              <button
                key={tab.key}
                className={`larp-bottom-tab${bottomTab === tab.key ? ' active' : ''}`}
                onClick={() => setBottomTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
            <label className="larp-hide-small-toggle">
              <input
                type="checkbox"
                checked={hideSmallBalances}
                onChange={e => setHideSmallBalances(e.target.checked)}
              />
              <span>Hide Small Balances</span>
            </label>
          </div>

          <div className="larp-bottom-content">
            {bottomTab === 'positions' && (
              wallet ? (
                <table className="larp-table">
                  <thead>
                    <tr>
                      <th>Symbol</th><th>Side</th><th>Size</th><th>Entry Price</th>
                      <th>Mark Price</th><th>Unrealized PnL</th><th>Margin</th><th>Leverage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((p, i) => {
                      const side = p.positionSide ?? p.side
                      const isLong = side === 'LONG' || side === 'Long' || side === 'BUY' || side === 'BOTH'
                      const pnl = parseFloat(p.unrealizedPnl ?? p.realizedPnL ?? p.pnl ?? 0)
                      return (
                        <tr key={i}>
                          <td className="larp-port-coin-blue">{p.symbol}</td>
                          <td className={isLong ? 'larp-green' : 'larp-red'}>{side}</td>
                          <td>{fmtNum(p.size ?? p.qty, 4)}</td>
                          <td>{fmtNum(p.avgEntryPrice ?? p.entryPrice, priceDec)}</td>
                          <td>{fmtNum(p.markPrice, priceDec)}</td>
                          <td className={pnl >= 0 ? 'larp-green' : 'larp-red'}>{fmtUsd(pnl)}</td>
                          <td>{fmtUsd(p.initialMargin ?? p.margin)}</td>
                          <td>{p.leverage ?? '-'}x</td>
                        </tr>
                      )
                    })}
                    {positions.length === 0 && (
                      <tr><td colSpan={8} className="larp-muted" style={{ textAlign: 'center' }}>No open positions</td></tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <div className="larp-no-wallet">
                  <button className="larp-connect-wallet-btn-bottom">Connect Wallet</button>
                </div>
              )
            )}

            {bottomTab === 'orders' && (
              wallet ? (
                <table className="larp-table">
                  <thead>
                    <tr>
                      <th>Symbol</th><th>Side</th><th>Type</th><th>Price</th><th>Size</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o, i) => (
                      <tr key={i}>
                        <td className="larp-port-coin-blue">{o.symbol}</td>
                        <td className={o.side === 'BUY' || o.side === 'Long' ? 'larp-green' : 'larp-red'}>{o.side}</td>
                        <td>{o.type ?? o.orderType}</td>
                        <td>{fmtNum(o.price, priceDec)}</td>
                        <td>{fmtNum(o.origQty ?? o.size ?? o.qty, 4)}</td>
                        <td>{o.status}</td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr><td colSpan={6} className="larp-muted" style={{ textAlign: 'center' }}>No open orders</td></tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <div className="larp-no-wallet">
                  <button className="larp-connect-wallet-btn-bottom">Connect Wallet</button>
                </div>
              )
            )}

            {bottomTab === 'balances' && (
              wallet ? (
                <table className="larp-table">
                  <thead>
                    <tr><th>Asset</th><th>Balance</th><th>Available</th><th>In Order</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="larp-port-coin-blue">{balances?.coin ?? 'USDC'}</td>
                      <td>{fmtUsd(balances?.total ?? balances?.balance ?? balances?.totalEquity)}</td>
                      <td>{fmtUsd(balances?.total ?? balances?.availableBalance)}</td>
                      <td>{fmtUsd(balances?.orderMargin ?? 0)}</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <div className="larp-no-wallet">
                  <button className="larp-connect-wallet-btn-bottom">Connect Wallet</button>
                </div>
              )
            )}

            {!['positions', 'orders', 'balances'].includes(bottomTab) && (
              <div className="larp-no-wallet">
                {wallet ? <span style={{ color: '#a3a3a3', fontSize: 13 }}>No data</span> : <button className="larp-connect-wallet-btn-bottom">Connect Wallet</button>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ====== RIGHT COLUMN: ORDER FORM ====== */}
      <div className="larp-order-form">
        {/* Order type tabs */}
        <div className="larp-order-type-tabs">
          <div className="larp-order-type-toggle">
            {['Market', 'Limit'].map(t => (
              <button
                key={t}
                className={`larp-order-type-pill${orderType === t ? ' active' : ''}`}
                onClick={() => setOrderType(t)}
              >{t}</button>
            ))}
            <button
              className={`larp-order-type-pill larp-order-type-advanced${orderType === 'Advanced' ? ' active' : ''}`}
              onClick={() => setOrderType('Advanced')}
            >Advanced <span style={{ fontSize: 10 }}>&#9662;</span></button>
          </div>
          <span className="larp-trade-guide-icon" title="Trade Guide">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A3A3A3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </span>
        </div>

        {/* Cross / Leverage dropdowns */}
        <div className="larp-cross-lev">
          <button className="larp-cross-dropdown">Cross <span style={{ fontSize: 10 }}>&#9662;</span></button>
          <button className="larp-cross-dropdown">{leverage}x <span style={{ fontSize: 10 }}>&#9662;</span></button>
        </div>

        {/* Buy/Sell toggle */}
        <div className="larp-order-side-row">
          <button
            className={`larp-side-btn buy${orderSide === 'buy' ? ' active' : ''}`}
            onClick={() => setOrderSide('buy')}
          >Buy / Long</button>
          <button
            className={`larp-side-btn sell${orderSide === 'sell' ? ' active' : ''}`}
            onClick={() => setOrderSide('sell')}
          >Sell / Short</button>
        </div>

        <div className="larp-order-body">
          {/* Current position */}
          <div className="larp-order-info-row">
            <span>Current Position</span>
            <span className="val">0.00</span>
          </div>

          {/* Available to trade */}
          <div className="larp-order-info-row">
            <span>Available to Trade</span>
            <span className="val">{wallet ? availBal : '-'}</span>
          </div>

          {/* Price input for Limit */}
          {(orderType === 'Limit' || orderType === 'Advanced') && (
            <div className="larp-input-group">
              <label className="larp-input-label">Price</label>
              <div className="larp-input-with-suffix">
                <input
                  type="number"
                  placeholder="0.00"
                  value={priceInput}
                  onChange={e => setPriceInput(e.target.value)}
                />
                <span className="larp-input-suffix">USDC</span>
              </div>
            </div>
          )}

          {/* Amount input */}
          <div className="larp-input-group">
            <label className="larp-input-label">Amount</label>
            <div className="larp-input-with-suffix">
              <input
                type="number"
                placeholder="0"
                value={sizeInput}
                onChange={e => setSizeInput(e.target.value)}
              />
              <span className="larp-input-suffix larp-input-suffix-dropdown">{selectedSymbol.split('-')[0]}</span>
            </div>
          </div>

          {/* Percentage buttons */}
          <div className="larp-pct-row">
            {[25, 50, 75, 100].map(p => (
              <button
                key={p}
                className={`larp-pct-btn${sizePercent === p ? ' active' : ''}`}
                onClick={() => setSizePercent(p)}
              >{p}%</button>
            ))}
          </div>

          {/* Checkboxes */}
          <div className="larp-checkbox-row">
            <label className="larp-toggle-label">
              <input type="checkbox" checked={reduceOnly} onChange={e => setReduceOnly(e.target.checked)} />
              <span>Reduce Only</span>
            </label>
            <label className="larp-toggle-label">
              <input type="checkbox" checked={tpIoc} onChange={e => setTpIoc(e.target.checked)} />
              <span>TP IOC</span>
            </label>
          </div>
          <label className="larp-toggle-label larp-tpsl-row">
            <input type="checkbox" />
            <span>Take-Profit / Stop Loss</span>
          </label>

          {/* Leverage */}
          <div className="larp-leverage-section">
            <div className="larp-leverage-header">
              <span>Leverage</span>
            </div>
            <div className="larp-leverage-slider-row">
              <input
                type="range"
                className="larp-leverage-range"
                min={1}
                max={50}
                value={leverage}
                onChange={e => setLeverage(Number(e.target.value))}
              />
              <span className="larp-leverage-val">{leverage}x</span>
            </div>
          </div>

          {/* Order info */}
          <div className="larp-order-info-row">
            <span>Order Value</span>
            <span className="val">{orderValue}</span>
          </div>
          <div className="larp-order-info-row">
            <span>Margin Required</span>
            <span className="val">{marginRequired}</span>
          </div>
          <div className="larp-order-info-row">
            <span>Liquidation Price</span>
            <span className="val">-</span>
          </div>
          <div className="larp-order-info-row">
            <span>Fee</span>
            <span className="val">-</span>
          </div>

          {/* Submit */}
          <button className={`larp-submit-btn ${wallet ? orderSide : 'no-wallet'}`}>
            {wallet
              ? (orderSide === 'buy' ? 'Buy / Long' : 'Sell / Short')
              : 'Connect Wallet'}
          </button>
        </div>

        {/* Futures overview */}
        <div className="larp-futures-overview">
          <div className="larp-futures-overview-title">Futures Overview</div>
          <div className="larp-order-info-row">
            <span>Cross Margin Ratio</span>
            <span className="val">-</span>
          </div>
          <div className="larp-order-info-row">
            <span>Equity</span>
            <span className="val">{wallet && balances ? fmtUsd(balances.total ?? balances.totalEquity ?? balances.balance ?? 0) : '-'}</span>
          </div>
          <div className="larp-order-info-row">
            <span>Maintenance Margin</span>
            <span className="val">-</span>
          </div>
        </div>

        {/* Announcement */}
        <div className="larp-order-announcement">
          <div className="larp-futures-overview-title">Announcement</div>
          <div className="larp-ann-item">
            <a href="#" className="larp-ann-link">New Listing - Crushed Pepe</a>
            <span className="larp-ann-date">2025-03-15</span>
          </div>
          <div className="larp-ann-item">
            <a href="#" className="larp-ann-link">1.5M Mobile Users is live on SoDEX</a>
            <span className="larp-ann-date">2025-03-10</span>
          </div>
          <div className="larp-ann-item">
            <a href="#" className="larp-ann-link">SoDEX Mainnet Upgrade Completed</a>
            <span className="larp-ann-date">2025-03-05</span>
          </div>
        </div>

        {/* Deposit Funds */}
        <div className="larp-deposit-section">
          <button className="larp-deposit-btn">Deposit Funds</button>
        </div>
      </div>

      {/* Bottom scrolling ticker bar */}
      {tickers.length > 0 && (
        <div className="larp-ticker-bar">
          <div className="larp-ticker-track">
            {[...tickers, ...tickers].map((t, i) => {
              const chg = t?.changePct != null ? parseFloat(t.changePct) : null
              const sym = (t.symbol || '').replace('-USD', '')
              const price = t.lastPx != null ? parseFloat(t.lastPx) : null
              const priceFmt = price != null
                ? (price < 0.001 ? '$' + price.toPrecision(3) : price < 1 ? '$' + price.toFixed(4) : price >= 1000 ? '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '$' + price.toFixed(2))
                : '-'
              return (
                <span key={i} className="larp-ticker-item">
                  <span className="larp-ticker-sym">{sym}:</span>{' '}
                  <span className="larp-ticker-price">{priceFmt}</span>{' '}
                  {chg != null && (
                    <span className={chg >= 0 ? 'larp-ticker-up' : 'larp-ticker-down'}>
                      {(chg >= 0 ? '+' : '') + chg.toFixed(2) + '%'}
                    </span>
                  )}
                  <span className="larp-ticker-sep">|</span>
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Footer bar */}
      <div className="larp-footer-bar">
        <div className="larp-footer-left">
          <span className="larp-footer-link">BTC Overview</span>
          <a href="https://sodex.com/documentation" target="_blank" rel="noopener noreferrer" className="larp-footer-link">Docs</a>
          <span className="larp-footer-link larp-footer-icon" title="Settings">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </span>
          <span className="larp-footer-link">Support</span>
        </div>
        <div className="larp-footer-right">
          <a href="#" className="larp-footer-social" title="X/Twitter">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <a href="#" className="larp-footer-social" title="Discord">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
          </a>
          <a href="#" className="larp-footer-social" title="Telegram">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
          </a>
        </div>
      </div>
    </div>
  )
}
