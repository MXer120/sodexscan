import React, { useState, useEffect } from 'react'
import TopPairs from './TopPairs'
import '../styles/MainnetPage.css'
import { supabase } from '../lib/supabaseClient'

export default function PlatformPage() {
  const [platformStats, setPlatformStats] = useState({
    totalUsers: 0,
    totalTraders: 0,
    activityRate: 0
  })
  const [platformLoading, setPlatformLoading] = useState(true)

  // Custom filters state
  const [volThreshold, setVolThreshold] = useState(1000)
  const [volOp, setVolOp] = useState('gt') // 'gt' or 'lt'
  const [pnlThreshold, setPnlThreshold] = useState(100)
  const [pnlOp, setPnlOp] = useState('gt') // 'gt', 'lt' or 'eq'
  const excludeSodexOwned = true

  const [customStats, setCustomStats] = useState({
    volCount: 0,
    pnlCount: 0,
    combinedCount: 0
  })
  const [customLoading, setCustomLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    document.title = 'Platform | CommunityScan SoDEX'
    loadPlatformData()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomCount()
    }, 500)
    return () => clearTimeout(timer)
  }, [volThreshold, volOp, pnlThreshold, pnlOp])

  const loadPlatformData = async () => {
    setPlatformLoading(true)

    try {
      // Fetch total "Traders" (matching leaderboard definition: non-zero activity)
      let query = supabase
        .from('leaderboard')
        .select('*', { count: 'exact', head: true })
        .or('cumulative_pnl.neq.0,cumulative_volume.gt.0')

      if (excludeSodexOwned) {
        query = query.or('is_sodex_owned.is.null,is_sodex_owned.eq.false')
      }

      const { count: tradersCount } = await query

      // Total users in DB
      let usersQuery = supabase.from('leaderboard').select('*', { count: 'exact', head: true })
      if (excludeSodexOwned) {
        usersQuery = usersQuery.or('is_sodex_owned.is.null,is_sodex_owned.eq.false')
      }
      const { count: usersCount } = await usersQuery

      const totalTraders = tradersCount || 0
      const totalUsers = usersCount || 0
      const activityRate = totalUsers > 0 ? (totalTraders / totalUsers) * 100 : 0

      setPlatformStats({
        totalUsers,
        totalTraders,
        activityRate
      })

      setPlatformLoading(false)
    } catch (err) {
      console.error('Failed to fetch platform data:', err)
      setPlatformLoading(false)
    }
  }

  const loadCustomCount = async () => {
    const v = volThreshold !== '' ? parseFloat(volThreshold) : NaN
    const p = pnlThreshold !== '' ? parseFloat(pnlThreshold) : NaN

    if (isNaN(v) && isNaN(p)) {
      setCustomStats({
        volCount: 0,
        pnlCount: 0,
        combinedCount: 0
      })
      return
    }

    setCustomLoading(true)
    try {
      const getOp = (op) => {
        if (op === 'gt') return 'gte'
        if (op === 'lt') return 'lte'
        return 'eq'
      }

      const vOpFunc = getOp(volOp)
      const pOpFunc = getOp(pnlOp)

      let volRes = { count: 0 }
      let pnlRes = { count: 0 }
      let combinedRes = { count: 0 }
      const promises = []

      // 1. Independent Volume Count
      if (!isNaN(v)) {
        let volQuery = supabase
          .from('leaderboard')
          .select('*', { count: 'exact', head: true })
        [vOpFunc]('cumulative_volume', v)

        if (excludeSodexOwned) {
          volQuery = volQuery.or('is_sodex_owned.is.null,is_sodex_owned.eq.false')
        }
        promises.push(volQuery.then(res => { volRes = res }))
      }

      // 2. Independent Profit Count
      if (!isNaN(p)) {
        let pnlQuery = supabase
          .from('leaderboard')
          .select('*', { count: 'exact', head: true })
        [pOpFunc]('cumulative_pnl', p)

        if (excludeSodexOwned) {
          pnlQuery = pnlQuery.or('is_sodex_owned.is.null,is_sodex_owned.eq.false')
        }
        promises.push(pnlQuery.then(res => { pnlRes = res }))
      }

      // 3. Combined Count
      let combinedQuery = supabase
        .from('leaderboard')
        .select('*', { count: 'exact', head: true })

      if (!isNaN(v)) combinedQuery = combinedQuery[vOpFunc]('cumulative_volume', v)
      if (!isNaN(p)) combinedQuery = combinedQuery[pOpFunc]('cumulative_pnl', p)

      if (excludeSodexOwned) {
        combinedQuery = combinedQuery.or('is_sodex_owned.is.null,is_sodex_owned.eq.false')
      }
      promises.push(combinedQuery.then(res => { combinedRes = res }))

      await Promise.all(promises)

      setCustomStats({
        volCount: volRes.count || 0,
        pnlCount: pnlRes.count || 0,
        combinedCount: combinedRes.count || 0
      })
    } catch (err) {
      console.error('Failed to fetch custom count:', err)
    } finally {
      setCustomLoading(false)
    }
  }

  const formatNumber = (num, prefix = '') => {
    if (num === null || num === undefined) return '0'
    const n = Math.abs(num)
    const sign = num < 0 ? '-' : ''

    if (n >= 1000000) {
      const formatted = (n / 1000000).toFixed(2).replace('.', ',')
      return `${sign}${prefix}${formatted}M`
    }
    if (n >= 1000) {
      const formatted = (n / 1000).toFixed(2).replace('.', ',')
      return `${sign}${prefix}${formatted}K`
    }
    return `${sign}${prefix}${num.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  const formatPercent = (num) => {
    return `${(num || 0).toFixed(1)}%`
  }

  return (
    <div className="mainnet-page dashboard">
      <h1 className="dashboard-title">Platform Stats</h1>


      <div className="stats-row">
        <div className="stat-item">
          <span className="stat-label">Total Users</span>
          <span className="stat-value">{platformLoading ? '...' : formatNumber(platformStats.totalUsers)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Active Traders</span>
          <span className="stat-value">{platformLoading ? '...' : formatNumber(platformStats.totalTraders)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Activity Rate</span>
          <span className="stat-value">{platformLoading ? '...' : formatPercent(platformStats.activityRate)}</span>
        </div>

        <button
          className="calculator-toggle-btn"
          onClick={() => setIsModalOpen(true)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <line x1="8" y1="6" x2="16" y2="6" />
            <line x1="8" y1="10" x2="16" y2="10" />
            <line x1="8" y1="14" x2="16" y2="14" />
            <line x1="8" y1="18" x2="16" y2="18" />
          </svg>
          Details / Calculator
        </button>
      </div>

      {isModalOpen && (
        <div className="platform-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="platform-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Platform Calculator</h2>
              <button className="close-modal-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>

            <div className="platform-custom-filters-modal">
              <div className="calculator-layout">
                <div className="filters-section">
                  <div className="filter-group">
                    <span className="filter-label">Volume ($)</span>
                    <div className="filter-row">
                      <div className="filter-inputs">
                        <button
                          className={`op-btn ${volOp === 'gt' ? 'active' : ''}`}
                          onClick={() => setVolOp('gt')}
                        >
                          &gt;
                        </button>
                        <button
                          className={`op-btn ${volOp === 'eq' ? 'active' : ''}`}
                          onClick={() => setVolOp('eq')}
                        >
                          =
                        </button>
                        <button
                          className={`op-btn ${volOp === 'lt' ? 'active' : ''}`}
                          onClick={() => setVolOp('lt')}
                        >
                          &lt;
                        </button>
                        <input
                          type="number"
                          value={volThreshold}
                          onChange={(e) => setVolThreshold(e.target.value)}
                          className="filter-input"
                          placeholder="Volume"
                        />
                      </div>
                      <div className="mini-stat-item">
                        <span className="mini-label">MATCH:</span>
                        <span className="mini-value">{customLoading ? '...' : formatNumber(customStats.volCount)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="filter-group">
                    <span className="filter-label">Profit ($)</span>
                    <div className="filter-row">
                      <div className="filter-inputs">
                        <button
                          className={`op-btn ${pnlOp === 'gt' ? 'active' : ''}`}
                          onClick={() => setPnlOp('gt')}
                        >
                          &gt;
                        </button>
                        <button
                          className={`op-btn ${pnlOp === 'eq' ? 'active' : ''}`}
                          onClick={() => setPnlOp('eq')}
                        >
                          =
                        </button>
                        <button
                          className={`op-btn ${pnlOp === 'lt' ? 'active' : ''}`}
                          onClick={() => setPnlOp('lt')}
                        >
                          &lt;
                        </button>
                        <input
                          type="number"
                          value={pnlThreshold}
                          onChange={(e) => setPnlThreshold(e.target.value)}
                          className="filter-input"
                          placeholder="Profit"
                        />
                      </div>
                      <div className="mini-stat-item">
                        <span className="mini-label">MATCH:</span>
                        <span className="mini-value">{customLoading ? '...' : formatNumber(customStats.pnlCount)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="combined-result-section">
                  <span className="combined-label">MATCHING BOTH</span>
                  <span className="combined-value">{customLoading ? '...' : formatNumber(customStats.combinedCount)}</span>
                </div>
              </div>

              <div className="modal-footer">
                <p className="modal-note">Results are filtered based on cumulative performance and exclude SoDEX-owned wallets.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <TopPairs />
    </div>
  )
}
