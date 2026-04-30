'use client'
import React, { useState } from 'react'
import LarpAnnouncements from './LarpAnnouncements'

const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="8" cy="8" r="7" stroke="#A3A3A3" strokeWidth="1.2" />
    <path d="M8 7v4" stroke="#A3A3A3" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="8" cy="5" r="0.8" fill="#A3A3A3" />
  </svg>
)

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9BC4F4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'pointer', flexShrink: 0 }}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

const TABS = [
  { key: 'myPosition', label: 'My Position' },
  { key: 'overview', label: 'Overview' },
  { key: 'activity', label: 'Activity' },
  { key: 'depositors', label: 'Depositors' },
]

const TIME_RANGES = ['1W', '1M', '3M', '6M', '1Y', 'All']

export default function LarpVault({ wallet }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [chartTab, setChartTab] = useState('tvl')
  const [timeRange, setTimeRange] = useState('All')

  const contractAddr = '0x3687...0876'

  const handleCopy = () => {
    navigator.clipboard?.writeText('0x36870000000000000000000000000000000000000876')
  }

  return (
    <div className="larp-page-with-sidebar">
    <div className="larp-vault">
      <div className="larp-vault-container">
        {/* Header Section */}
        <div className="larp-vault-header">
          <div className="larp-vault-header-left">
            <h2 className="larp-vault-title">SoDEX Liquidity Provider (SLP)</h2>
            <div className="larp-vault-contract">
              <span className="larp-vault-contract-addr">{contractAddr}</span>
              <span onClick={handleCopy}><CopyIcon /></span>
            </div>
            <p className="larp-vault-desc">
              Community-owned vault deploying funds across market-making strategies,
              earning fees and supporting liquidations. Deposits earn pro-rata yield
              from trading fees, funding payments, and liquidation profits.
            </p>
          </div>
          <div className="larp-vault-header-right">
            <button className="larp-vault-connect-btn">
              Connect Wallet
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="larp-vault-stats-row">
          <div className="larp-vault-stat-item">
            <div className="larp-vault-stat-label">
              <span>TVL</span>
              <InfoIcon />
            </div>
            <div className="larp-vault-stat-value">115.97M sMAG7.ssi</div>
            <div className="larp-vault-stat-sub">$54.78M</div>
          </div>
          <div className="larp-vault-stat-divider" />
          <div className="larp-vault-stat-item">
            <div className="larp-vault-stat-label">
              <span>1Y Return</span>
              <InfoIcon />
            </div>
            <div className="larp-vault-stat-value">0.85%</div>
          </div>
          <div className="larp-vault-stat-divider" />
          <div className="larp-vault-stat-item">
            <div className="larp-vault-stat-label">
              <span>Net Asset Value</span>
              <InfoIcon />
            </div>
            <div className="larp-vault-stat-value">1.0085</div>
          </div>
          <div className="larp-vault-stat-divider" />
          <div className="larp-vault-stat-item">
            <div className="larp-vault-stat-label">
              <span>MAG7.ssi/USDC</span>
            </div>
            <div className="larp-vault-stat-value">0.472</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="larp-vault-tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`larp-vault-tab${activeTab === t.key ? ' active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="larp-vault-tab-content">
          {activeTab === 'myPosition' && (
            <div className="larp-vault-empty">
              {wallet ? (
                <span>No vault position found</span>
              ) : (
                <button className="larp-vault-connect-btn">Connect Wallet</button>
              )}
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="larp-vault-overview">
              <h3 className="larp-vault-section-title">Reference Performance</h3>
              <div className="larp-vault-chart-panel">
                <div className="larp-vault-chart-header">
                  <div className="larp-vault-chart-tabs">
                    <button
                      className={`larp-vault-chart-tab${chartTab === 'tvl' ? ' active' : ''}`}
                      onClick={() => setChartTab('tvl')}
                    >
                      TVL
                    </button>
                    <button
                      className={`larp-vault-chart-tab${chartTab === 'nav' ? ' active' : ''}`}
                      onClick={() => setChartTab('nav')}
                    >
                      NAV
                    </button>
                  </div>
                  <div className="larp-vault-time-range">
                    {TIME_RANGES.map(r => (
                      <button
                        key={r}
                        className={`larp-vault-time-pill${timeRange === r ? ' active' : ''}`}
                        onClick={() => setTimeRange(r)}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="larp-vault-chart-area">
                  <div className="larp-vault-chart-placeholder">
                    <span>Chart data unavailable</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="larp-vault-empty">
              <span>No activity recorded</span>
            </div>
          )}

          {activeTab === 'depositors' && (
            <div className="larp-vault-empty">
              <span>No depositor data available</span>
            </div>
          )}
        </div>
      </div>
    </div>
    <LarpAnnouncements />
    </div>
  )
}
