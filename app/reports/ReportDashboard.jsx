'use client'
import React, { useMemo, useState } from 'react'
import ChartCard from '../components/ChartCard'
import '../styles/DesignSystemPage.css'

// ── Formatters ─────────────────────────────────────────────────
const fmtNum = (n, decimals = 2) =>
  n == null || isNaN(n) ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

const fmtPnl = (n, currency = 'USD') => {
  if (n == null || isNaN(n)) return '—'
  const abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const sign = n < 0 ? '−' : n > 0 ? '+' : ''
  const sym = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'CHF' ? 'Fr ' : '$'
  return `${sign}${sym}${abs}`
}

const fmtDate = iso => iso
  ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—'

const closeDay = iso => iso ? iso.slice(0, 10) : null

// ── DS KPI Card ────────────────────────────────────────────────
function KpiCard({ label, value, colorClass, deltaValue, deltaDir, deltaLabel, spark }) {
  const bars = spark || [40, 55, 35, 70, 50, 80, 65, 90]
  return (
    <div className="ds-kpi-card">
      <div className="ds-kpi-inner">
        <div className="ds-kpi-label-row">
          <span className="ds-kpi-label">{label}</span>
        </div>
        <div className="ds-kpi-value-row">
          <span className={`ds-kpi-value${colorClass ? ' rd-kpi-' + colorClass : ''}`}>{value}</span>
        </div>
        <div className="ds-kpi-sparkline">
          {bars.map((h, i) => (
            <div key={i} className={`ds-spark-bar${i === bars.length - 1 ? ' peak' : ''}`}
              style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
      <div className="ds-kpi-footer">
        <span className="ds-info-icon">i</span>
        {(deltaValue || deltaLabel) && (
          <div className="ds-kpi-footer-right">
            {deltaValue && <span className={`ds-kpi-delta${deltaDir ? ' ' + deltaDir : ''}`}>{deltaValue}</span>}
            {deltaLabel && <span className="ds-kpi-delta-label">{deltaLabel}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── DS Table wrapper ───────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

function DsTable({ title, count, children, page, totalPages, onPage, pageSize, onPageSize, totalRows }) {
  const showPagination = totalPages != null && totalPages > 1 && onPage
  const pageWindow = () => {
    if (!showPagination) return []
    const total = totalPages, cur = page
    if (total <= 7) return Array.from({ length: total }, (_, i) => i)
    const around = [cur - 1, cur, cur + 1].filter(i => i >= 0 && i < total)
    const set = [...new Set([0, ...around, total - 1])].sort((a, b) => a - b)
    const result = []
    set.forEach((p, i) => {
      if (i > 0 && p - set[i - 1] > 1) result.push('…')
      result.push(p)
    })
    return result
  }
  const rowStart = totalRows ? page * pageSize + 1 : null
  const rowEnd   = totalRows ? Math.min((page + 1) * pageSize, totalRows) : null
  return (
    <div className="ds-table-card">
      {(title || count != null || onPageSize) && (
        <div className="ds-table-topstrip">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {title && <span className="rd-section-title">{title}</span>}
            {count != null && <span className="rd-section-count">{count}</span>}
          </div>
          {onPageSize && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--ds-text-muted)' }}>Rows</span>
              <div className="ds-segmented" style={{ display: 'inline-flex' }}>
                {PAGE_SIZE_OPTIONS.map(s => (
                  <button key={s} className={pageSize === s ? 'active' : ''}
                    onClick={() => { onPageSize(s); onPage(0) }}>{s}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <div className="ds-table-inner">
        {children}
        {showPagination && (
          <div className="ds-pagination">
            <span>{rowStart != null ? `${rowStart}–${rowEnd} of ${totalRows}` : `Page ${page + 1} of ${totalPages}`}</span>
            <div className="ds-pagination-btns">
              <button className="ds-page-btn" disabled={page === 0} onClick={() => onPage(page - 1)}>‹</button>
              {pageWindow().map((p, i) =>
                p === '…'
                  ? <span key={`e${i}`} style={{ padding: '0 4px', color: 'var(--ds-text-muted)', fontSize: 12 }}>…</span>
                  : <button key={p} className={`ds-page-btn${p === page ? ' active' : ''}`} onClick={() => onPage(p)}>{p + 1}</button>
              )}
              <button className="ds-page-btn" disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)}>›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Download helpers ───────────────────────────────────────────
function downloadCSV(trades, meta) {
  const headers = ['Date', 'Symbol', 'Side', 'Size', 'Entry Price', 'Exit Price', 'Gross PnL', 'Fee', 'Net PnL']
  const rows = trades.map(t => [
    fmtDate(t.closeTime),
    t.symbol,
    t.side,
    t.size,
    fmtNum(t.entryPrice, 4),
    fmtNum(t.exitPrice, 4),
    fmtNum(t.pnl),
    fmtNum(t.fee),
    fmtNum(meta.inclFees ? t.pnl - t.fee : t.pnl),
  ])
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `futures-tax-report-${meta.label.replace(/\s/g, '-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Main component ─────────────────────────────────────────────
export default function ReportDashboard({ trades = [], meta = {}, onNewReport, onRefresh }) {
  const [tradePage, setTradePage] = useState(0)
  const [pageSize,  setPageSize]  = useState(10)
  const currency = meta.currency ?? 'USD'

  const stats = useMemo(() => {
    const totalTrades = trades.length
    const wins = trades.filter(t => t.pnl > 0).length
    const winRate = totalTrades ? (wins / totalTrades) * 100 : 0
    const grossPnl = trades.reduce((s, t) => s + t.pnl, 0)
    const totalFees = trades.reduce((s, t) => s + t.fee, 0)
    const netPnl = meta.inclFees ? grossPnl - totalFees : grossPnl
    return { totalTrades, winRate, grossPnl, totalFees, netPnl }
  }, [trades, meta.inclFees])

  const pnlChartData = useMemo(() => {
    const byDay = {}
    for (const t of trades) {
      const d = closeDay(t.closeTime)
      if (!d) continue
      if (!byDay[d]) byDay[d] = { date: d, dailyPnl: 0 }
      byDay[d].dailyPnl += meta.inclFees ? t.pnl - t.fee : t.pnl
    }
    const days = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date))
    let cum = 0
    return days.map(d => { cum += d.dailyPnl; return { ...d, cumPnl: cum } })
  }, [trades, meta.inclFees])

  const breakdownRows = useMemo(() => {
    const buckets = {}
    for (const t of trades) {
      if (!t.closeTime) continue
      const d = new Date(t.closeTime)
      const key = meta.mode === 'yearly'
        ? `Q${Math.ceil((d.getMonth() + 1) / 3)}`
        : d.toLocaleDateString('en-US', { month: 'long' })
      if (!buckets[key]) buckets[key] = { label: key, trades: 0, wins: 0, grossPnl: 0, fees: 0 }
      buckets[key].trades++
      if (t.pnl > 0) buckets[key].wins++
      buckets[key].grossPnl += t.pnl
      buckets[key].fees += t.fee
    }
    return Object.values(buckets).map(b => ({
      ...b,
      winRate: b.trades ? (b.wins / b.trades) * 100 : 0,
      netPnl: meta.inclFees ? b.grossPnl - b.fees : b.grossPnl,
    }))
  }, [trades, meta.inclFees, meta.mode])

  const symbolRows = useMemo(() => {
    const m = {}
    for (const t of trades) {
      if (!m[t.symbol]) m[t.symbol] = { symbol: t.symbol, trades: 0, grossPnl: 0, fees: 0 }
      m[t.symbol].trades++
      m[t.symbol].grossPnl += t.pnl
      m[t.symbol].fees += t.fee
    }
    return Object.values(m)
      .map(s => ({ ...s, netPnl: meta.inclFees ? s.grossPnl - s.fees : s.grossPnl }))
      .sort((a, b) => b.netPnl - a.netPnl)
  }, [trades, meta.inclFees])

  const totalPages = Math.ceil(trades.length / pageSize)
  const visibleTrades = trades.slice(tradePage * pageSize, (tradePage + 1) * pageSize)

  return (
    <div className="rd-root">

      {/* ── Header ── */}
      <div className="rd-header">
        <div className="rd-header-left">
          <div className="rd-header-title">
            <h1 className="rd-title">Futures Tax Report</h1>
            <span className={`rd-cache-badge ${meta.cached ? 'cached' : 'fresh'}`}>
              {meta.cached ? 'Cached' : 'Live'}
            </span>
          </div>
          <div className="rd-header-meta">
            <span className="rd-meta-chip rd-meta-accent">{meta.label}</span>
            <span className="rd-meta-chip rd-meta-mono">{meta.wallet}</span>
            {meta.name   && <span className="rd-meta-chip">{meta.name}</span>}
            {meta.taxId  && <span className="rd-meta-chip">{meta.taxId}</span>}
            <span className="rd-meta-chip">{meta.country}</span>
            <span className="rd-meta-chip">{currency}</span>
            <span className="rd-meta-chip">{meta.inclFees ? 'Fees deducted' : 'Fees not deducted'}</span>
          </div>
        </div>
        <div className="rd-header-actions">
          <button className="ds-btn ds-btn-ghost" onClick={onRefresh}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 7A6 6 0 1 0 7 1M1 1v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Refresh
          </button>
          <button className="ds-btn ds-btn-secondary" onClick={() => downloadCSV(trades, meta)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Export CSV
          </button>
          <button className="ds-btn ds-btn-secondary" onClick={() => window.print()}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="5" width="10" height="6" rx="1" stroke="currentColor" strokeWidth="1.3"/><path d="M4 5V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M4 9h2M4 11h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            Export PDF
          </button>
          <button className="ds-btn ds-btn-primary" onClick={onNewReport}>New Report</button>
        </div>
      </div>

      {/* ── KPI grid — uses DS KPI card classes ── */}
      <div className="ds-kpi-grid rd-kpi-grid">
        <KpiCard label="Total Trades"    value={stats.totalTrades.toLocaleString()}
          deltaLabel="closed positions"
          spark={[35, 50, 45, 60, 40, 70, 55, 80]} />
        <KpiCard label="Win Rate"        value={`${fmtNum(stats.winRate, 1)}%`} colorClass={stats.winRate >= 50 ? 'pos' : 'neg'}
          deltaValue={`${fmtNum(100 - stats.winRate, 1)}%`} deltaDir="down"
          deltaLabel="loss rate"
          spark={[60, 45, 70, 55, 75, 50, 80, 60]} />
        <KpiCard label="Gross PnL"       value={fmtPnl(stats.grossPnl, currency)} colorClass={stats.grossPnl >= 0 ? 'pos' : 'neg'}
          deltaLabel="before fees"
          spark={[40, 55, 35, 65, 50, 70, 60, 75]} />
        <KpiCard label="Total Fees"      value={fmtPnl(stats.totalFees, currency)} colorClass="neg"
          deltaLabel={meta.inclFees ? 'deducted from PnL' : 'not deducted'}
          spark={[30, 45, 35, 55, 40, 60, 50, 65]} />
        <KpiCard label="Net Taxable PnL" value={fmtPnl(stats.netPnl, currency)} colorClass={stats.netPnl >= 0 ? 'pos' : 'neg'}
          deltaLabel={meta.inclFees ? 'fees deducted' : 'gross, no deduction'}
          spark={[45, 60, 40, 70, 55, 75, 65, 85]} />
      </div>

      {/* ── PnL chart ── */}
      {pnlChartData.length > 0 && (
        <div className="rd-chart-wrap">
          <ChartCard
            title="Cumulative Net PnL"
            data={pnlChartData}
            dateKey="date"
            type="bar"
            showCumulative={true}
            series={[
              { key: 'dailyPnl', label: 'Daily PnL',      type: 'bar' },
              { key: 'cumPnl',   label: 'Cumulative PnL', cumulative: true },
            ]}
            defaultSelected={['dailyPnl', 'cumPnl']}
          />
        </div>
      )}

      {/* ── Period breakdown ── */}
      {breakdownRows.length > 0 && (
        <DsTable title={meta.mode === 'yearly' ? 'Quarterly Breakdown' : 'Monthly Breakdown'}>
          <table>
            <thead><tr>
              <th>Period</th>
              <th className="rd-right">Trades</th>
              <th className="rd-right">Win Rate</th>
              <th className="rd-right">Gross PnL</th>
              <th className="rd-right">Fees</th>
              <th className="rd-right">Net PnL</th>
            </tr></thead>
            <tbody>
              {breakdownRows.map(r => (
                <tr key={r.label}>
                  <td className="rd-bold">{r.label}</td>
                  <td className="rd-right">{r.trades}</td>
                  <td className="rd-right">{fmtNum(r.winRate, 1)}%</td>
                  <td className={`rd-right ${r.grossPnl >= 0 ? 'rd-pos' : 'rd-neg'}`}>{fmtPnl(r.grossPnl, currency)}</td>
                  <td className="rd-right rd-muted">{fmtPnl(r.fees, currency)}</td>
                  <td className={`rd-right rd-bold ${r.netPnl >= 0 ? 'rd-pos' : 'rd-neg'}`}>{fmtPnl(r.netPnl, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DsTable>
      )}

      {/* ── Symbol breakdown ── */}
      {symbolRows.length > 0 && (
        <DsTable title="Symbol Performance">
          <table>
            <thead><tr>
              <th>Symbol</th>
              <th className="rd-right">Trades</th>
              <th className="rd-right">Gross PnL</th>
              <th className="rd-right">Fees</th>
              <th className="rd-right">Net PnL</th>
            </tr></thead>
            <tbody>
              {symbolRows.map(r => (
                <tr key={r.symbol}>
                  <td className="mono">{r.symbol}</td>
                  <td className="rd-right">{r.trades}</td>
                  <td className={`rd-right ${r.grossPnl >= 0 ? 'rd-pos' : 'rd-neg'}`}>{fmtPnl(r.grossPnl, currency)}</td>
                  <td className="rd-right rd-muted">{fmtPnl(r.fees, currency)}</td>
                  <td className={`rd-right rd-bold ${r.netPnl >= 0 ? 'rd-pos' : 'rd-neg'}`}>{fmtPnl(r.netPnl, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DsTable>
      )}

      {/* ── Trade history ── */}
      <DsTable title="Trade History" count={`${trades.length} positions`}
        page={tradePage} totalPages={totalPages} onPage={setTradePage}
        pageSize={pageSize} onPageSize={setPageSize} totalRows={trades.length}>
        <table>
          <thead><tr>
            <th>Date</th>
            <th>Symbol</th>
            <th>Side</th>
            <th className="rd-right">Size</th>
            <th className="rd-right">Entry</th>
            <th className="rd-right">Exit</th>
            <th className="rd-right">Gross PnL</th>
            <th className="rd-right">Fee</th>
            <th className="rd-right">Net PnL</th>
          </tr></thead>
          <tbody>
            {visibleTrades.map((t, i) => {
              const net = meta.inclFees ? t.pnl - t.fee : t.pnl
              const sideLower = t.side?.toLowerCase()
              return (
                <tr key={i}>
                  <td className="rd-muted">{fmtDate(t.closeTime)}</td>
                  <td className="mono">{t.symbol}</td>
                  <td className={sideLower === 'long' ? 'rd-pos' : 'rd-neg'}>{t.side}</td>
                  <td className="rd-right rd-muted">{fmtNum(t.size, 4)}</td>
                  <td className="rd-right rd-muted">{fmtNum(t.entryPrice, 4)}</td>
                  <td className="rd-right rd-muted">{fmtNum(t.exitPrice, 4)}</td>
                  <td className={`rd-right ${t.pnl >= 0 ? 'rd-pos' : 'rd-neg'}`}>{fmtPnl(t.pnl, currency)}</td>
                  <td className="rd-right rd-muted">{fmtPnl(t.fee, currency)}</td>
                  <td className={`rd-right rd-bold ${net >= 0 ? 'rd-pos' : 'rd-neg'}`}>{fmtPnl(net, currency)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </DsTable>

      <div className="rd-legal">
        This report is generated from on-chain data for informational purposes only.
        It does not constitute legal, financial, or tax advice.
        Consult a qualified tax professional in your jurisdiction.
      </div>
    </div>
  )
}
