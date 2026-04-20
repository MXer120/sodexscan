'use client'
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { perpsPositionHistory, perpsTrades, perpsBalances, perpsPositions } from '../../lib/sodexApi'
import { supabase } from '../../lib/supabaseClient'

const STATUS = { IDLE: 'idle', LOADING: 'loading', LARP: 'larp', POSSIBLE: 'possible', LEGIT: 'legit', ERROR: 'error' }

// ─── Helpers ───
const fmt = (v, d = 2) => {
  const n = parseFloat(v || 0)
  return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })
}
const fmtSign = (v) => {
  const n = parseFloat(v || 0)
  return `${n >= 0 ? '+' : ''}$${fmt(Math.abs(n))}`
}
const truncAddr = (a) => a ? `${a.slice(0, 6)}...${a.slice(-4)}` : ''
const tsToDate = (ms) => {
  if (!ms) return '\u2014'
  const d = new Date(typeof ms === 'string' ? ms : Number(ms))
  return isNaN(d.getTime()) ? '\u2014' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Input parsing
const REF_LINK_RE = /(?:sodex\.com\/(?:join|invite|ref)\/)([A-Z0-9]{3,})/i
const isWalletAddr = (v) => /^0x[a-fA-F0-9]{40}$/.test(v)
const extractRefCode = (input) => {
  const linkMatch = input.match(REF_LINK_RE)
  if (linkMatch) return linkMatch[1].toUpperCase()
  const trimmed = input.trim()
  if (!isWalletAddr(trimmed) && /^[A-Z0-9]{3,20}$/i.test(trimmed)) return trimmed.toUpperCase()
  return null
}

// ─── Multi-language OCR labels ───
// Sodex supports: EN, ZH (Simplified/Traditional), KO, JA, RU, TR, VI, ES, PT, DE, FR, AR
const LANG_LABELS = {
  long: ['long', 'tong', '做多', '多', 'ロング', '롱', 'лонг', 'uzun', 'mua', 'largo', 'compra', 'lang', 'achat'],
  short: ['short', 'shor', '做空', '空', 'ショート', '숏', 'шорт', 'kısa', 'bán', 'corto', 'venda', 'kurz', 'vente'],
  entry: ['entry\\s*price', 'entry', '开仓价', '開倉價', '参入価格', '진입가', 'цена входа', 'giriş\\s*fiyatı', 'giá vào', 'precio\\s*de\\s*entrada', 'preço\\s*de\\s*entrada', 'einstiegspreis', "prix\\s*d'entrée"],
  mark: ['mark\\s*price', 'mark', '标记价格', '標記價格', 'マーク価格', '마크가', 'цена маркировки', 'işaret\\s*fiyatı', 'giá đánh dấu', 'precio\\s*de\\s*marca', 'preço\\s*de\\s*marca', 'markpreis', 'prix\\s*de\\s*marque'],
  hold: ['hold\\s*period', 'hold', '持仓时间', '持倉時間', '保有期間', '보유기간', 'период\\s*удержания', 'tutma\\s*süresi', 'thời gian nắm giữ', 'período\\s*de\\s*retención', 'período\\s*de\\s*retenção', 'haltedauer', 'période\\s*de\\s*détention'],
}
const buildLangRe = (key) => new RegExp(`(?:${LANG_LABELS[key].join('|')})`, 'i')
const RE_ENTRY_LABEL = buildLangRe('entry')
const RE_MARK_LABEL = buildLangRe('mark')
const RE_HOLD_LABEL = buildLangRe('hold')
const RE_LONG = buildLangRe('long')
const RE_SHORT = buildLangRe('short')

// ─── OCR text parsing (multi-language) ───
function parseOcrText(text) {
  const lines = text.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean)
  const full = lines.join(' ')

  // Symbol: BTC-USD, ETH-USD, SOL/USD, BTCUSDT etc
  const symMatch = full.match(/\b([A-Z]{2,10})\s*[-\/]\s*(USD[T]?)\b/i)
    || full.match(/\b([A-Z]{2,10})(USDT?)\b/i)
  const symbol = symMatch ? `${symMatch[1].toUpperCase()}-${symMatch[2].toUpperCase()}` : ''

  // Side + leverage: Orange badge "Long 25X" — same color, right next to each other.
  // OCR often merges, splits, or garbles them. Multi-language support.
  let side = '', leverage = ''

  // Normalize common OCR artifacts
  const cleaned = full
    .replace(/[|]/g, '')
    .replace(/\u200b/g, '')
    .replace(/\s{2,}/g, ' ')

  // Build multi-lang side patterns with leverage
  const longWords = LANG_LABELS.long.join('|')
  const shortWords = LANG_LABELS.short.join('|')
  const allSideWords = `${longWords}|${shortWords}`

  const sidePatterns = [
    // Standard: "Long 25X", "Short 10x", "做多 25X"
    new RegExp(`\\b(${allSideWords})\\s*(\\d{1,4})\\s*[xX×]\\b`, 'i'),
    // No space: "Long25X", "做多25X"
    new RegExp(`(${allSideWords})(\\d{1,4})[xX×]`, 'i'),
    // With dot/comma: "Long.25x"
    new RegExp(`(${allSideWords})[.\\s]*(\\d{1,4})\\s*[xX×]`, 'i'),
    // OCR spacing: "L o n g 25X"
    /(L\s*o\s*n\s*g|S\s*h\s*o\s*r\s*t)\s*(\d{1,4})\s*[xX×]/i,
    // Leverage first: "25x Long"
    new RegExp(`(\\d{1,4})\\s*[xX×]\\s*(${allSideWords})`, 'i'),
  ]

  for (const pat of sidePatterns) {
    const m = cleaned.match(pat)
    if (m) {
      if (/^\d/.test(m[1])) {
        leverage = m[1]
        side = RE_LONG.test(m[2]) ? 'Long' : 'Short'
      } else {
        side = RE_LONG.test(m[1]) ? 'Long' : 'Short'
        leverage = m[2]
      }
      break
    }
  }

  // Fallback: find side and leverage separately
  if (!side) {
    if (RE_LONG.test(cleaned)) side = 'Long'
    else if (RE_SHORT.test(cleaned)) side = 'Short'
    if (!side) {
      for (const line of lines) {
        const l = line.replace(/\s+/g, '')
        if (RE_LONG.test(l)) { side = 'Long'; break }
        if (RE_SHORT.test(l)) { side = 'Short'; break }
      }
    }
  }
  if (!leverage) {
    const levMatch = cleaned.match(/\b(\d{1,4})\s*[xX×]\b/)
    if (levMatch) leverage = levMatch[1]
  }

  // PnL percentage: +14.66% or -2.5% or 14.66%
  const pnlMatch = full.match(/([+-]?\d+[.,]\d+)\s*%/)
  const pnlPct = pnlMatch ? pnlMatch[1].replace(',', '.') : ''

  // Entry price + mark price: multi-language labels
  let entryPrice = '', markPrice = ''

  // Strategy 1: label on same line as value (multi-lang)
  const entryRe = new RegExp(`(?:${LANG_LABELS.entry.join('|')})\\s*[:\\s]*([0-9][0-9,]*(?:\\.\\d+)?)`, 'i')
  const markRe = new RegExp(`(?:${LANG_LABELS.mark.join('|')})\\s*[:\\s]*([0-9][0-9,]*(?:\\.\\d+)?)`, 'i')
  const entryInline = full.match(entryRe)
  if (entryInline) entryPrice = entryInline[1].replace(/,/g, '')
  const markInline = full.match(markRe)
  if (markInline) markPrice = markInline[1].replace(/,/g, '')

  // Strategy 2: labels on one line, values on next line(s)
  if (!entryPrice || !markPrice) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (RE_ENTRY_LABEL.test(line) && RE_MARK_LABEL.test(line)) {
        const valueLines = lines.slice(i + 1, i + 3).join(' ')
        const nums = valueLines.match(/[0-9][0-9,]*(?:\.\d+)?/g)
        if (nums && nums.length >= 2) {
          if (!entryPrice) entryPrice = nums[0].replace(/,/g, '')
          if (!markPrice) markPrice = nums[1].replace(/,/g, '')
        }
        break
      }
    }
  }

  // Strategy 3: find standalone number lines (price-like, 3+ digits)
  if (!entryPrice || !markPrice) {
    const numLines = []
    for (const line of lines) {
      const c = line.replace(/[,\s]/g, '')
      if (/^\d+(\.\d+)?$/.test(c) && c.length >= 3) numLines.push(c)
    }
    if (numLines.length >= 2) {
      if (!entryPrice) entryPrice = numLines[0]
      if (!markPrice) markPrice = numLines[1]
    }
  }

  // Hold period — comprehensive parsing for all durations:
  // "11min", "2d 13h", "3h 45m", "45s", "1d", "2h", "13h 22min", "1day 5hr", etc
  // Also multi-language: "持仓时间", "보유기간", "Haltedauer", etc
  const holdTimeRe = /(\d+\s*(?:d(?:ay)?s?|天|일|日|дн?|gün|ngày|día?s?|dias?|tag[e]?|jour[s]?))?[\s,]*(\d+\s*(?:h(?:(?:ou)?rs?)?|时|시간?|時間?|ч(?:ас)?|saat|giờ|hora?s?|stunde[n]?|heure[s]?))?[\s,]*(\d+\s*(?:m(?:in(?:ute)?s?)?|分钟?|분|分|мин|dk|phút|minuto?s?|minute[n]?)?)?[\s,]*(\d+\s*(?:s(?:ec(?:ond)?s?)?|秒|초|秒|сек|sn|giây|segundo?s?|sekunde[n]?|seconde[s]?)?)?/i
  let holdPeriod = ''

  // Try labeled hold period first (multi-lang)
  for (let i = 0; i < lines.length; i++) {
    if (RE_HOLD_LABEL.test(lines[i])) {
      // Value on same line after label
      const after = lines[i].replace(RE_HOLD_LABEL, '').replace(/^[\s:]+/, '').trim()
      const candidate = after || (lines[i + 1] || '').trim()
      if (candidate) {
        const hm = candidate.match(holdTimeRe)
        if (hm && (hm[1] || hm[2] || hm[3] || hm[4])) {
          holdPeriod = [hm[1], hm[2], hm[3], hm[4]].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
          break
        }
        // Fallback: take raw text if it looks like a duration
        if (/\d/.test(candidate) && candidate.length < 30) { holdPeriod = candidate; break }
      }
    }
  }

  // Fallback: scan full text for duration patterns
  if (!holdPeriod) {
    // Match compound durations: "2d 13h", "3h 45m", "11min", "45s", "1d 5h 30m"
    const durationRe = /\b(\d+\s*(?:d(?:ay)?s?|天|일|日)\s*)?(\d+\s*(?:h(?:(?:ou)?rs?)?|时|시간?|時間?)\s*)?(\d+\s*(?:m(?:in(?:ute)?s?)?|分钟?|분|分)\s*)?(\d+\s*(?:s(?:ec(?:ond)?s?)?|秒|초|秒))?\b/gi
    let best = '', bestLen = 0
    let dm
    while ((dm = durationRe.exec(full)) !== null) {
      const parts = [dm[1], dm[2], dm[3], dm[4]].filter(Boolean)
      if (parts.length > 0) {
        const joined = parts.join(' ').replace(/\s+/g, ' ').trim()
        if (joined.length > bestLen) { best = joined; bestLen = joined.length }
      }
    }
    if (best) holdPeriod = best
  }

  // Ref code from URL
  const refMatch = full.match(/sodex\.com\/join\/([A-Z0-9]{3,})/i)
  const refCode = refMatch ? refMatch[1].toUpperCase() : ''

  return { symbol, side, leverage, pnlPct, entryPrice, markPrice, holdPeriod, refCode }
}

// ─── Progress steps ───
const STEPS = {
  ocr: 'Running OCR on image...',
  parse: 'Parsing input...',
  refcode_db: 'Looking up ref code in database...',
  refcode_api: 'Resolving ref code via Sodex API...',
  db_search: 'Searching position database...',
  positions: 'Fetching position history...',
  trades: 'Fetching trade fills...',
  balances: 'Fetching account balances...',
  analyze: 'Analyzing results...',
}

export default function LarpDetector({ wallet: parentWallet }) {
  const [input, setInput] = useState('')
  const [resolvedWallet, setResolvedWallet] = useState(null) // wallet resolved from ref code
  const [status, setStatus] = useState(STATUS.IDLE)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  // Progress
  const [progress, setProgress] = useState(0)
  const [stepLog, setStepLog] = useState([])
  // Image upload
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [ocrDone, setOcrDone] = useState(false)
  const fileRef = useRef(null)
  const dropRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [deepSearch, setDeepSearch] = useState(false)
  // Extracted / editable fields
  const [fields, setFields] = useState({
    symbol: '', side: '', leverage: '', pnlPct: '',
    entryPrice: '', markPrice: '', holdPeriod: '', refCode: '',
  })

  // Don't auto-fill input — it stays empty until user types

  const updateField = (key, val) => setFields(prev => ({ ...prev, [key]: val }))

  const addLog = useCallback((key, logStatus, detail) => {
    setStepLog(prev => {
      const entry = { key, label: STEPS[key] || key, status: logStatus, detail }
      const idx = prev.findIndex(s => s.key === key)
      if (idx >= 0) { const c = [...prev]; c[idx] = entry; return c }
      return [...prev, entry]
    })
  }, [])

  // ─── Image handling ───
  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return
    setImageFile(file)
    setOcrDone(false)
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target.result)
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        handleFile(item.getAsFile())
        return
      }
    }
  }, [handleFile])

  // Listen for paste globally
  useEffect(() => {
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [handlePaste])

  // ─── Run OCR ───
  const [ocrRunning, setOcrRunning] = useState(false)
  const runOcr = useCallback(async () => {
    if (!imageFile || ocrRunning) return
    setOcrRunning(true)
    setStepLog([])
    setProgress(5)
    addLog('ocr', 'active')

    try {
      // Load Tesseract.js purely from CDN — bypasses ALL Next.js webpack issues
      if (!window._tesseractLoaded) {
        setProgress(6)
        addLog('ocr', 'active', 'Loading OCR engine...')
        await new Promise((resolve, reject) => {
          if (window.Tesseract) { window._tesseractLoaded = true; resolve(); return }
          const s = document.createElement('script')
          s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
          s.onload = () => { window._tesseractLoaded = true; resolve() }
          s.onerror = () => reject(new Error('Failed to load OCR engine'))
          document.head.appendChild(s)
        })
      }
      setProgress(12)
      addLog('ocr', 'active', 'Running OCR...')

      const result = await window.Tesseract.recognize(imageFile, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text' && m.progress != null) {
            setProgress(12 + Math.round(m.progress * 18))
          }
        },
      })
      const text = result.data?.text
      if (!text) throw new Error('OCR returned empty text')

      console.log('[LarpDetector] Raw OCR text:', JSON.stringify(text))
      addLog('ocr', 'done', `${text.split('\n').filter(Boolean).length} lines extracted`)
      setProgress(35)

      // Parse
      const parsed = parseOcrText(text)
      console.log('[LarpDetector] Parsed fields:', parsed)
      setFields(prev => ({
        symbol: parsed.symbol || prev.symbol,
        side: parsed.side || prev.side,
        leverage: parsed.leverage || prev.leverage,
        pnlPct: parsed.pnlPct || prev.pnlPct,
        entryPrice: parsed.entryPrice || prev.entryPrice,
        markPrice: parsed.markPrice || prev.markPrice,
        holdPeriod: parsed.holdPeriod || prev.holdPeriod,
        refCode: parsed.refCode || prev.refCode,
      }))
      setOcrDone(true)
    } catch (err) {
      console.error('OCR error:', err)
      addLog('ocr', 'done', 'OCR failed \u2014 fill in fields manually')
      // Still show extracted fields form so user can fill manually
      setOcrDone(true)
    } finally {
      setOcrRunning(false)
    }
  }, [imageFile, ocrRunning, addLog, input])

  // Auto-run OCR when image is uploaded
  useEffect(() => {
    if (imageFile && !ocrDone && !ocrRunning) runOcr()
  }, [imageFile, ocrDone, ocrRunning, runOcr])

  // ─── Detection ───
  const handleDetect = useCallback(async () => {
    const raw = input.trim()
    const hasFields = fields.symbol || fields.entryPrice
    if (!raw && !hasFields && !imageFile) {
      setError('Upload a PnL card, or enter a wallet / ref code / link')
      return
    }

    setStatus(STATUS.LOADING)
    setError('')
    setResult(null)
    setResolvedWallet(null)
    setStepLog([])
    setProgress(5)

    try {
      // ─── Resolve wallet ───
      let wallet = null
      let resolvedRefCode = null
      let refSource = null
      const refFromFields = fields.refCode
      const effectiveInput = raw || refFromFields

      if (effectiveInput) {
        addLog('parse', 'active')
        setProgress(p => Math.max(p, 38))

        if (isWalletAddr(effectiveInput)) {
          wallet = effectiveInput.toLowerCase()
          addLog('parse', 'done', 'Wallet address detected')
          setProgress(p => Math.max(p, 42))
        } else {
          const refCode = extractRefCode(effectiveInput) || refFromFields
          if (refCode) {
            resolvedRefCode = refCode
            addLog('parse', 'done', `Ref code: ${refCode}`)
            setProgress(p => Math.max(p, 40))

            // DB lookup
            addLog('refcode_db', 'active')
            const { data: dnsRow } = await supabase
              .from('publicdns')
              .select('wallet_address')
              .ilike('ref_code', refCode)
              .maybeSingle()

            if (dnsRow?.wallet_address) {
              wallet = dnsRow.wallet_address.toLowerCase()
              refSource = 'database'
              setResolvedWallet(wallet)
              addLog('refcode_db', 'done', `Found: ${truncAddr(wallet)}`)
              addLog('refcode_api', 'skip', 'Skipped')
              setProgress(p => Math.max(p, 50))
            } else {
              addLog('refcode_db', 'done', 'Not found')
              setProgress(p => Math.max(p, 45))

              // Sodex API
              addLog('refcode_api', 'active')
              try {
                const res = await fetch(`/api/resolve-refcode?code=${encodeURIComponent(refCode)}`)
                const json = await res.json()
                if (json.wallet) {
                  wallet = json.wallet.toLowerCase()
                  refSource = 'sodex_api'
                  setResolvedWallet(wallet)
                  addLog('refcode_api', 'done', `Resolved: ${truncAddr(wallet)}`)
                } else {
                  addLog('refcode_api', 'done', 'Could not resolve')
                }
              } catch {
                addLog('refcode_api', 'done', 'API unreachable')
              }
              setProgress(p => Math.max(p, 50))
            }
          } else {
            addLog('parse', 'done', 'Trying as wallet')
            wallet = effectiveInput.toLowerCase()
          }
        }
      } else {
        addLog('parse', 'done', 'No wallet/ref code — using position data search')
      }

      // ─── Path A & B: wallet resolved → fetch live data ───
      if (wallet) {
        const searchLimit = deepSearch ? 5000 : 1000
        addLog('positions', 'active', deepSearch ? 'Deep search (5000)' : null)
        setProgress(p => Math.max(p, 55))

        // Fetch in pages if needed (API max per request is usually 100)
        let closedPositions = []
        let page = 0
        const pageSize = 100
        while (closedPositions.length < searchLimit) {
          const batch = await perpsPositionHistory(wallet, { limit: pageSize, startTime: undefined }).catch(() => [])
          const arr = Array.isArray(batch) ? batch : []
          if (arr.length === 0) break
          closedPositions = closedPositions.concat(arr)
          if (arr.length < pageSize) break // no more pages
          page++
          // Use last item's timestamp for next page
          const lastTs = arr[arr.length - 1]?.updatedAt ?? arr[arr.length - 1]?.closeTime ?? arr[arr.length - 1]?.timestamp
          if (!lastTs) break
          // Fetch older positions by setting endTime
          const olderBatch = await perpsPositionHistory(wallet, { limit: pageSize, endTime: lastTs }).catch(() => [])
          const olderArr = Array.isArray(olderBatch) ? olderBatch : []
          if (olderArr.length === 0) break
          // Dedupe by checking if we got same items
          const existingKeys = new Set(closedPositions.map(p => `${p.symbol}_${p.updatedAt ?? p.closeTime}`))
          const newItems = olderArr.filter(p => !existingKeys.has(`${p.symbol}_${p.updatedAt ?? p.closeTime}`))
          if (newItems.length === 0) break
          closedPositions = closedPositions.concat(newItems)
        }

        const openPos = await perpsPositions(wallet).catch(() => null)
        const currentPositions = openPos?.positions ?? (Array.isArray(openPos) ? openPos : [])
        addLog('positions', 'done', `${closedPositions.length} closed, ${currentPositions.length} open`)
        setProgress(p => Math.max(p, 65))

        addLog('trades', 'active')
        const trades = await perpsTrades(wallet, { limit: 100 }).catch(() => [])
        const tradeFills = Array.isArray(trades) ? trades : []
        addLog('trades', 'done', `${tradeFills.length} fills`)
        setProgress(p => Math.max(p, 75))

        addLog('balances', 'active')
        const balances = await perpsBalances(wallet).catch(() => null)
        const bal = balances?.balances?.[0] ?? (Array.isArray(balances) ? balances[0] : balances)
        const balTotal = parseFloat(bal?.total ?? bal?.equity ?? bal?.accountEquity ?? 0)
        addLog('balances', 'done', balTotal > 0 ? `Balance: $${fmt(balTotal)}` : 'No balance')
        setProgress(p => Math.max(p, 85))

        // Analyze
        addLog('analyze', 'active')
        const hasActivity = closedPositions.length > 0 || tradeFills.length > 0 || currentPositions.length > 0
        const matchedPosition = findMatch(closedPositions, currentPositions, fields)

        const analyzeDetail = matchedPosition
          ? 'Position matched!'
          : hasActivity
            ? `No exact match in ${closedPositions.length} positions`
            : 'No activity'
        addLog('analyze', 'done', analyzeDetail)
        setProgress(100)
        // Matched → legit, activity but no match → possible larp, no activity → larp
        setStatus(matchedPosition ? STATUS.LEGIT : hasActivity ? STATUS.POSSIBLE : STATUS.LARP)
        setResult({
          wallet, refCode: resolvedRefCode, refSource,
          closedPositions, tradeFills, currentPositions, balances: bal,
          matchedPosition, fields, dbMatches: null, deepSearch,
        })
        return
      }

      // Nothing usable — no wallet, no DB to search
      setStatus(STATUS.LARP)
      setResult({
        wallet: null, refCode: resolvedRefCode, refSource: null,
        closedPositions: [], tradeFills: [], currentPositions: [],
        balances: null, matchedPosition: null, fields, dbMatches: [],
      })
      addLog('analyze', 'done', 'No data to verify')
      setProgress(100)
    } catch (err) {
      setStatus(STATUS.ERROR)
      setError(err.message || 'Detection failed')
      setProgress(100)
    }
  }, [input, fields, imageFile, ocrDone, deepSearch, addLog])

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleDetect() }
  const isLoading = status === STATUS.LOADING

  // Share card + toast notifications
  const [showShare, setShowShare] = useState(false)
  const shareRef = useRef(null)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }, [])

  const scanUrl = useMemo(() => {
    if (!result?.wallet) return ''
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/tracker/${result.wallet}`
  }, [result?.wallet])

  // Strip border-radius + border during capture to avoid white corner bleed
  const captureCard = useCallback(async () => {
    const el = shareRef.current
    if (!el) return null
    const html2canvas = (await import('html2canvas')).default
    const prevRadius = el.style.borderRadius
    const prevBorder = el.style.border
    el.style.borderRadius = '0'
    el.style.border = 'none'
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: null, useCORS: true, logging: false })
    el.style.borderRadius = prevRadius
    el.style.border = prevBorder
    return canvas
  }, [])

  const handleShareDownload = useCallback(async () => {
    try {
      const canvas = await captureCard()
      if (!canvas) return
      const link = document.createElement('a')
      link.download = `larp-check-${result?.wallet ? truncAddr(result.wallet) : 'unknown'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      showToast('Image downloaded')
    } catch (err) { console.error('Share download failed:', err) }
  }, [result?.wallet, showToast, captureCard])

  const handleShareCopy = useCallback(async () => {
    try {
      const canvas = await captureCard()
      if (!canvas) return
      canvas.toBlob(async (blob) => {
        if (blob) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          showToast('Image copied to clipboard')
        }
      })
    } catch (err) { console.error('Share copy failed:', err) }
  }, [showToast, captureCard])

  const handleShareCopyLink = useCallback(() => {
    if (!scanUrl) return
    navigator.clipboard.writeText(scanUrl).then(() => {
      showToast('Link copied to clipboard')
    })
  }, [scanUrl, showToast])


  return (
    <div className="larp-detector">
      <div className="larp-detector-header">
        <h2 className="larp-detector-title">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 8 }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Larp Detector
        </h2>
        <p className="larp-detector-sub">Upload a PnL card screenshot, or paste a wallet / ref code / link</p>
      </div>

      {/* ─── Image upload ─── */}
      <div
        ref={dropRef}
        className={`larp-detector-dropzone${dragging ? ' larp-detector-dropzone-active' : ''}${imagePreview ? ' larp-detector-dropzone-has-image' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !imagePreview && fileRef.current?.click()}
      >
        {imagePreview ? (
          <div className="larp-detector-preview-wrap">
            <img src={imagePreview} alt="PnL card" className="larp-detector-preview-img" />
            <button
              className="larp-detector-preview-remove"
              onClick={(e) => {
                e.stopPropagation()
                setImageFile(null); setImagePreview(null); setOcrDone(false)
                setFields({ symbol: '', side: '', leverage: '', pnlPct: '', entryPrice: '', markPrice: '', holdPeriod: '', refCode: '' })
              }}
              title="Remove image"
            >&times;</button>
          </div>
        ) : (
          <div className="larp-detector-dropzone-inner">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span>Drop PnL card image, paste from clipboard, or click to upload</span>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {/* ─── Extracted fields (editable) ─── */}
      {ocrDone && (
        <div className="larp-detector-extracted">
          <div className="larp-detector-extracted-title">Extracted Data <span className="larp-detector-opt">edit if incorrect</span></div>
          <div className="larp-detector-fields-grid">
            <Field label="Symbol" value={fields.symbol} onChange={v => updateField('symbol', v)} placeholder="BTC-USD" />
            <Field label="Side" value={fields.side} onChange={v => updateField('side', v)} placeholder="Long / Short" />
            <Field label="Leverage" value={fields.leverage} onChange={v => updateField('leverage', v)} placeholder="25" />
            <Field label="Entry Price" value={fields.entryPrice} onChange={v => updateField('entryPrice', v)} placeholder="71454" />
            <Field label="Mark Price" value={fields.markPrice} onChange={v => updateField('markPrice', v)} placeholder="71873" />
            <Field label="PnL %" value={fields.pnlPct} onChange={v => updateField('pnlPct', v)} placeholder="+14.66" />
            <Field label="Hold Period" value={fields.holdPeriod} onChange={v => updateField('holdPeriod', v)} placeholder="11min" />
            <Field label="Ref Code" value={fields.refCode} onChange={v => updateField('refCode', v)} placeholder="DANTBRRS" />
          </div>
        </div>
      )}

      {/* Resolved wallet from ref code */}
      {resolvedWallet && (
        <div className="larp-detector-resolved">
          <span className="larp-detector-resolved-label">Resolved Wallet</span>
          <code className="larp-detector-resolved-addr">{resolvedWallet}</code>
        </div>
      )}

      {/* ─── Manual inputs ─── */}
      <div className="larp-detector-inputs">
        <div className="larp-detector-field">
          <label>Wallet / Ref Code / Link <span className="larp-detector-opt">override — leave empty to use image data</span></label>
          <input
            type="text"
            placeholder="0x... or REFCODE or sodex.com/join/CODE"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="larp-detector-input"
          />
        </div>
        <div className="larp-detector-btn-row">
          <button
            className="larp-detector-btn"
            onClick={handleDetect}
            disabled={isLoading}
            style={{ flex: 1 }}
          >
            {isLoading ? <span className="larp-detector-spinner" /> : 'Detect Larp'}
          </button>
          <label className="larp-detector-deep-toggle" title="Search up to 5000 positions instead of 1000">
            <input
              type="checkbox"
              checked={deepSearch}
              onChange={e => setDeepSearch(e.target.checked)}
            />
            Deep Search
          </label>
        </div>
      </div>

      {/* ─── Progress ─── */}
      {(isLoading || ocrRunning || (status !== STATUS.IDLE && stepLog.length > 0)) && (
        <div className={`larp-detector-progress-wrap${!isLoading && !ocrRunning ? ' larp-detector-progress-done' : ''}`}>
          {(isLoading || ocrRunning) && (
            <div className="larp-detector-progress-bar">
              <div className="larp-detector-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          )}
          <div className="larp-detector-progress-steps">
            {stepLog.map((s) => (
              <div key={s.key} className={`larp-detector-step larp-detector-step-${s.status}`}>
                <span className="larp-detector-step-icon">
                  {s.status === 'done' ? '\u2713' : s.status === 'skip' ? '\u2014' : ''}
                  {s.status === 'active' && <span className="larp-detector-spinner-sm" />}
                </span>
                <span className="larp-detector-step-label">{s.label}</span>
                {s.detail && <span className="larp-detector-step-detail">{s.detail}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div className="larp-detector-error">{error}</div>}

      {/* ─── LARP verdict ─── */}
      {status === STATUS.LARP && result && (
        <div className="larp-detector-result larp-detector-result-larp">
          <div className="larp-detector-verdict">
            <span className="larp-detector-verdict-icon larp-detector-verdict-icon-larp">!</span>
            <span className="larp-detector-verdict-text larp-red">LARP DETECTED</span>
          </div>
          {result.wallet ? (
            <p className="larp-detector-verdict-detail">
              No trade history found for <code>{truncAddr(result.wallet)}</code>.
              This wallet has never opened a position on SoDEX.
            </p>
          ) : result.refCode ? (
            <p className="larp-detector-verdict-detail">
              Ref code <code>{result.refCode}</code> could not be resolved to any wallet address.
            </p>
          ) : (
            <p className="larp-detector-verdict-detail">
              No matching positions found in the database for the extracted card data.
            </p>
          )}
          {result.fields?.pnlPct && (
            <p className="larp-detector-verdict-detail">
              Claimed {result.fields.pnlPct}% on {result.fields.symbol || 'unknown'} {result.fields.side ? `(${result.fields.side} ${result.fields.leverage}x)` : ''} \u2014 no evidence found.
            </p>
          )}
        </div>
      )}

      {/* ─── POSSIBLE LARP verdict (activity but no match) ─── */}
      {status === STATUS.POSSIBLE && result && (
        <div className="larp-detector-result larp-detector-result-possible">
          <div className="larp-detector-verdict">
            <span className="larp-detector-verdict-icon larp-detector-verdict-icon-possible">?</span>
            <span className="larp-detector-verdict-text larp-yellow">POSSIBLE LARP</span>
          </div>
          <p className="larp-detector-verdict-detail">
            Wallet <code>{truncAddr(result.wallet)}</code> has trading activity, but no position matches the card data.
            Searched {result.closedPositions.length} closed + {result.currentPositions.length} open positions{result.deepSearch ? ' (deep search)' : ''}.
          </p>
          {result.fields?.pnlPct && (
            <p className="larp-detector-verdict-detail">
              Claimed {result.fields.pnlPct}% on {result.fields.symbol || 'unknown'} {result.fields.side ? `(${result.fields.side} ${result.fields.leverage}x)` : ''} — no exact match on entry price, side &amp; leverage.
            </p>
          )}

          {/* Summary stats (wallet path) */}
          {result.wallet && (
            <div className="larp-detector-stats">
              <div className="larp-detector-stat">
                <span className="larp-detector-stat-label">Open Positions</span>
                <span className="larp-detector-stat-value">{result.currentPositions.length}</span>
              </div>
              <div className="larp-detector-stat">
                <span className="larp-detector-stat-label">Closed Positions</span>
                <span className="larp-detector-stat-value">{result.closedPositions.length}</span>
              </div>
              <div className="larp-detector-stat">
                <span className="larp-detector-stat-label">Trade Fills</span>
                <span className="larp-detector-stat-value">{result.tradeFills.length}</span>
              </div>
              {result.balances && (
                <div className="larp-detector-stat">
                  <span className="larp-detector-stat-label">Account Equity</span>
                  <span className="larp-detector-stat-value">${fmt(result.balances.total ?? result.balances.equity ?? result.balances.accountEquity)}</span>
                </div>
              )}
            </div>
          )}

          {/* Recent closed positions */}
          {result.closedPositions.length > 0 && (
            <div className="larp-detector-section">
              <h4>Recent Closed Positions (up to 10)</h4>
              <div className="larp-detector-table-wrap">
                <table className="larp-detector-table larp-detector-table-full">
                  <thead><tr><th>Symbol</th><th>Side</th><th>Entry</th><th>Exit</th><th>PnL</th><th>Closed</th></tr></thead>
                  <tbody>
                    {result.closedPositions.slice(0, 10).map((p, i) => {
                      const pnl = parseFloat(posField(p, 'pnl'))
                      const side = inferSide(p)
                      return (
                        <tr key={i}>
                          <td>{p.symbol}</td>
                          <td className={normalizeSide(side) === 'LONG' ? 'larp-green' : 'larp-red'}>{side || '\u2014'}</td>
                          <td>${fmt(posField(p, 'entry'))}</td>
                          <td>${fmt(posField(p, 'exit'))}</td>
                          <td className={pnl >= 0 ? 'larp-green' : 'larp-red'}>{fmtSign(pnl)}</td>
                          <td>{tsToDate(posField(p, 'time'))}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Open positions */}
          {result.currentPositions.length > 0 && (
            <div className="larp-detector-section">
              <h4>Current Open Positions</h4>
              <div className="larp-detector-table-wrap">
                <table className="larp-detector-table larp-detector-table-full">
                  <thead><tr><th>Symbol</th><th>Side</th><th>Entry</th><th>Mark</th><th>uPnL</th><th>Lev</th></tr></thead>
                  <tbody>
                    {result.currentPositions.map((p, i) => {
                      const pnl = parseFloat(p.unrealizedProfit ?? p.unRealizedProfit ?? 0)
                      const side = inferSide(p)
                      return (
                        <tr key={i}>
                          <td>{p.symbol}</td>
                          <td className={normalizeSide(side) === 'LONG' ? 'larp-green' : 'larp-red'}>{side || '\u2014'}</td>
                          <td>${fmt(posField(p, 'entry'))}</td>
                          <td>${fmt(p.markPrice ?? p.price)}</td>
                          <td className={pnl >= 0 ? 'larp-green' : 'larp-red'}>{fmtSign(pnl)}</td>
                          <td>{p.leverage ?? '\u2014'}x</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── LEGIT verdict (position matched) ─── */}
      {status === STATUS.LEGIT && result && (
        <div className="larp-detector-result larp-detector-result-legit">
          <div className="larp-detector-verdict">
            <span className="larp-detector-verdict-icon larp-detector-verdict-icon-legit">{'\u2713'}</span>
            <span className="larp-detector-verdict-text larp-green">NO LARP DETECTED</span>
          </div>
          {result.wallet && (
            <p className="larp-detector-verdict-detail">
              Wallet <code>{truncAddr(result.wallet)}</code> has real trading activity on SoDEX.
              {result.refCode && (
                <> Ref code <code>{result.refCode}</code> resolved via {result.refSource === 'database' ? 'local DB' : 'Sodex API'}.</>
              )}
            </p>
          )}
          {result.matchedPosition && (
            <div className="larp-detector-match">
              <h4>Matched Position</h4>
              <PositionDetail pos={result.matchedPosition} />
            </div>
          )}
          {result.matchedPosition && result.wallet && (
            <button className="larp-detector-share-btn" onClick={() => setShowShare(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              Share Proof
            </button>
          )}
          {showShare && result.matchedPosition && (
            <ShareCard
              ref={shareRef}
              imagePreview={imagePreview}
              pos={result.matchedPosition}
              wallet={result.wallet}
              scanUrl={scanUrl}
              verified={true}
              onClose={() => setShowShare(false)}
              onDownload={handleShareDownload}
              onCopy={handleShareCopy}
              onCopyLink={handleShareCopyLink}
            />
          )}

          {/* DB matches from backup search */}
          {result.dbMatches && result.dbMatches.length > 0 && (
            <div className="larp-detector-section">
              <h4>Matching Positions Found in Database</h4>
              <div className="larp-detector-table-wrap">
                <table className="larp-detector-table larp-detector-table-full">
                  <thead>
                    <tr><th>Wallet</th><th>Symbol</th><th>Side</th><th>Entry</th><th>Exit/Mark</th><th>PnL</th><th>Source</th></tr>
                  </thead>
                  <tbody>
                    {result.dbMatches.map((m, i) => {
                      const pnl = parseFloat(m.pnl ?? m.unrealized_pnl ?? 0)
                      return (
                        <tr key={i}>
                          <td><code>{m._wallet ? truncAddr(m._wallet) : m.account_id?.slice(0, 8)}</code></td>
                          <td>{m.symbol}</td>
                          <td className={m.side === 'BUY' || m.side === 'LONG' ? 'larp-green' : 'larp-red'}>{m.side}</td>
                          <td>${fmt(m.entry_price)}</td>
                          <td>${fmt(m.exit_price ?? m.current_price)}</td>
                          <td className={pnl >= 0 ? 'larp-green' : 'larp-red'}>{fmtSign(pnl)}</td>
                          <td className="larp-detector-source-tag">{m._source === 'open_positions' ? 'Open' : 'Closed'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className="larp-detector-toast" key={toast}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          {toast}
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───

function Field({ label, value, onChange, placeholder }) {
  return (
    <div className="larp-detector-efield">
      <label>{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="larp-detector-input larp-detector-input-sm"
      />
    </div>
  )
}

function PositionDetail({ pos }) {
  const isOpen = pos._isOpen
  const pnl = parseFloat(posField(pos, 'pnl'))
  const side = inferSide(pos)
  const entry = parseFloat(posField(pos, 'entry'))
  const exit = parseFloat(isOpen ? (pos.markPrice ?? pos.price ?? 0) : posField(pos, 'exit'))
  const margin = parseFloat(pos.initialMargin ?? pos.margin ?? 0)
  const lev = parseFloat(pos.leverage ?? 1)
  let pnlPct = 0
  if (margin > 0) { pnlPct = (pnl / margin) * 100 }
  else if (entry > 0 && exit > 0) {
    const dir = normalizeSide(side) === 'SHORT' ? -1 : 1
    pnlPct = ((exit - entry) / entry) * dir * lev * 100
  }
  return (
    <table className="larp-detector-table">
      <tbody>
        <tr><td>Symbol</td><td>{pos.symbol}</td></tr>
        <tr><td>Side</td><td className={normalizeSide(side) === 'LONG' ? 'larp-green' : 'larp-red'}>{side || '\u2014'}</td></tr>
        <tr><td>Entry Price</td><td>${fmt(entry)}</td></tr>
        {isOpen
          ? <tr><td>Mark Price</td><td>${fmt(exit)}</td></tr>
          : <tr><td>Exit Price</td><td>${fmt(exit)}</td></tr>
        }
        <tr><td>Size</td><td>{fmt(posField(pos, 'size'), 4)}</td></tr>
        <tr><td>Leverage</td><td>{pos.leverage ?? '\u2014'}x</td></tr>
        <tr><td>PnL</td><td className={pnl >= 0 ? 'larp-green' : 'larp-red'}>{fmtSign(pnl)} <span style={{ fontSize: '0.85em', opacity: 0.7 }}>({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)</span></td></tr>
        <tr><td>Status</td><td>{isOpen ? 'Open' : 'Closed'}</td></tr>
      </tbody>
    </table>
  )
}

// ─── Field extraction helpers (Sodex API has inconsistent field names) ───

function posField(pos, type) {
  switch (type) {
    case 'entry': return pos.avgEntryPrice ?? pos.entryPrice ?? 0
    case 'exit': return pos.avgClosePrice ?? pos.closePrice ?? pos.exitPrice ?? pos.avgExitPrice ?? 0
    case 'pnl': return pos.realizedPnL ?? pos.realizedPnl ?? pos.pnl ?? pos.unrealizedProfit ?? pos.unRealizedProfit ?? 0
    case 'side': return pos.positionSide ?? pos.side ?? ''
    case 'size': {
      const raw = pos.size ?? pos.positionAmt ?? pos.positionAmount ?? pos.qty ?? pos.origQty ?? 0
      if (parseFloat(raw)) return raw
      // Fallback: compute from margin × leverage
      const margin = parseFloat(pos.initialMargin ?? pos.margin ?? 0)
      const lev = parseFloat(pos.leverage ?? 1)
      const entry = parseFloat(pos.avgEntryPrice ?? pos.entryPrice ?? 0)
      if (margin && entry) return (margin * lev / entry).toFixed(6)
      if (pos.maxNotionalValue) return pos.maxNotionalValue
      return 0
    }
    case 'time': return pos.updatedAt ?? pos.closeTime ?? pos.timestamp ?? pos.time ?? null
    default: return 0
  }
}

// ─── Matching helpers ───

function normalizeSymbol(sym) {
  if (!sym) return ''
  // "BTC-USD" → "BTC", "BTCUSDT" → "BTC"
  return sym.replace(/[-\/](USD[T]?|PERP)$/i, '').replace(/(USD[T]?)$/i, '').toUpperCase()
}

function normalizeSide(s) {
  if (!s) return ''
  const u = s.toUpperCase().trim()
  if (u === 'LONG' || u === 'BUY') return 'LONG'
  if (u === 'SHORT' || u === 'SELL') return 'SHORT'
  // Sodex one-way mode returns "BOTH" — infer from PnL + price direction
  if (u === 'BOTH') return ''
  return u
}

// Infer side from position data when API returns "BOTH"
function inferSide(pos) {
  const raw = posField(pos, 'side')
  const normalized = normalizeSide(raw)
  if (normalized) return normalized
  // "BOTH" or empty — infer from entry vs exit/mark
  const entry = parseFloat(posField(pos, 'entry'))
  const exit = parseFloat(posField(pos, 'exit') || pos.markPrice || pos.price || 0)
  const pnl = parseFloat(posField(pos, 'pnl'))
  if (entry && exit && entry !== exit) {
    return (exit > entry) === (pnl >= 0) ? 'LONG' : 'SHORT'
  }
  if (pnl > 0 && exit > entry) return 'LONG'
  if (pnl > 0 && exit < entry) return 'SHORT'
  return raw || ''
}

function findMatch(closedPositions, currentPositions, fields) {
  if (!fields.entryPrice && !fields.symbol) return null
  const sym = normalizeSymbol(fields.symbol)
  const entry = parseFloat(fields.entryPrice)
  const side = normalizeSide(fields.side)
  const lev = fields.leverage ? parseInt(fields.leverage) : null

  const check = (pos) => {
    const posSym = normalizeSymbol(pos.symbol)
    const posEntry = parseFloat(posField(pos, 'entry'))
    const posSide = normalizeSide(inferSide(pos))
    const posLev = parseInt(pos.leverage) || null

    // Symbol must match
    if (sym && !posSym.includes(sym)) return false
    // Entry price must match exactly (truncated to integer for comparison)
    if (!isNaN(entry) && Math.trunc(posEntry) !== Math.trunc(entry)) return false
    // Side must match
    if (side && posSide !== side) return false
    // Leverage must match
    if (lev && posLev && posLev !== lev) return false

    return true
  }

  for (const pos of closedPositions) {
    if (check(pos)) return pos
  }
  for (const pos of currentPositions) {
    if (check(pos)) return { ...pos, _isOpen: true }
  }
  return null
}

// ─── Real QR Code (canvas-based, black on white, favicon center) ───
function QrCodeImg({ text, size = 80 }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    if (!canvasRef.current || !text) return
    import('qrcode').then((QRCode) => {
      QRCode.toCanvas(canvasRef.current, text, {
        width: size,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'H',
      }, (err) => {
        if (err) return
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        // Actual rendered size (library controls this)
        const w = canvas.width
        const h = canvas.height
        // Draw favicon in center — keep icon small (18%) to preserve scannability
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          const iconSize = Math.round(Math.min(w, h) * 0.18)
          const x = Math.round((w - iconSize) / 2)
          const y = Math.round((h - iconSize) / 2)
          ctx.beginPath()
          ctx.arc(w / 2, h / 2, iconSize * 0.72, 0, Math.PI * 2)
          ctx.fillStyle = '#ffffff'
          ctx.fill()
          ctx.drawImage(img, x, y, iconSize, iconSize)
        }
        img.src = '/favicon-green.svg'
      })
    }).catch(() => {})
  }, [text, size])
  // Don't set width/height attrs — let the qrcode library control canvas size
  return <canvas ref={canvasRef} style={{ width: size, height: size, display: 'block', borderRadius: 8 }} className="larp-detector-qr-canvas" />
}

// ─── Share card ───
const ShareCard = React.forwardRef(function ShareCard({ imagePreview, pos, wallet, scanUrl, verified, onClose, onDownload, onCopy, onCopyLink }, ref) {
  const side = inferSide(pos)
  const pnl = parseFloat(posField(pos, 'pnl'))
  const entry = parseFloat(posField(pos, 'entry'))
  const exit = parseFloat(pos._isOpen ? (pos.markPrice ?? pos.price ?? 0) : posField(pos, 'exit'))
  const margin = parseFloat(pos.initialMargin ?? pos.margin ?? 0)
  const lev = parseFloat(pos.leverage ?? 1)
  // PnL % — compute ROE from PnL / margin, or from price diff × leverage
  let pnlPct = 0
  if (margin > 0) {
    pnlPct = (pnl / margin) * 100
  } else if (entry > 0 && exit > 0) {
    const dir = normalizeSide(side) === 'SHORT' ? -1 : 1
    pnlPct = ((exit - entry) / entry) * dir * lev * 100
  }
  const logoSrc = verified ? '/logo-green.svg' : '/logo-orange.svg'
  const badgeColor = verified ? '#18B36B' : '#F24237'
  const badgeText = verified ? 'VERIFIED' : 'NOT VERIFIED'
  const badgeIcon = verified ? '\u2713' : '!'

  return (
    <>
      <div className="larp-share-overlay" onClick={onClose} />
      <div className="larp-share-modal larp-detector-share-modal">
        <button className="larp-share-close" onClick={onClose} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>

        {/* Rendered card for capture */}
        <div className="larp-detector-share-card" ref={ref}>
          <div className="larp-detector-share-card-inner">
            {/* Header */}
            <div className="larp-detector-share-header">
              <img src={logoSrc} alt="CommunityScan" className="larp-detector-share-logo" crossOrigin="anonymous" />
              <div className="larp-detector-share-badge" style={{ borderColor: `${badgeColor}44`, background: `${badgeColor}18`, color: badgeColor }}>
                <span className="larp-detector-share-badge-icon">{badgeIcon}</span>
                {badgeText}
              </div>
            </div>

            {/* Body: image left, data right — image matches data height */}
            <div className="larp-detector-share-body">
              {imagePreview && (
                <div className="larp-detector-share-img-col">
                  <img src={imagePreview} alt="PnL card" className="larp-detector-share-pnl-img" />
                </div>
              )}
              <div className="larp-detector-share-data-col">
                <div className="larp-detector-share-row"><span className="larp-detector-share-label">Symbol</span><span>{pos.symbol}</span></div>
                <div className="larp-detector-share-row"><span className="larp-detector-share-label">Side</span><span className={normalizeSide(side) === 'LONG' ? 'larp-green' : 'larp-red'}>{side || '\u2014'}</span></div>
                <div className="larp-detector-share-row"><span className="larp-detector-share-label">Entry</span><span>${fmt(entry)}</span></div>
                <div className="larp-detector-share-row"><span className="larp-detector-share-label">{pos._isOpen ? 'Mark' : 'Exit'}</span><span>${fmt(exit)}</span></div>
                <div className="larp-detector-share-row"><span className="larp-detector-share-label">Leverage</span><span>{pos.leverage ?? '\u2014'}x</span></div>
                <div className="larp-detector-share-row"><span className="larp-detector-share-label">PnL</span><span className={pnl >= 0 ? 'larp-green' : 'larp-red'}>{fmtSign(pnl)} <span className="larp-detector-share-pct">({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)</span></span></div>
                <div className="larp-detector-share-row"><span className="larp-detector-share-label">Size</span><span>{fmt(posField(pos, 'size'), 4)}</span></div>
              </div>
            </div>

            {/* Footer: wallet link + QR */}
            <div className="larp-detector-share-footer">
              <div className="larp-detector-share-footer-left">
                <div className="larp-detector-share-wallet"><span className="larp-detector-share-label">Wallet</span><code>{wallet}</code></div>
                <div className="larp-detector-share-scan-url">{scanUrl}</div>
              </div>
              <div className="larp-detector-share-qr">
                <QrCodeImg text={scanUrl || wallet} size={72} />
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="larp-detector-share-actions">
          <button className="larp-detector-btn larp-detector-share-action-btn" onClick={onDownload}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download
          </button>
          <button className="larp-detector-btn larp-detector-share-action-btn" onClick={onCopy}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            Copy Image
          </button>
          <button className="larp-detector-btn larp-detector-share-action-btn" onClick={onCopyLink}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
            Copy Link
          </button>
        </div>
      </div>
    </>
  )
})
