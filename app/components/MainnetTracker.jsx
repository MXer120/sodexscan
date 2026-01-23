import React, { useState, useEffect } from 'react'
import ChartCard from './ChartCard'
import { TimeSelector } from './ui/TimeSelector'
import { getSodexIdFromWallet } from '../lib/accountResolver'
import { globalCache } from '../lib/globalCache'

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
          opacity: 0,
          transition: 'opacity 0.2s',
          display: 'inline-flex',
          alignItems: 'center'
        }}
      >
        {copied ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        )}
      </button>
      <style>{`
        .copyable-address:hover .copy-btn { opacity: 1 !important; }
        .copy-btn:hover svg { stroke: #4ade80; }
      `}</style>
    </span>
  )
}

export default function MainnetTracker({ walletAddress, accountId: propAccountId }) {
  const [accountId, setAccountId] = useState(propAccountId || null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Overview')
  const [manualIdInput, setManualIdInput] = useState('')
  const [notFound, setNotFound] = useState(false)

  // Using global cache that persists across component mounts (navigation)

  // Data states
  const [accountDetails, setAccountDetails] = useState(null)
  const [spotBalances, setSpotBalances] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [pnlHistory, setPnlHistory] = useState([])
  const [positions, setPositions] = useState([])
  const [positionHistory, setPositionHistory] = useState([])
  const [totalAssets, setTotalAssets] = useState(0)

  // Pagination
  const [withdrawalsPage, setWithdrawalsPage] = useState(1)
  const [positionsPage, setPositionsPage] = useState(1)
  const pageSize = 10

  // Sorting for withdrawals table
  const [withdrawSortField, setWithdrawSortField] = useState('date')
  const [withdrawSortDir, setWithdrawSortDir] = useState('desc') // desc first = newest / largest

  const handleWithdrawSort = (field) => {
    setWithdrawalsPage(1)
    setWithdrawSortDir(prevDir =>
      withdrawSortField === field && prevDir === 'desc' ? 'asc' : 'desc'
    )
    setWithdrawSortField(field)
  }

  // When wallet address changes, lookup account ID from Supabase
  useEffect(() => {
    if (walletAddress && !propAccountId) {
      setLoading(true)
      setNotFound(false)
      setAccountId(null)

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
    }
  }, [walletAddress, propAccountId])

  // Fetch all data when accountId is set
  useEffect(() => {
    if (accountId) {
      fetchAllData()
    }
  }, [accountId])


  const handleManualIdSearch = () => {
    const id = manualIdInput.trim()
    if (id && !isNaN(parseInt(id))) {
      setAccountId(id)
      setNotFound(false)
    }
  }

  const fetchAllData = async () => {
    if (!accountId) return

    // Check global cache first
    const cached = globalCache.getAccountData(accountId)
    if (cached) {
      // Use cached data
      setAccountDetails(cached.accountDetails)
      setSpotBalances(cached.spotBalances)
      setWithdrawals(cached.withdrawals)
      setPnlHistory(cached.pnlHistory)
      setPositionHistory(cached.positionHistory)
      setPositions(cached.positions)
      setTotalAssets(cached.totalAssets)
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      // Fetch all endpoints in parallel
      const [detailsRes, balanceRes, withdrawalsRes, pnlRes, posHistoryRes] = await Promise.all([
        fetch(`https://mainnet-gw.sodex.dev/futures/fapi/user/v1/public/account/details?accountId=${accountId}`),
        fetch(`https://mainnet-gw.sodex.dev/pro/p/user/balance/list?accountId=${accountId}`),
        fetch('https://alpha-biz.sodex.dev/biz/mirror/account_flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            account: walletAddress || '',
            start: 0,
            limit: 100
          })
        }),
        fetch(`https://mainnet-data.sodex.dev/api/v1/perps/pnl/daily_stats?account_id=${accountId}`),
        fetch(`https://mainnet-data.sodex.dev/api/v1/perps/positions?account_id=${accountId}&limit=200`)
      ])

      // Parse responses
      const detailsData = await detailsRes.json()
      const balanceData = await balanceRes.json()
      const withdrawalsData = await withdrawalsRes.json()
      const pnlData = await pnlRes.json()
      const posHistoryData = await posHistoryRes.json()

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
            let cleanCoin = coin
              .replace(/^[vVwW]/, '') // Remove v/V/w/W prefix (vBTC -> BTC, WSOSO -> SOSO)
              .replace(/\..*$/, '')    // Remove suffix after dot (MAG7.ssi -> MAG7)

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

      // Process position history
      let processedPosHistory = []
      if (posHistoryData.code === 0 && posHistoryData.data) {
        processedPosHistory = posHistoryData.data
        setPositionHistory(processedPosHistory)
      }

      // Process PnL history - API returns cumulative PnL per day
      let processedPnlHistory = []
      if (pnlData.code === 0 && pnlData.data?.items) {
        const rawItems = pnlData.data.items.map(item => ({
          date: new Date(item.ts_ms).toISOString().split('T')[0],
          cumulative: parseFloat(item.pnl) // API returns cumulative PnL
        }))

        // Calculate daily PnL from cumulative (difference from previous day)
        const formattedPnl = rawItems.map((item, idx) => {
          const prevCumulative = idx > 0 ? rawItems[idx - 1].cumulative : 0
          return {
            date: item.date,
            cumulative: item.cumulative,
            daily: item.cumulative - prevCumulative
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
        pnlHistory: processedPnlHistory,
        positionHistory: processedPosHistory,
        positions: processedPositions,
        totalAssets: processedTotalAssets
      })

    } catch (error) {
      console.error('Failed to fetch mainnet data:', error)
    }

    setLoading(false)
  }

  const trimToMaxDecimals = (value, decimals = 2) => {
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

  const formatCoin = (amount, decimals) => {
    const val = parseFloat(amount) / Math.pow(10, decimals)
    return trimSmallWithSig3(val, 10)
  }

  const normalizeNetworkLabel = (raw) => {
    const s = (raw ?? '').toString().trim()
    if (!s) return '-'
    // Strip things like "_eth" or ".eth" -> "base_eth" -> "base"
    const underscoreSplit = s.split('_')[0]
    const dotSplit = underscoreSplit.split('.')[0]
    return dotSplit || s
  }

  const getWithdrawalTypeMeta = (w) => {
    const t = (w.type || '').toLowerCase()
    const isDeposit = t.includes('deposit')
    const isWithdraw = t.includes('withdraw')
    const typeLabel = isDeposit ? 'Deposit' : isWithdraw ? 'Withdraw' : (w.type || '')
    return { isDeposit, isWithdraw, typeLabel }
  }

  // Calculate total assets from wallet balance
  const walletBalance = accountDetails?.balances?.[0]?.walletBalance
    ? parseFloat(accountDetails.balances[0].walletBalance)
    : 0

  const totalUnrealizedPnl = positions.reduce((sum, pos) =>
    sum + parseFloat(pos.unrealizedProfit || 0), 0)

  // Universal colors
  const BULLISH_COLOR = '#4ade80' // Pukai blue
  const BEARISH_COLOR = '#f44336' // Red

  const tabs = ['Overview', 'Positions', 'History', 'Balances', 'Withdrawals', 'PnL']
  const tabIds = {
    'Overview': 'overview',
    'Positions': 'positions',
    'History': 'position-history',
    'Balances': 'balances',
    'Withdrawals': 'withdrawals',
    'PnL': 'pnl'
  }

  if (!accountId && !propAccountId) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
        <h3 style={{ color: '#fff', marginBottom: '8px' }}>Wallet Not Found</h3>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '24px' }}>
          This wallet address is not in the leaderboard. You can enter your Account ID directly:
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '16px' }}>
          <input
            type="text"
            value={manualIdInput}
            onChange={(e) => setManualIdInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleManualIdSearch()}
            placeholder="Enter Account ID (e.g. 1515)"
            style={{
              background: 'rgba(30, 30, 30, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#fff',
              fontSize: '14px',
              width: '200px'
            }}
          />
          <button
            onClick={handleManualIdSearch}
            style={{
              background: 'rgba(60, 200, 240, 0.15)',
              border: '1px solid rgba(60, 200, 240, 0.3)',
              color: '#4ade80',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Search
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading mainnet data...</div>
  }

  return (
    <div className="mainnet-tracker">
      {/* Top Stats Row */}
      <div className="metrics-grid" style={{ marginBottom: '24px' }}>
        <div className="metric-card">
          <span className="metric-label">Total Assets</span>
          <span className="metric-value">${formatNumber(totalAssets)}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Available Balance</span>
          <span className="metric-value">
            ${formatNumber(accountDetails?.availableMarginForTransfer || 0)}
          </span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Unrealized PnL</span>
          <span className="metric-value" style={{ color: totalUnrealizedPnl >= 0 ? BULLISH_COLOR : BEARISH_COLOR }}>
            {totalUnrealizedPnl >= 0 ? '+' : ''}${formatNumber(totalUnrealizedPnl)}
          </span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Open Positions</span>
          <span className="metric-value">{positions.length}</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
        <TimeSelector
          value={activeTab}
          onValueChange={setActiveTab}
          options={tabs}
        />
      </div>

      {/* Tab Content */}
      {activeTab === 'Overview' && (
        <div>
          {/* Account Summary */}
          <div style={{
            background: 'rgba(20, 20, 20, 0.4)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <h3 style={{ color: '#fff', marginBottom: '20px' }}>Account Summary</h3>
            <div className="metrics-grid">
              <div className="metric-card">
                <span className="metric-label">Total Assets</span>
                <span className="metric-value">${formatNumber(totalAssets)}</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Isolated Margin</span>
                <span className="metric-value">${formatNumber(accountDetails?.isolatedMargin || 0)}</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Cross Margin</span>
                <span className="metric-value">${formatNumber(accountDetails?.crossMargin || 0)}</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Available for Isolated</span>
                <span className="metric-value">${formatNumber(accountDetails?.availableMarginForIsolated || 0)}</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Available for Cross</span>
                <span className="metric-value">${formatNumber(accountDetails?.availableMarginForCross || 0)}</span>
              </div>
            </div>
          </div>

          {/* PnL Chart */}
          {pnlHistory.length > 0 && (
            <ChartCard
              title="PnL Performance"
              data={pnlHistory}
              series={[
                { key: 'cumulative', label: 'Cumulative PnL', type: 'line', cumulative: true },
                { key: 'daily', label: 'Daily PnL', type: 'bar' }
              ]}
              showCumulative={true}
              defaultSelected={['cumulative', 'daily']}
            />
          )}
        </div>
      )}

      {activeTab === 'Positions' && (
        <div style={{
          background: 'rgba(20, 20, 20, 0.4)',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <h3 style={{ color: '#fff', marginBottom: '20px' }}>Open Positions</h3>
          {positions.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>No open positions</p>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <th style={{ textAlign: 'left', padding: '12px 8px', color: '#888', fontSize: '12px' }}>Symbol</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', color: '#888', fontSize: '12px' }}>Side</th>
                      <th style={{ textAlign: 'right', padding: '12px 8px', color: '#888', fontSize: '12px' }}>Size</th>
                      <th style={{ textAlign: 'right', padding: '12px 8px', color: '#888', fontSize: '12px' }}>Entry Price</th>
                      <th style={{ textAlign: 'right', padding: '12px 8px', color: '#888', fontSize: '12px' }}>Liq. Price</th>
                      <th style={{ textAlign: 'right', padding: '12px 8px', color: '#888', fontSize: '12px' }}>Margin</th>
                      <th style={{ textAlign: 'right', padding: '12px 8px', color: '#888', fontSize: '12px' }}>Leverage</th>
                      <th style={{ textAlign: 'right', padding: '12px 8px', color: '#888', fontSize: '12px' }}>Unrealized PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions
                      .slice((positionsPage - 1) * pageSize, positionsPage * pageSize)
                      .map((pos, i) => {
                        const unrealizedPnl = parseFloat(pos.unrealizedProfit || 0)
                        const estLiqPrice = parseFloat(pos.liquidationPrice || 0)
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '12px 8px', color: '#fff', fontWeight: '500' }}>{pos.symbol}</td>
                            <td style={{
                              padding: '12px 8px',
                              color: pos.positionSide === 'LONG' ? BULLISH_COLOR : BEARISH_COLOR,
                              fontWeight: '600'
                            }}>
                              {pos.positionSide}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right', color: '#fff' }}>
                              {formatNumber(parseFloat(pos.positionSize), 6)}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right', color: '#fff' }}>
                              ${formatNumber(parseFloat(pos.entryPrice))}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right', color: BEARISH_COLOR }}>
                              ${formatNumber(estLiqPrice)}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right', color: '#fff' }}>
                              ${formatNumber(parseFloat(pos.isolatedMargin || 0))}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right', color: '#fff' }}>
                              {pos.leverage}x
                            </td>
                            <td style={{
                              padding: '12px 8px',
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

              {positions.length > pageSize && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '16px',
                  marginTop: '16px'
                }}>
                  <button
                    onClick={() => setPositionsPage(p => Math.max(1, p - 1))}
                    disabled={positionsPage === 1}
                    className="history-btn"
                  >
                    Prev
                  </button>
                  <span style={{ color: '#888', fontSize: '13px' }}>
                    Page {positionsPage} of {Math.ceil(positions.length / pageSize)}
                  </span>
                  <button
                    onClick={() => setPositionsPage(p => Math.min(Math.ceil(positions.length / pageSize), p + 1))}
                    disabled={positionsPage === Math.ceil(positions.length / pageSize)}
                    className="history-btn"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'Balances' && (
        <div style={{
          background: 'rgba(20, 20, 20, 0.4)',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <h3 style={{ color: '#fff', marginBottom: '20px' }}>Spot Balances</h3>

          {/* Futures Balances */}
          {accountDetails?.balances?.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <h4 style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '16px', fontSize: '14px' }}>Futures Account</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ textAlign: 'left', padding: '12px 8px', color: '#888', fontSize: '12px' }}>Coin</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px', color: '#888', fontSize: '12px' }}>Wallet Balance</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px', color: '#888', fontSize: '12px' }}>Available</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px', color: '#888', fontSize: '12px' }}>Frozen</th>
                  </tr>
                </thead>
                <tbody>
                  {accountDetails.balances.map((bal, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px 8px', color: '#fff', fontWeight: '500' }}>{bal.coin}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', color: '#fff' }}>
                        {formatNumber(parseFloat(bal.walletBalance || 0))}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', color: '#fff' }}>
                        {formatNumber(parseFloat(bal.availableBalance || 0))}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', color: BEARISH_COLOR }}>
                        {formatNumber(parseFloat(bal.openOrderMarginFrozen || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Spot Balances */}
          {spotBalances.length > 0 && (
            <div>
              <h4 style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '16px', fontSize: '14px' }}>Spot Account</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ textAlign: 'left', padding: '12px 8px', color: '#888', fontSize: '12px' }}>Coin</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px', color: '#888', fontSize: '12px' }}>Balance</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px', color: '#888', fontSize: '12px' }}>Available</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px', color: '#888', fontSize: '12px' }}>Frozen</th>
                  </tr>
                </thead>
                <tbody>
                  {spotBalances.map((bal, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px 8px', color: '#fff', fontWeight: '500' }}>{bal.coin}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', color: '#fff' }}>
                        {formatNumber(parseFloat(bal.balance || 0))}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', color: '#fff' }}>
                        {formatNumber(parseFloat(bal.available || 0))}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', color: BEARISH_COLOR }}>
                        {formatNumber(parseFloat(bal.frozen || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!accountDetails?.balances?.length && !spotBalances.length && (
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>No balances found</p>
          )}
        </div>
      )}

      {activeTab === 'History' && (
        <div>
          <h3 style={{ color: '#fff', marginBottom: '20px' }}>Position History</h3>
          {positionHistory.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>No position history found</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '18%' }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ textAlign: 'left', padding: '12px 8px', color: '#888', fontSize: '12px' }}>Symbol</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', color: '#888', fontSize: '12px' }}>Side</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px', color: '#888', fontSize: '12px' }}>Max Size</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px', color: '#888', fontSize: '12px' }}>Avg Entry</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px', color: '#888', fontSize: '12px' }}>Avg Close</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px', color: '#888', fontSize: '12px' }}>Realized PnL</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px', color: '#888', fontSize: '12px' }}>Fees</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px', color: '#888', fontSize: '12px' }}>Dates</th>
                  </tr>
                </thead>
                <tbody>
                  {positionHistory.map((pos, i) => {
                    const isLong = pos.position_side === 1
                    const sideLabel = isLong ? 'Long' : 'Short'
                    const sideColor = isLong ? BULLISH_COLOR : BEARISH_COLOR
                    const pnl = parseFloat(pos.realized_pnl) || 0
                    const pnlColor = pnl >= 0 ? BULLISH_COLOR : BEARISH_COLOR

                    return (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{
                          padding: '12px 8px',
                          color: '#fff',
                          fontSize: '13px',
                          fontWeight: '600',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          Symbol #{pos.symbol_id}
                        </td>
                        <td style={{
                          padding: '12px 8px',
                          color: sideColor,
                          fontSize: '13px',
                          fontWeight: '600',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {sideLabel}
                        </td>
                        <td style={{
                          padding: '12px 8px',
                          textAlign: 'right',
                          color: '#fff',
                          fontSize: '13px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {pos.max_size}
                        </td>
                        <td style={{
                          padding: '12px 8px',
                          textAlign: 'right',
                          color: '#fff',
                          fontSize: '13px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          ${formatNumber(parseFloat(pos.avg_entry_price) || 0)}
                        </td>
                        <td style={{
                          padding: '12px 8px',
                          textAlign: 'right',
                          color: '#fff',
                          fontSize: '13px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          ${formatNumber(parseFloat(pos.avg_close_price) || 0)}
                        </td>
                        <td style={{
                          padding: '12px 8px',
                          textAlign: 'right',
                          color: pnlColor,
                          fontSize: '13px',
                          fontWeight: '600',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {pnl >= 0 ? '+' : ''}${formatNumber(pnl)}
                        </td>
                        <td style={{
                          padding: '12px 8px',
                          textAlign: 'right',
                          color: BEARISH_COLOR,
                          fontSize: '13px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          ${formatNumber(parseFloat(pos.cum_trading_fee) || 0)}
                        </td>
                        <td style={{
                          padding: '12px 8px',
                          textAlign: 'right',
                          color: '#888',
                          fontSize: '11px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
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

      {activeTab === 'Withdrawals' && (
        <div>
          <h3 style={{ color: '#fff', marginBottom: '20px' }}>Withdrawal History</h3>
          {withdrawals.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>No withdrawals found</p>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '22%' }} />
                  </colgroup>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: '12px 8px',
                          color: '#888',
                          fontSize: '12px',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                        onClick={() => handleWithdrawSort('date')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Date / Time
                          {withdrawSortField === 'date' && (
                            <span style={{ fontSize: '10px' }}>
                              {withdrawSortDir === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        style={{
                          textAlign: 'right',
                          padding: '12px 8px',
                          color: '#888',
                          fontSize: '12px',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                        onClick={() => handleWithdrawSort('amount')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                          Amount
                          {withdrawSortField === 'amount' && (
                            <span style={{ fontSize: '10px' }}>
                              {withdrawSortDir === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: '12px 8px',
                          color: '#888',
                          fontSize: '12px',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                        onClick={() => handleWithdrawSort('type')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Type
                          {withdrawSortField === 'type' && (
                            <span style={{ fontSize: '10px' }}>
                              {withdrawSortDir === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: '12px 8px',
                          color: '#888',
                          fontSize: '12px',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                        onClick={() => handleWithdrawSort('network')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Network
                          {withdrawSortField === 'network' && (
                            <span style={{ fontSize: '10px' }}>
                              {withdrawSortDir === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        style={{
                          textAlign: 'right',
                          padding: '12px 8px',
                          color: '#888',
                          fontSize: '12px',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                        onClick={() => handleWithdrawSort('fee')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                          Fee
                          {withdrawSortField === 'fee' && (
                            <span style={{ fontSize: '10px' }}>
                              {withdrawSortDir === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: '12px 8px',
                          color: '#888',
                          fontSize: '12px',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                        onClick={() => handleWithdrawSort('status')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Status
                          {withdrawSortField === 'status' && (
                            <span style={{ fontSize: '10px' }}>
                              {withdrawSortDir === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', color: '#888', fontSize: '12px' }}>
                        Receiver
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...withdrawals]
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
                      .slice((withdrawalsPage - 1) * pageSize, withdrawalsPage * pageSize)
                      .map((w, i) => {
                        const amount = formatCoin(w.amount, w.decimals)
                        const fee = w.withdrawFee ? formatCoin(w.withdrawFee, w.decimals) : '-'
                        const coin = (w.coin || '').trim()
                        const t = (w.type || '').toLowerCase()
                        const isDeposit = t.includes('deposit')
                        const isWithdraw = t.includes('withdraw')
                        const typeLabel = isDeposit ? 'Deposit' : isWithdraw ? 'Withdraw' : (w.type || '')
                        const sign = isDeposit ? '+' : isWithdraw ? '-' : ''
                        const flowColor = isDeposit ? BULLISH_COLOR : isWithdraw ? BEARISH_COLOR : '#fff'
                        const networkLabel = normalizeNetworkLabel(
                          w.network || w.chain || w.chainName || w.networkName || w.chainId || ''
                        )
                        const amountWithCoin = `${sign}${amount}${coin ? ` ${coin}` : ''}`.trim()
                        const feeWithCoin = fee === '-' ? '-' : `${fee}${coin ? ` ${coin}` : ''}`.trim()
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{
                              padding: '12px 8px',
                              color: '#fff',
                              fontSize: '13px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {formatDateTime(w.stmp)}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              textAlign: 'right',
                              color: flowColor,
                              fontWeight: '600',
                              fontSize: '13px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {amountWithCoin}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              color: flowColor,
                              fontWeight: '600',
                              fontSize: '13px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {typeLabel}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              color: '#fff',
                              fontSize: '13px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {networkLabel}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              textAlign: 'right',
                              color: BEARISH_COLOR,
                              fontSize: '13px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {feeWithCoin}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              color: w.status === 'Success' ? BULLISH_COLOR : BEARISH_COLOR,
                              fontSize: '13px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {w.status}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '13px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              <CopyableAddress address={w.receiver} />
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>

              {withdrawals.length > pageSize && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '16px',
                  marginTop: '16px'
                }}>
                  <button
                    onClick={() => setWithdrawalsPage(p => Math.max(1, p - 1))}
                    disabled={withdrawalsPage === 1}
                    className="history-btn"
                  >
                    Prev
                  </button>
                  <span style={{ color: '#888', fontSize: '13px' }}>
                    Page {withdrawalsPage} of {Math.ceil(withdrawals.length / pageSize)}
                  </span>
                  <button
                    onClick={() => setWithdrawalsPage(p => Math.min(Math.ceil(withdrawals.length / pageSize), p + 1))}
                    disabled={withdrawalsPage === Math.ceil(withdrawals.length / pageSize)}
                    className="history-btn"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'PnL' && (
        <div style={{
          background: 'rgba(20, 20, 20, 0.4)',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <h3 style={{ color: '#fff', marginBottom: '20px' }}>PnL Performance</h3>
          {pnlHistory.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>No PnL history available</p>
          ) : (
            <ChartCard
              title=""
              data={pnlHistory}
              series={[
                { key: 'cumulative', label: 'Cumulative', type: 'line', cumulative: true },
                { key: 'daily', label: 'Daily PnL', type: 'bar' }
              ]}
              showCumulative={true}
              defaultSelected={['cumulative', 'daily']}
            />
          )}
        </div>
      )}
    </div>
  )
}
