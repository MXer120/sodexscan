'use client'
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import {
  Search, Upload, X, Check, AlertTriangle, AlertCircle, Image as ImageIcon,
  Download, Copy as CopyIcon, Link as LinkIcon, Loader2,
} from 'lucide-react'
import { cn } from '@/app/lib/utils'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Checkbox } from '@/app/components/ui/checkbox'
import { perpsPositionHistory, perpsTrades, perpsBalances, perpsPositions } from '../../lib/sodexApi'
import { supabase } from '../../lib/supabaseClient'

declare global {
  interface Window {
    Tesseract: any
    _tesseractLoaded: boolean
  }
}

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
  if (!ms) return '—'
  const d = new Date(typeof ms === 'string' ? ms : Number(ms))
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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

  const symMatch = full.match(/\b([A-Z]{2,10})\s*[-\/]\s*(USD[T]?)\b/i)
    || full.match(/\b([A-Z]{2,10})(USDT?)\b/i)
  const symbol = symMatch ? `${symMatch[1].toUpperCase()}-${symMatch[2].toUpperCase()}` : ''

  let side = '', leverage = ''

  const cleaned = full
    .replace(/[|]/g, '')
    .replace(/​/g, '')
    .replace(/\s{2,}/g, ' ')

  const longWords = LANG_LABELS.long.join('|')
  const shortWords = LANG_LABELS.short.join('|')
  const allSideWords = `${longWords}|${shortWords}`

  const sidePatterns = [
    new RegExp(`\\b(${allSideWords})\\s*(\\d{1,4})\\s*[xX×]\\b`, 'i'),
    new RegExp(`(${allSideWords})(\\d{1,4})[xX×]`, 'i'),
    new RegExp(`(${allSideWords})[.\\s]*(\\d{1,4})\\s*[xX×]`, 'i'),
    /(L\s*o\s*n\s*g|S\s*h\s*o\s*r\s*t)\s*(\d{1,4})\s*[xX×]/i,
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

  const pnlMatch = full.match(/([+-]?\d+[.,]\d+)\s*%/)
  const pnlPct = pnlMatch ? pnlMatch[1].replace(',', '.') : ''

  let entryPrice = '', markPrice = ''

  const entryRe = new RegExp(`(?:${LANG_LABELS.entry.join('|')})\\s*[:\\s]*([0-9][0-9,]*(?:\\.\\d+)?)`, 'i')
  const markRe = new RegExp(`(?:${LANG_LABELS.mark.join('|')})\\s*[:\\s]*([0-9][0-9,]*(?:\\.\\d+)?)`, 'i')
  const entryInline = full.match(entryRe)
  if (entryInline) entryPrice = entryInline[1].replace(/,/g, '')
  const markInline = full.match(markRe)
  if (markInline) markPrice = markInline[1].replace(/,/g, '')

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

  const holdTimeRe = /(\d+\s*(?:d(?:ay)?s?|天|일|日|дн?|gün|ngày|día?s?|dias?|tag[e]?|jour[s]?))?[\s,]*(\d+\s*(?:h(?:(?:ou)?rs?)?|时|시간?|時間?|ч(?:ас)?|saat|giờ|hora?s?|stunde[n]?|heure[s]?))?[\s,]*(\d+\s*(?:m(?:in(?:ute)?s?)?|分钟?|분|分|мин|dk|phút|minuto?s?|minute[n]?)?)?[\s,]*(\d+\s*(?:s(?:ec(?:ond)?s?)?|秒|초|秒|сек|sn|giây|segundo?s?|sekunde[n]?|seconde[s]?)?)?/i
  let holdPeriod = ''

  for (let i = 0; i < lines.length; i++) {
    if (RE_HOLD_LABEL.test(lines[i])) {
      const after = lines[i].replace(RE_HOLD_LABEL, '').replace(/^[\s:]+/, '').trim()
      const candidate = after || (lines[i + 1] || '').trim()
      if (candidate) {
        const hm = candidate.match(holdTimeRe)
        if (hm && (hm[1] || hm[2] || hm[3] || hm[4])) {
          holdPeriod = [hm[1], hm[2], hm[3], hm[4]].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
          break
        }
        if (/\d/.test(candidate) && candidate.length < 30) { holdPeriod = candidate; break }
      }
    }
  }

  if (!holdPeriod) {
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
  const [resolvedWallet, setResolvedWallet] = useState(null)
  const [status, setStatus] = useState(STATUS.IDLE)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [stepLog, setStepLog] = useState([])
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [ocrDone, setOcrDone] = useState(false)
  const fileRef = useRef(null)
  const dropRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [deepSearch, setDeepSearch] = useState(false)
  const [fields, setFields] = useState({
    symbol: '', side: '', leverage: '', pnlPct: '',
    entryPrice: '', markPrice: '', holdPeriod: '', refCode: '',
  })

  const updateField = (key, val) => setFields(prev => ({ ...prev, [key]: val }))

  const addLog = useCallback((key, logStatus, detail?) => {
    setStepLog(prev => {
      const entry = { key, label: STEPS[key] || key, status: logStatus, detail }
      const idx = prev.findIndex(s => s.key === key)
      if (idx >= 0) { const c = [...prev]; c[idx] = entry; return c }
      return [...prev, entry]
    })
  }, [])

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

  useEffect(() => {
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [handlePaste])

  const [ocrRunning, setOcrRunning] = useState(false)
  const runOcr = useCallback(async () => {
    if (!imageFile || ocrRunning) return
    setOcrRunning(true)
    setStepLog([])
    setProgress(5)
    addLog('ocr', 'active')

    try {
      if (!window._tesseractLoaded) {
        setProgress(6)
        addLog('ocr', 'active', 'Loading OCR engine...')
        await new Promise<void>((resolve, reject) => {
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

      addLog('ocr', 'done', `${text.split('\n').filter(Boolean).length} lines extracted`)
      setProgress(35)

      const parsed = parseOcrText(text)
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
      addLog('ocr', 'done', 'OCR failed — fill in fields manually')
      setOcrDone(true)
    } finally {
      setOcrRunning(false)
    }
  }, [imageFile, ocrRunning, addLog, input])

  useEffect(() => {
    if (imageFile && !ocrDone && !ocrRunning) runOcr()
  }, [imageFile, ocrDone, ocrRunning, runOcr])

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

      if (wallet) {
        const searchLimit = deepSearch ? 5000 : 1000
        addLog('positions', 'active', deepSearch ? 'Deep search (5000)' : null)
        setProgress(p => Math.max(p, 55))

        let closedPositions = []
        const pageSize = 100
        while (closedPositions.length < searchLimit) {
          const batch = await perpsPositionHistory(wallet, { limit: pageSize }).catch(() => [])
          const arr = Array.isArray(batch) ? batch : []
          if (arr.length === 0) break
          closedPositions = closedPositions.concat(arr)
          if (arr.length < pageSize) break
          const lastTs = arr[arr.length - 1]?.updatedAt ?? arr[arr.length - 1]?.closeTime ?? arr[arr.length - 1]?.timestamp
          if (!lastTs) break
          const olderBatch = await perpsPositionHistory(wallet, { limit: pageSize, endTime: lastTs }).catch(() => [])
          const olderArr = Array.isArray(olderBatch) ? olderBatch : []
          if (olderArr.length === 0) break
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
        setStatus(matchedPosition ? STATUS.LEGIT : hasActivity ? STATUS.POSSIBLE : STATUS.LARP)
        setResult({
          wallet, refCode: resolvedRefCode, refSource,
          closedPositions, tradeFills, currentPositions, balances: bal,
          matchedPosition, fields, dbMatches: null, deepSearch,
        })
        return
      }

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
    <div className="space-y-4">
      {/* Drop zone (card) */}
      <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
        <div
          ref={dropRef}
          className={cn(
            'rounded-lg border-2 border-dashed transition-colors cursor-pointer',
            dragging
              ? 'border-primary bg-primary/5'
              : imagePreview
                ? 'border-border bg-muted/30'
                : 'border-border bg-muted/30 hover:border-primary/50',
          )}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !imagePreview && fileRef.current?.click()}
        >
          {imagePreview ? (
            <div className="relative p-4">
              <img
                src={imagePreview}
                alt="PnL card"
                className="max-h-64 mx-auto rounded-md"
              />
              <Button
                variant="outline"
                size="icon-sm"
                className="absolute top-2 right-2"
                onClick={(e) => {
                  e.stopPropagation()
                  setImageFile(null); setImagePreview(null); setOcrDone(false)
                  setFields({ symbol: '', side: '', leverage: '', pnlPct: '', entryPrice: '', markPrice: '', holdPeriod: '', refCode: '' })
                }}
                title="Remove image"
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <ImageIcon className="size-8" />
              <span className="text-sm">Drop PnL card image, paste from clipboard, or click to upload</span>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>

        {/* Extracted fields */}
        {ocrDone && (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-foreground">
              Extracted Data <span className="text-xs font-normal text-muted-foreground">edit if incorrect</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

        {/* Resolved wallet */}
        {resolvedWallet && (
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border">
            <span className="text-xs text-muted-foreground">Resolved Wallet</span>
            <code className="text-xs font-mono text-foreground">{resolvedWallet}</code>
          </div>
        )}

        {/* Manual inputs */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Wallet / Ref Code / Link
            <span className="block text-xs font-normal text-muted-foreground">override — leave empty to use image data</span>
          </label>
          <Input
            type="text"
            placeholder="0x... or REFCODE or sodex.com/join/CODE"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
            <Button
              onClick={handleDetect}
              disabled={isLoading}
              className="w-full sm:w-auto sm:flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Detecting…
                </>
              ) : (
                <>
                  <Search className="size-4 mr-2" />
                  Detect Larp
                </>
              )}
            </Button>
            <label
              className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none"
              title="Search up to 5000 positions instead of 1000"
            >
              <Checkbox
                checked={deepSearch}
                onCheckedChange={(v) => setDeepSearch(!!v)}
              />
              Deep Search
            </label>
          </div>
        </div>
      </div>

      {/* Progress */}
      {(isLoading || ocrRunning || (status !== STATUS.IDLE && stepLog.length > 0)) && (
        <div className="rounded-xl border bg-card p-4 sm:p-5 space-y-3">
          {(isLoading || ocrRunning) && (
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          <div className="space-y-1">
            {stepLog.map((s) => (
              <div
                key={s.key}
                className={cn(
                  'flex items-center gap-2 text-xs transition-opacity',
                  s.status === 'active' && 'text-foreground',
                  s.status === 'done' && 'text-muted-foreground',
                  s.status === 'skip' && 'text-muted-foreground/60',
                )}
              >
                <span className="size-4 inline-flex items-center justify-center flex-shrink-0">
                  {s.status === 'done' && <Check className="size-3 text-emerald-500" />}
                  {s.status === 'skip' && <span className="text-muted-foreground">—</span>}
                  {s.status === 'active' && <Loader2 className="size-3 animate-spin text-primary" />}
                </span>
                <span>{s.label}</span>
                {s.detail && <span className="text-muted-foreground">— {s.detail}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="size-4" />
          {error}
        </div>
      )}

      {/* LARP verdict */}
      {status === STATUS.LARP && result && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5 space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="size-9 rounded-full bg-red-500/15 inline-flex items-center justify-center">
              <AlertCircle className="size-5 text-red-500" />
            </span>
            <span className="text-lg font-bold text-red-500">LARP DETECTED</span>
          </div>
          {result.wallet ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              No trade history found for <code className="text-foreground">{truncAddr(result.wallet)}</code>.
              This wallet has never opened a position on SoDEX.
            </p>
          ) : result.refCode ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ref code <code className="text-foreground">{result.refCode}</code> could not be resolved to any wallet address.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              No matching positions found in the database for the extracted card data.
            </p>
          )}
          {result.fields?.pnlPct && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              Claimed {result.fields.pnlPct}% on {result.fields.symbol || 'unknown'}
              {result.fields.side ? ` (${result.fields.side} ${result.fields.leverage}x)` : ''} — no evidence found.
            </p>
          )}
        </div>
      )}

      {/* POSSIBLE LARP verdict */}
      {status === STATUS.POSSIBLE && result && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="size-9 rounded-full bg-amber-500/15 inline-flex items-center justify-center">
              <AlertTriangle className="size-5 text-amber-500" />
            </span>
            <span className="text-lg font-bold text-amber-500">POSSIBLE LARP</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Wallet <code className="text-foreground">{truncAddr(result.wallet)}</code> has trading activity, but no position matches the card data.
            Searched {result.closedPositions.length} closed + {result.currentPositions.length} open positions{result.deepSearch ? ' (deep search)' : ''}.
          </p>
          {result.fields?.pnlPct && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              Claimed {result.fields.pnlPct}% on {result.fields.symbol || 'unknown'}
              {result.fields.side ? ` (${result.fields.side} ${result.fields.leverage}x)` : ''} — no exact match on entry price, side &amp; leverage.
            </p>
          )}

          {result.wallet && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <Stat label="Open Positions" value={result.currentPositions.length} />
              <Stat label="Closed Positions" value={result.closedPositions.length} />
              <Stat label="Trade Fills" value={result.tradeFills.length} />
              {result.balances && (
                <Stat
                  label="Account Equity"
                  value={`$${fmt(result.balances.total ?? result.balances.equity ?? result.balances.accountEquity)}`}
                />
              )}
            </div>
          )}

          {result.closedPositions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground mt-2">Recent Closed Positions (up to 10)</h4>
              <PositionsList rows={result.closedPositions.slice(0, 10)} kind="closed" />
            </div>
          )}

          {result.currentPositions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground mt-2">Current Open Positions</h4>
              <PositionsList rows={result.currentPositions} kind="open" />
            </div>
          )}
        </div>
      )}

      {/* LEGIT verdict */}
      {status === STATUS.LEGIT && result && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="size-9 rounded-full bg-emerald-500/15 inline-flex items-center justify-center">
              <Check className="size-5 text-emerald-500" />
            </span>
            <span className="text-lg font-bold text-emerald-500">NO LARP DETECTED</span>
          </div>
          {result.wallet && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              Wallet <code className="text-foreground">{truncAddr(result.wallet)}</code> has real trading activity on SoDEX.
              {result.refCode && (
                <> Ref code <code className="text-foreground">{result.refCode}</code> resolved via {result.refSource === 'database' ? 'local DB' : 'Sodex API'}.</>
              )}
            </p>
          )}
          {result.matchedPosition && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Matched Position</h4>
              <PositionDetail pos={result.matchedPosition} />
            </div>
          )}
          {result.matchedPosition && result.wallet && (
            <Button onClick={() => setShowShare(true)} variant="outline">
              <Upload className="size-4 mr-2" />
              Share Proof
            </Button>
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
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          key={toast}
          className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg bg-foreground text-background text-sm shadow-lg flex items-center gap-2"
        >
          <Check className="size-4" />
          {toast}
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───

function Field({ label, value, onChange, placeholder }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 text-xs"
      />
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-sm font-semibold text-foreground mt-0.5">{value}</div>
    </div>
  )
}

function PositionsList({ rows, kind }) {
  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-muted/50">
          <tr className="border-b border-border">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Symbol</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Side</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Entry</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">{kind === 'open' ? 'Mark' : 'Exit'}</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">{kind === 'open' ? 'uPnL' : 'PnL'}</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">{kind === 'open' ? 'Lev' : 'Closed'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => {
            const pnl = parseFloat(kind === 'open'
              ? (p.unrealizedProfit ?? p.unRealizedProfit ?? 0)
              : posField(p, 'pnl'))
            const side = inferSide(p)
            return (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="px-3 py-2 text-foreground">{p.symbol}</td>
                <td className={cn('px-3 py-2 text-right font-semibold', normalizeSide(side) === 'LONG' ? 'text-emerald-500' : 'text-red-500')}>
                  {side || '—'}
                </td>
                <td className="px-3 py-2 text-right text-foreground">${fmt(posField(p, 'entry'))}</td>
                <td className="px-3 py-2 text-right text-foreground">
                  ${fmt(kind === 'open' ? (p.markPrice ?? p.price) : posField(p, 'exit'))}
                </td>
                <td className={cn('px-3 py-2 text-right font-semibold', pnl >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                  {fmtSign(pnl)}
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground">
                  {kind === 'open' ? `${p.leverage ?? '—'}x` : tsToDate(posField(p, 'time'))}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
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
    <div className="rounded-lg border bg-card overflow-hidden">
      <table className="w-full text-xs">
        <tbody>
          {[
            ['Symbol', pos.symbol],
            ['Side', side, normalizeSide(side) === 'LONG' ? 'text-emerald-500' : 'text-red-500'],
            ['Entry Price', `$${fmt(entry)}`],
            [isOpen ? 'Mark Price' : 'Exit Price', `$${fmt(exit)}`],
            ['Size', fmt(posField(pos, 'size'), 4)],
            ['Leverage', `${pos.leverage ?? '—'}x`],
            [
              'PnL',
              <span key="pnl" className={pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                {fmtSign(pnl)} <span className="opacity-70">({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)</span>
              </span>,
            ],
            ['Status', isOpen ? 'Open' : 'Closed'],
          ].map(([k, v, cls]) => (
            <tr key={k as string} className="border-b border-border last:border-0">
              <td className="px-3 py-2 text-muted-foreground">{k}</td>
              <td className={cn('px-3 py-2 text-right font-medium text-foreground', cls)}>
                {v || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Field extraction helpers ───

function posField(pos, type) {
  switch (type) {
    case 'entry': return pos.avgEntryPrice ?? pos.entryPrice ?? 0
    case 'exit': return pos.avgClosePrice ?? pos.closePrice ?? pos.exitPrice ?? pos.avgExitPrice ?? 0
    case 'pnl': return pos.realizedPnL ?? pos.realizedPnl ?? pos.pnl ?? pos.unrealizedProfit ?? pos.unRealizedProfit ?? 0
    case 'side': return pos.positionSide ?? pos.side ?? ''
    case 'size': {
      const raw = pos.size ?? pos.positionAmt ?? pos.positionAmount ?? pos.qty ?? pos.origQty ?? 0
      if (parseFloat(raw)) return raw
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

function normalizeSymbol(sym) {
  if (!sym) return ''
  return sym.replace(/[-\/](USD[T]?|PERP)$/i, '').replace(/(USD[T]?)$/i, '').toUpperCase()
}

function normalizeSide(s) {
  if (!s) return ''
  const u = s.toUpperCase().trim()
  if (u === 'LONG' || u === 'BUY') return 'LONG'
  if (u === 'SHORT' || u === 'SELL') return 'SHORT'
  if (u === 'BOTH') return ''
  return u
}

function inferSide(pos) {
  const raw = posField(pos, 'side')
  const normalized = normalizeSide(raw)
  if (normalized) return normalized
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

    if (sym && !posSym.includes(sym)) return false
    if (!isNaN(entry) && Math.trunc(posEntry) !== Math.trunc(entry)) return false
    if (side && posSide !== side) return false
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

// ─── Real QR Code ───
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
        const w = canvas.width
        const h = canvas.height
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
  return <canvas ref={canvasRef} style={{ width: size, height: size, display: 'block', borderRadius: 8 }} />
}

// ─── Share card ───
interface ShareCardProps {
  imagePreview?: any
  pos: any
  wallet: any
  scanUrl: string
  verified: boolean
  onClose: () => void
  onDownload: () => Promise<void>
  onCopy: () => Promise<void>
  onCopyLink: () => void
}
const ShareCard = React.forwardRef<HTMLDivElement, ShareCardProps>(function ShareCard(
  { imagePreview, pos, wallet, scanUrl, verified, onClose, onDownload, onCopy, onCopyLink },
  ref,
) {
  const side = inferSide(pos)
  const pnl = parseFloat(posField(pos, 'pnl'))
  const entry = parseFloat(posField(pos, 'entry'))
  const exit = parseFloat(pos._isOpen ? (pos.markPrice ?? pos.price ?? 0) : posField(pos, 'exit'))
  const margin = parseFloat(pos.initialMargin ?? pos.margin ?? 0)
  const lev = parseFloat(pos.leverage ?? 1)
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

  return (
    <>
      <div className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-popover text-popover-foreground border border-border rounded-2xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto pointer-events-auto relative">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="absolute top-3 right-3"
            aria-label="Close"
          >
            <X className="size-4" />
          </Button>

          {/* Card to capture */}
          <div
            ref={ref}
            className="rounded-xl border bg-card p-5 space-y-4"
            style={{ background: '#0c0c0c', color: '#fff', border: '1px solid #262626' }}
          >
            <div className="flex items-center justify-between">
              <img src={logoSrc} alt="CommunityScan" style={{ height: 28 }} crossOrigin="anonymous" />
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-bold"
                style={{
                  borderColor: `${badgeColor}44`,
                  background: `${badgeColor}18`,
                  color: badgeColor,
                }}
              >
                {verified ? <Check className="size-3" /> : <AlertCircle className="size-3" />}
                {badgeText}
              </div>
            </div>

            <div className="flex gap-3">
              {imagePreview && (
                <div className="flex-shrink-0 max-w-[40%]">
                  <img
                    src={imagePreview}
                    alt="PnL card"
                    className="w-full rounded-md"
                    style={{ display: 'block' }}
                  />
                </div>
              )}
              <div className="flex-1 space-y-1.5 text-xs">
                <Row k="Symbol" v={pos.symbol} />
                <Row k="Side" v={side || '—'} cls={normalizeSide(side) === 'LONG' ? 'text-emerald-400' : 'text-red-400'} />
                <Row k="Entry" v={`$${fmt(entry)}`} />
                <Row k={pos._isOpen ? 'Mark' : 'Exit'} v={`$${fmt(exit)}`} />
                <Row k="Leverage" v={`${pos.leverage ?? '—'}x`} />
                <Row
                  k="PnL"
                  v={
                    <>
                      {fmtSign(pnl)}{' '}
                      <span style={{ opacity: 0.7, fontSize: '0.85em' }}>
                        ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
                      </span>
                    </>
                  }
                  cls={pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}
                />
                <Row k="Size" v={fmt(posField(pos, 'size'), 4)} />
              </div>
            </div>

            <div className="flex justify-between gap-3 items-end pt-2" style={{ borderTop: '1px solid #262626', paddingTop: 12 }}>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs">
                  <span style={{ color: '#a3a3a3' }}>Wallet</span>
                  <code className="truncate">{wallet}</code>
                </div>
                <div className="text-[11px] truncate" style={{ color: '#a3a3a3' }}>{scanUrl}</div>
              </div>
              <QrCodeImg text={scanUrl || wallet} size={72} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <Button onClick={onDownload} className="flex-1" variant="outline">
              <Download className="size-4 mr-2" />
              Download
            </Button>
            <Button onClick={onCopy} className="flex-1" variant="outline">
              <CopyIcon className="size-4 mr-2" />
              Copy Image
            </Button>
            <Button onClick={onCopyLink} className="flex-1" variant="outline">
              <LinkIcon className="size-4 mr-2" />
              Copy Link
            </Button>
          </div>
        </div>
      </div>
    </>
  )
})

function Row({ k, v, cls = '' }: { k: string; v: any; cls?: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span style={{ color: '#a3a3a3' }}>{k}</span>
      <span className={cls}>{v}</span>
    </div>
  )
}
