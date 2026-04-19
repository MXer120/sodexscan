'use client'
import React, { useState, useCallback } from 'react'
import { perpsPositionHistory } from '../lib/sodexApi'
import { useSessionContext } from '../lib/SessionContext'
import ReportDashboard from './ReportDashboard'
import './ReportPage.css'

// ── Constants ──────────────────────────────────────────────────
const CY = new Date().getFullYear()
const YEARS = [CY, CY - 1, CY - 2, CY - 3]
const QS = {
  Q1: { m: [1,2,3],    sd: '01-01', ed: '03-31T23:59:59', label: 'Q1 · Jan–Mar' },
  Q2: { m: [4,5,6],    sd: '04-01', ed: '06-30T23:59:59', label: 'Q2 · Apr–Jun' },
  Q3: { m: [7,8,9],    sd: '07-01', ed: '09-30T23:59:59', label: 'Q3 · Jul–Sep' },
  Q4: { m: [10,11,12], sd: '10-01', ed: '12-31T23:59:59', label: 'Q4 · Oct–Dec' },
}
const COUNTRIES = [
  'Germany','Austria','Switzerland','France','Netherlands',
  'United States','United Kingdom','Spain','Italy','Other',
]
const CURRENCIES = ['USD','EUR','GBP','CHF']
const COUNTRY_TZ = {
  'Germany':        'Europe/Berlin',
  'Austria':        'Europe/Vienna',
  'Switzerland':    'Europe/Zurich',
  'France':         'Europe/Paris',
  'Netherlands':    'Europe/Amsterdam',
  'United States':  'America/New_York',
  'United Kingdom': 'Europe/London',
  'Spain':          'Europe/Madrid',
  'Italy':          'Europe/Rome',
  'Other':          'UTC',
}
const CACHE_VERSION = 'v2'
const CACHE_TTL_MS  = 60 * 60 * 1000  // 1 hour

// ── Data helpers ───────────────────────────────────────────────
function normPos(p) {
  // Handles both gateway API (camelCase) and mainnet-data (snake_case) field shapes
  const closeRaw = p.closeTime ?? p.updatedAt   ?? p.updated_at  ?? p.closedAt ?? p.closed_at ?? p.updateTime ?? p.endTime
  const openRaw  = p.openTime  ?? p.createdAt   ?? p.created_at  ?? p.openedAt ?? p.opened_at ?? p.createTime ?? p.startTime
  const sideRaw  = p.positionSide ?? p.position_side ?? p.side ?? p.direction ?? ''
  // position_side: 2 = long, 1 = short (mainnet-data numeric encoding)
  const sideStr  = typeof sideRaw === 'number'
    ? (sideRaw === 2 ? 'Long' : 'Short')
    : String(sideRaw)
  return {
    symbol:     String(p.symbol ?? p.coin ?? p.symbol_id ?? ''),
    side:       sideStr,
    size:       parseFloat(p.size ?? p.max_size ?? p.qty ?? p.contractQty ?? p.positionAmt ?? 0),
    entryPrice: parseFloat(p.entryPrice  ?? p.entry_price  ?? p.avgEntryPrice ?? p.open_price  ?? 0),
    exitPrice:  parseFloat(p.exitPrice   ?? p.exit_price   ?? p.avgExitPrice  ?? p.close_price ?? p.avgClosePrice ?? 0),
    pnl:        parseFloat(p.realizedPnL ?? p.realizedPnl  ?? p.realized_pnl  ?? p.pnl ?? p.realPnl ?? p.profit ?? 0),
    fee:        parseFloat(p.tradingFee  ?? p.cum_trading_fee ?? p.fee ?? p.commission ?? 0),
    openTime:   openRaw  ? new Date(typeof openRaw  === 'number' ? openRaw  : openRaw).toISOString() : null,
    closeTime:  closeRaw ? new Date(typeof closeRaw === 'number' ? closeRaw : closeRaw).toISOString() : null,
  }
}

function extractItems(raw) {
  if (Array.isArray(raw))           return raw
  if (Array.isArray(raw?.data))     return raw.data
  if (Array.isArray(raw?.list))     return raw.list
  if (Array.isArray(raw?.result))   return raw.result
  if (Array.isArray(raw?.records))  return raw.records
  return []
}

async function fetchFromGateway(address, startMs, endMs, onProgress) {
  const LIMIT = 1000
  const seen = new Set()
  const all = []
  let cursor = null
  let prevOldest = Infinity

  for (let page = 0; page < 200; page++) {
    onProgress(`Fetching positions… ${all.length} loaded`)
    const params = { limit: LIMIT }
    if (cursor) params.endTime = cursor

    let raw
    try {
      raw = await perpsPositionHistory(address, params)
    } catch (e) {
      if (page === 0) throw e
      break
    }

    const items = extractItems(raw)
    if (!items.length) break

    const batch = items.map(normPos).filter(p => p.closeTime)
    if (!batch.length) break

    for (const p of batch) {
      const key = `${p.symbol}|${p.side}|${p.openTime}|${p.closeTime}`
      if (!seen.has(key)) { seen.add(key); all.push(p) }
    }

    const oldestMs = Math.min(...batch.map(p => new Date(p.closeTime).getTime()))
    // Stop if API doesn't honour cursor (same oldest item returned again)
    if (oldestMs >= prevOldest) break
    prevOldest = oldestMs

    // Stop only when we've fetched past the start of the selected period
    if (oldestMs <= startMs) break
    // Also stop if API is exhausted (returned fewer than limit)
    if (batch.length < LIMIT) break

    cursor = oldestMs - 1
  }

  return all
    .filter(p => { const t = new Date(p.closeTime).getTime(); return t >= startMs && t <= endMs })
    .sort((a, b) => new Date(a.closeTime) - new Date(b.closeTime))
}

async function fetchAllPositions(address, startMs, endMs, onProgress) {
  return fetchFromGateway(address, startMs, endMs, onProgress)
}

function cacheKey(wallet, year, mode, quarter) {
  return `tax_report_${CACHE_VERSION}_${wallet.trim().toLowerCase()}_${year}_${mode}${mode === 'quarterly' ? '_' + quarter : ''}`
}

function loadCache(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { trades, fetchedAt } = JSON.parse(raw)
    if (Date.now() - fetchedAt > CACHE_TTL_MS) { localStorage.removeItem(key); return null }
    return trades
  } catch { return null }
}

function saveCache(key, trades) {
  try { localStorage.setItem(key, JSON.stringify({ trades, fetchedAt: Date.now() })) } catch {}
}

function parseInTz(localDateStr, tz) {
  const [datePart, timePart = '00:00:00'] = localDateStr.split('T')
  const [y, mo, d] = datePart.split('-').map(Number)
  const [h, mi, s] = timePart.split(':').map(Number)
  const approx = new Date(Date.UTC(y, mo - 1, d, h, mi, s || 0))
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(approx)
  const get = t => parseInt(parts.find(p => p.type === t)?.value ?? '0')
  const offsetMs = approx.getTime() - Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return Date.UTC(y, mo - 1, d, h, mi, s || 0) + offsetMs
}

function getRange(year, mode, quarter, country = 'Germany') {
  const tz = COUNTRY_TZ[country] ?? 'UTC'
  const q = QS[quarter]
  return mode === 'quarterly'
    ? { startMs: parseInTz(`${year}-${q.sd}`, tz), endMs: parseInTz(`${year}-${q.ed}`, tz) }
    : { startMs: parseInTz(`${year}-01-01`, tz),   endMs: parseInTz(`${year}-12-31T23:59:59`, tz) }
}

// ── Component ──────────────────────────────────────────────────
export default function ReportsPage() {
  const { user } = useSessionContext()

  const [step,    setStep]    = useState(1)
  const [wallet,  setWallet]  = useState('')
  const [year,    setYear]    = useState(CY)
  const [mode,    setMode]    = useState('yearly')
  const [quarter, setQuarter] = useState('Q1')
  const [tax,     setTax]     = useState({ name: '', taxId: '', country: 'Germany', currency: 'EUR', inclFees: true })
  const [agree1,  setAgree1]  = useState(false)
  const [agree2,  setAgree2]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress,setProgress]= useState('')
  const [error,   setError]   = useState('')
  const [report,  setReport]  = useState(null)
  const [cached,  setCached]  = useState(false)

  const periodLabel = mode === 'quarterly' ? `${year} ${quarter}` : `${year} Full Year`

  const generate = useCallback(async () => {
    setLoading(true); setError('')
    const key = cacheKey(wallet, year, mode, quarter)
    const { startMs, endMs } = getRange(year, mode, quarter, tax.country)
    try {
      let trades = loadCache(key)
      if (trades) {
        setCached(true)
      } else {
        setCached(false)
        trades = await fetchAllPositions(wallet.trim(), startMs, endMs, setProgress)
        saveCache(key, trades)
      }
      setReport({ trades, key })
    } catch (e) {
      setError(e.message ?? 'Failed to fetch positions. Check the wallet address.')
    } finally {
      setLoading(false); setProgress('')
    }
  }, [wallet, year, mode, quarter])

  const resetWizard = () => {
    setReport(null); setAgree1(false); setAgree2(false); setError(''); setStep(1)
  }

  if (report) {
    return (
      <ReportDashboard
        trades={report.trades}
        meta={{ wallet, label: periodLabel, year, mode, quarter, cached, ...tax }}
        onNewReport={resetWizard}
        onRefresh={() => { try { localStorage.removeItem(report.key) } catch {} resetWizard() }}
      />
    )
  }

  return (
    <div className="rp-page">
      <div className="rp-page-header">
        <div>
          <h1 className="rp-title">Reports &amp; Analytics</h1>
          <p className="rp-subtitle">Futures trading tax report — compliant with standard reporting requirements.</p>
        </div>
      </div>

      {/* Step progress */}
      <div className="rp-progress-bar">
        {['Wallet &amp; Period', 'Tax Settings', 'Confirm &amp; Generate'].map((label, i) => {
          const n = i + 1
          return (
            <React.Fragment key={n}>
              <div className={`rp-prog-step ${step === n ? 'active' : step > n ? 'done' : ''}`}
                onClick={() => !loading && step > n && setStep(n)} style={{ cursor: step > n ? 'pointer' : 'default' }}>
                <div className="rp-prog-dot">
                  {step > n ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> : n}
                </div>
                <span dangerouslySetInnerHTML={{ __html: label }} />
              </div>
              {i < 2 && <div className={`rp-prog-line ${step > n ? 'done' : ''}`} />}
            </React.Fragment>
          )
        })}
      </div>

      {/* Step 1 — Wallet & Period */}
      {step === 1 && (
        <div className="rp-step-card">
          <div className="rp-step-heading">
            <span className="rp-step-num">01</span>
            <div>
              <div className="rp-step-title">Wallet &amp; Reporting Period</div>
              <div className="rp-step-desc">Enter the wallet address and choose the tax period for this report.</div>
            </div>
          </div>
          <div className="rp-fields">
            <div className="rp-field-full">
              <label className="rp-label">Wallet Address <span className="rp-req">*</span></label>
              <input className="rp-input rp-input-mono" value={wallet}
                onChange={e => setWallet(e.target.value)} placeholder="0x..." />
            </div>
            <div className="rp-field-row">
              <div className="rp-field">
                <label className="rp-label">Tax Year</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {YEARS.map(y => <button key={y} className={`ds-chip ${year === y ? 'active' : ''}`} onClick={() => setYear(y)}>{y}</button>)}
                </div>
              </div>
              <div className="rp-field">
                <label className="rp-label">Period Type</label>
                <div className="ds-segmented">
                  <button className={mode === 'yearly'    ? 'active' : ''} onClick={() => setMode('yearly')}>Full Year</button>
                  <button className={mode === 'quarterly' ? 'active' : ''} onClick={() => setMode('quarterly')}>Quarterly</button>
                </div>
              </div>
              {mode === 'quarterly' && (
                <div className="rp-field">
                  <label className="rp-label">Quarter</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {Object.entries(QS).map(([k]) => (
                      <button key={k} className={`ds-chip ${quarter === k ? 'active' : ''}`} onClick={() => setQuarter(k)}>{k}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="rp-step-actions">
            <button className="rp-btn-primary" disabled={!wallet.trim()} onClick={() => setStep(2)}>Continue</button>
          </div>
        </div>
      )}

      {/* Step 2 — Tax Settings */}
      {step === 2 && (
        <div className="rp-step-card">
          <div className="rp-step-heading">
            <span className="rp-step-num">02</span>
            <div>
              <div className="rp-step-title">Tax Details</div>
              <div className="rp-step-desc">These details appear in the report header and are required for legal compliance.</div>
            </div>
          </div>
          <div className="rp-fields">
            <div className="rp-field-row">
              <div className="rp-field">
                <label className="rp-label">Full Name / Entity <span className="rp-req">*</span></label>
                <input className="rp-input" value={tax.name} onChange={e => setTax(p => ({...p, name: e.target.value}))} placeholder="Your name or company" />
              </div>
              <div className="rp-field">
                <label className="rp-label">Tax ID <span className="rp-opt">(optional)</span></label>
                <input className="rp-input" value={tax.taxId} onChange={e => setTax(p => ({...p, taxId: e.target.value}))} placeholder="e.g. DE123456789" />
              </div>
            </div>
            <div className="rp-field-row">
              <div className="rp-field">
                <label className="rp-label">Tax Jurisdiction <span className="rp-req">*</span></label>
                <select className="rp-input" value={tax.country} onChange={e => setTax(p => ({...p, country: e.target.value}))}>
                  {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="rp-field">
                <label className="rp-label">Reporting Currency</label>
                <select className="rp-input" value={tax.currency} onChange={e => setTax(p => ({...p, currency: e.target.value}))}>
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <label className="rp-toggle-row">
              <div className={`rp-toggle ${tax.inclFees ? 'on' : ''}`} onClick={() => setTax(p => ({...p, inclFees: !p.inclFees}))}>
                <div className="rp-toggle-knob" />
              </div>
              <div>
                <div className="rp-toggle-label">Deduct trading fees from taxable PnL</div>
                <div className="rp-toggle-hint">Recommended in most jurisdictions — reduces net taxable amount</div>
              </div>
            </label>
          </div>
          <div className="rp-step-actions rp-step-actions-between">
            <button className="rp-btn-ghost" onClick={() => setStep(1)}>Back</button>
            <button className="rp-btn-primary" disabled={!tax.name || !tax.country} onClick={() => setStep(3)}>Continue</button>
          </div>
        </div>
      )}

      {/* Step 3 — Confirm */}
      {step === 3 && (
        <div className="rp-step-card">
          <div className="rp-step-heading">
            <span className="rp-step-num">03</span>
            <div>
              <div className="rp-step-title">Review &amp; Generate</div>
              <div className="rp-step-desc">Confirm the details below, then generate your report.</div>
            </div>
          </div>
          <div className="rp-confirm-table">
            {[
              ['Wallet',        wallet],
              ['Period',        periodLabel],
              ['Name',          tax.name],
              ['Tax ID',        tax.taxId || '—'],
              ['Jurisdiction',  tax.country],
              ['Currency',      tax.currency],
              ['Fees deducted', tax.inclFees ? 'Yes — deducted from taxable PnL' : 'No'],
            ].map(([k, v]) => (
              <div key={k} className="rp-confirm-row">
                <span className="rp-confirm-key">{k}</span>
                <span className="rp-confirm-val">{v}</span>
              </div>
            ))}
          </div>
          <div className="rp-legal-checks">
            <label className="rp-check-row">
              <input type="checkbox" checked={agree1} onChange={e => setAgree1(e.target.checked)} />
              <span>I confirm the wallet address and all details above are accurate.</span>
            </label>
            <label className="rp-check-row">
              <input type="checkbox" checked={agree2} onChange={e => setAgree2(e.target.checked)} />
              <span>I understand this report is for informational purposes only and does not constitute legal, financial, or tax advice. I will consult a qualified tax advisor for my jurisdiction.</span>
            </label>
          </div>
          {error && <div className="rp-error">{error}</div>}
          {loading && (
            <div className="rp-loading-state">
              <div className="rp-spinner" />
              <span>{progress || 'Initialising…'}</span>
            </div>
          )}
          <div className="rp-step-actions rp-step-actions-between">
            <button className="rp-btn-ghost" disabled={loading} onClick={() => setStep(2)}>Back</button>
            <button className="rp-btn-primary rp-btn-generate" disabled={!agree1 || !agree2 || loading} onClick={generate}>
              {loading ? 'Generating…' : 'Generate Report'}
            </button>
          </div>
        </div>
      )}

      {/* Report type info card */}
      {step === 1 && (
        <div className="rp-info-card">
          <div className="rp-info-type">Futures Tax Report</div>
          <div className="rp-info-features">
            {['Realized PnL per closed position', 'Trading fee deduction', 'Quarterly & yearly breakdown', 'Cumulative PnL chart', 'Symbol performance breakdown', 'CSV & PDF export'].map(f => (
              <div key={f} className="rp-info-feature">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l2.5 2.5L10 3.5" stroke="var(--ds-accent)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                {f}
              </div>
            ))}
          </div>
          <div className="rp-info-note">Data is fetched directly from the Sodex API and cached locally for 1 hour.</div>
        </div>
      )}
    </div>
  )
}
