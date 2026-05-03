import React, { useState, useEffect } from 'react'
import TopPairs from './TopPairs'
import TotalUsersChart from './TotalUsersChart'
import '../styles/MainnetPage.css'
import { supabase } from '../lib/supabaseClient'

export default function PlatformPage() {
  const [platformStats, setPlatformStats] = useState({
    totalUsers: 0,
    totalTraders: 0,
  })
  const [platformLoading, setPlatformLoading] = useState(true)

  // Custom filters state
  const [volThreshold, setVolThreshold] = useState<string>('1000')
  const [volOp, setVolOp] = useState('gt') // 'gt' or 'lt'
  const [pnlThreshold, setPnlThreshold] = useState<string>('100')
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
      // Fetch total traders from official leaderboard API
      const res = await fetch('/api/sodex-leaderboard?sort_by=volume&page_size=1&window_type=ALL_TIME')
      let totalCount = 0
      if (res.ok) {
        const json = await res.json()
        totalCount = json?.data?.total || 0
      }

      setPlatformStats({ totalUsers: totalCount, totalTraders: totalCount })

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

    // Calculator feature requires per-threshold filtering which is not supported by the current API.
    setCustomStats({ volCount: 0, pnlCount: 0, combinedCount: 0 })
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
          <span className="stat-value">{platformLoading ? '...' : formatPercent((platformStats.totalTraders / platformStats.totalUsers) * 100)}</span>
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

      <TotalUsersChart overrideTotalUsers={platformStats.totalUsers} />

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
