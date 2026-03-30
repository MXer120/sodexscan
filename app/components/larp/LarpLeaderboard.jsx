'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import LarpAnnouncements from './LarpAnnouncements'

const WINDOW_MAP = { '24H': 'DAILY', '7D': 'WEEKLY', '30D': 'MONTHLY', 'All-time': 'ALL_TIME' }
const PERIODS = ['24H', '7D', '30D', 'All-time']

const fmtUsd = (n) => {
  const v = parseFloat(n || 0)
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  return sign + '$' + abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const truncAddr = (a) => a ? `${a.slice(0, 6)}...${a.slice(-6)}` : '-'

// Medal SVG for top 3
const Medal = ({ color }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="8" fill={color} fillOpacity="0.9" />
    <circle cx="10" cy="10" r="6" fill={color} />
    <circle cx="10" cy="10" r="3.5" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="0.5" />
  </svg>
)

// Sort arrows
const SortArrows = ({ active, direction }) => (
  <span className="slb-sort-arrows">
    <svg width="8" height="5" viewBox="0 0 8 5" style={{ display: 'block' }}>
      <path d="M4 0L7.5 4.5H0.5L4 0Z" fill={active && direction === 'asc' ? '#FF7637' : '#A3A3A3'} />
    </svg>
    <svg width="8" height="5" viewBox="0 0 8 5" style={{ display: 'block' }}>
      <path d="M4 5L0.5 0.5H7.5L4 5Z" fill={active && direction === 'desc' ? '#FF7637' : '#A3A3A3'} />
    </svg>
  </span>
)

// Chevron SVG
const ChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M3 4.5L6 7.5L9 4.5" stroke="#A3A3A3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// Search icon
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="7" cy="7" r="5" stroke="#A3A3A3" strokeWidth="1.5" />
    <path d="M11 11L14 14" stroke="#A3A3A3" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

// Page arrow
const PageArrow = ({ direction, disabled }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: disabled ? 0.3 : 1 }}>
    {direction === 'left'
      ? <path d="M10 4L6 8L10 12" stroke="#A3A3A3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      : <path d="M6 4L10 8L6 12" stroke="#A3A3A3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    }
  </svg>
)

const RANK_GRADIENTS = {
  1: 'linear-gradient(180deg, rgba(255,179,5,0.16) 0%, rgba(255,179,5,0) 152.5%)',
  2: 'linear-gradient(180deg, rgba(205,225,231,0.16) 0%, rgba(205,225,231,0.02) 152.5%)',
  3: 'linear-gradient(180deg, rgba(255,131,44,0.12) 0%, rgba(255,131,44,0.02) 200%)',
}
const MEDAL_COLORS = { 1: '#FFB305', 2: '#CDE1E7', 3: '#FF832C' }

export default function LarpLeaderboard({ wallet }) {
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortBy, setSortBy] = useState('pnl')
  const [sortOrder, setSortOrder] = useState('desc')
  const [period, setPeriod] = useState('All-time')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [userRank, setUserRank] = useState(null)
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const [pageSizeDropdownOpen, setPageSizeDropdownOpen] = useState(false)
  const sortRef = useRef(null)
  const pageSizeRef = useRef(null)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const windowType = WINDOW_MAP[period]

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortDropdownOpen(false)
      if (pageSizeRef.current && !pageSizeRef.current.contains(e.target)) setPageSizeDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchLB = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/sodex-leaderboard?window_type=${windowType}&sort_by=${sortBy}&sort_order=${sortOrder}&page=${page}&page_size=${pageSize}`
      )
      const json = await res.json()
      if (json.code === 0 && json.data) {
        setData(json.data.items || [])
        setTotal(json.data.total || 0)
      }
    } catch (err) {
      console.error('LB fetch err:', err)
    } finally {
      setLoading(false)
    }
  }, [windowType, sortBy, sortOrder, page, pageSize])

  const fetchRank = useCallback(async () => {
    if (!wallet) { setUserRank(null); return }
    try {
      const res = await fetch(
        `/api/sodex-leaderboard/rank?window_type=${windowType}&sort_by=${sortBy}&wallet_address=${wallet}`
      )
      const json = await res.json()
      if (json.code === 0 && json.data) setUserRank(json.data)
      else setUserRank(null)
    } catch { setUserRank(null) }
  }, [wallet, windowType, sortBy])

  useEffect(() => { fetchLB() }, [fetchLB])
  useEffect(() => { fetchRank() }, [fetchRank])

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [sortBy, sortOrder, period, pageSize])

  const handleSortClick = (col) => {
    if (sortBy === col) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(col)
      setSortOrder('desc')
    }
  }

  const handleSearch = (e) => {
    if (e.key === 'Enter' && search.trim()) {
      // Search by full wallet address — use the rank endpoint
      // For now just set search state, could navigate or filter
    }
  }

  const pnlColor = (v) => {
    const n = parseFloat(v || 0)
    if (n > 0) return '#18B36B'
    if (n < 0) return '#ef4444'
    return '#A3A3A3'
  }

  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, total)

  return (
    <div className="larp-page-with-sidebar">
    <div className="slb-container">
      {/* Title */}
      <h1 className="slb-title">Traders Leaderboard</h1>

      {/* Filters Row */}
      <div className="slb-filters">
        <div className="slb-filters-left">
          {/* Sort Dropdown */}
          <div className="slb-dropdown" ref={sortRef}>
            <button
              className="slb-dropdown-btn"
              onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
            >
              <span>Sort By {sortBy === 'pnl' ? 'PNL' : 'Volume'}</span>
              <ChevronDown />
            </button>
            {sortDropdownOpen && (
              <div className="slb-dropdown-menu">
                <button
                  className={`slb-dropdown-item ${sortBy === 'pnl' ? 'active' : ''}`}
                  onClick={() => { setSortBy('pnl'); setSortDropdownOpen(false) }}
                >
                  Sort By PNL
                </button>
                <button
                  className={`slb-dropdown-item ${sortBy === 'volume' ? 'active' : ''}`}
                  onClick={() => { setSortBy('volume'); setSortDropdownOpen(false) }}
                >
                  Sort By Volume
                </button>
              </div>
            )}
          </div>

          {/* Time Period Pills */}
          <div className="slb-period-pills">
            {PERIODS.map(p => (
              <button
                key={p}
                className={`slb-period-pill ${period === p ? 'active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="slb-search">
          <SearchIcon />
          <input
            type="text"
            className="slb-search-input"
            placeholder="Enter a complete wallet address"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>
      </div>

      {/* Table */}
      <div className="slb-table-container">
        <table className="slb-table">
          <colgroup>
            <col style={{ width: '10%' }} />
            <col style={{ width: '35%' }} />
            <col style={{ width: '25%' }} />
            <col style={{ width: '30%' }} />
          </colgroup>
          <thead>
            <tr className="slb-thead-row">
              <th className="slb-th slb-th-rank">Rank</th>
              <th className="slb-th slb-th-trader">Trader</th>
              <th
                className={`slb-th slb-th-sortable ${sortBy === 'pnl' ? 'slb-th-active' : ''}`}
                onClick={() => handleSortClick('pnl')}
              >
                <span className="slb-th-sort-btn">
                  PNL ({period})
                  <SortArrows active={sortBy === 'pnl'} direction={sortOrder} />
                </span>
              </th>
              <th
                className={`slb-th slb-th-sortable ${sortBy === 'volume' ? 'slb-th-active' : ''}`}
                onClick={() => handleSortClick('volume')}
              >
                <span className="slb-th-sort-btn">
                  Volume
                  <SortArrows active={sortBy === 'volume'} direction={sortOrder} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Your Row */}
            {wallet && userRank && (
              <tr className="slb-row slb-your-row">
                <td className="slb-td slb-td-rank">
                  <div className="slb-rank-cell" style={{ justifyContent: 'flex-end' }}>
                    <span className="slb-you-badge">YOU</span>
                    <span className="slb-rank-num">{userRank.rank ?? '-'}</span>
                  </div>
                </td>
                <td className="slb-td slb-td-trader">{truncAddr(userRank.wallet_address || wallet)}</td>
                <td className="slb-td slb-td-pnl" style={{ color: pnlColor(userRank.pnl_usd) }}>
                  {fmtUsd(userRank.pnl_usd)}
                </td>
                <td className="slb-td slb-td-volume">{fmtUsd(userRank.volume_usd)}</td>
              </tr>
            )}

            {loading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <tr key={`skel-${i}`} className="slb-row">
                  <td className="slb-td slb-td-rank"><div className="slb-skeleton" style={{ width: 24 }} /></td>
                  <td className="slb-td slb-td-trader"><div className="slb-skeleton" style={{ width: 120 }} /></td>
                  <td className="slb-td slb-td-pnl"><div className="slb-skeleton" style={{ width: 80 }} /></td>
                  <td className="slb-td slb-td-volume"><div className="slb-skeleton" style={{ width: 100 }} /></td>
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={4} className="slb-empty">No data available</td>
              </tr>
            ) : (
              data.map((item) => {
                const rank = item.rank
                const isTop3 = rank >= 1 && rank <= 3
                return (
                  <tr
                    key={item.wallet_address}
                    className="slb-row"
                    style={isTop3 ? { background: RANK_GRADIENTS[rank] } : undefined}
                  >
                    <td className="slb-td slb-td-rank">
                      <div className="slb-rank-cell" style={{ justifyContent: 'flex-end' }}>
                        {isTop3 && <Medal color={MEDAL_COLORS[rank]} />}
                        <span className="slb-rank-num">{rank}</span>
                      </div>
                    </td>
                    <td className="slb-td slb-td-trader">{truncAddr(item.wallet_address)}</td>
                    <td className="slb-td slb-td-pnl" style={{ color: pnlColor(item.pnl_usd) }}>
                      {fmtUsd(item.pnl_usd)}
                    </td>
                    <td className="slb-td slb-td-volume">{fmtUsd(item.volume_usd)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="slb-pagination">
        <div className="slb-pagination-left">
          <span className="slb-pagination-text">Rows per page:</span>
          <div className="slb-dropdown slb-dropdown-sm" ref={pageSizeRef}>
            <button
              className="slb-dropdown-btn slb-dropdown-btn-sm"
              onClick={() => setPageSizeDropdownOpen(!pageSizeDropdownOpen)}
            >
              <span>{pageSize}</span>
              <ChevronDown />
            </button>
            {pageSizeDropdownOpen && (
              <div className="slb-dropdown-menu slb-dropdown-menu-up">
                {[10, 20, 50].map(s => (
                  <button
                    key={s}
                    className={`slb-dropdown-item ${pageSize === s ? 'active' : ''}`}
                    onClick={() => { setPageSize(s); setPageSizeDropdownOpen(false) }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="slb-pagination-center">
          <button
            className="slb-page-arrow"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            <PageArrow direction="left" disabled={page <= 1} />
          </button>
          <span className="slb-pagination-text">{page} of {totalPages}</span>
          <button
            className="slb-page-arrow"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            <PageArrow direction="right" disabled={page >= totalPages} />
          </button>
        </div>

        <div className="slb-pagination-right">
          <span className="slb-pagination-text">
            {total > 0 ? `${startItem}-${endItem} of ${total} items` : '0 items'}
          </span>
        </div>
      </div>

      {/* Footer note */}
      <p className="slb-footer-note">All rankings are refreshed hourly</p>
    </div>
    <LarpAnnouncements />
    </div>
  )
}
