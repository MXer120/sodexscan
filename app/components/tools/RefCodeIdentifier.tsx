'use client'

import React, { CSSProperties, useState, useRef, useCallback } from 'react'
import Link from 'next/link'

declare global {
  interface Window {
    Tesseract: any
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function extractRefCode(raw) {
  if (!raw) return ''
  // Try ?ref=CODE or &ref=CODE in a URL
  const urlMatch = raw.match(/[?&]ref=([A-Za-z0-9_-]{3,20})/i)
  if (urlMatch) return urlMatch[1].toUpperCase()
  // Try /ref/CODE path segment
  const pathMatch = raw.match(/\/ref\/([A-Za-z0-9_-]{3,20})/i)
  if (pathMatch) return pathMatch[1].toUpperCase()
  // Try to find ref= in plain text (e.g. "ref=LUTZ123")
  const plainRef = raw.match(/\bref[=:\s]+([A-Za-z0-9_-]{3,20})/i)
  if (plainRef) return plainRef[1].toUpperCase()
  // Otherwise: extract first 3-12 char all-caps token that looks like a code
  const codeMatch = raw.trim().match(/\b([A-Z0-9]{3,12})\b/)
  if (codeMatch) return codeMatch[1]
  // Fallback: strip URL prefix and return remainder as-is (uppercased)
  return raw.trim().toUpperCase().slice(0, 20)
}

function detectCodeInText(text) {
  if (!text) return ''
  // Try URL ref param first
  const urlMatch = text.match(/[?&]ref=([A-Za-z0-9_-]{3,20})/i)
  if (urlMatch) return urlMatch[1].toUpperCase()
  // Try "ref:" or "referral code:" label
  const labelMatch = text.match(/(?:referral\s*code|ref(?:eral)?)[:\s]+([A-Za-z0-9_-]{4,20})/i)
  if (labelMatch) return labelMatch[1].toUpperCase()
  // Look for standalone 4-12 uppercase alphanumeric token
  const tokens = text.match(/\b([A-Z0-9]{4,12})\b/g)
  if (tokens && tokens.length) return tokens[0]
  return ''
}

// ── Tesseract loader ──────────────────────────────────────────────────────────

let tesseractPromise = null
function loadTesseract() {
  if (tesseractPromise) return tesseractPromise
  tesseractPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('SSR'))
    if (window.Tesseract) return resolve(window.Tesseract)
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/tesseract.js@4/dist/tesseract.min.js'
    script.onload = () => resolve(window.Tesseract)
    script.onerror = () => reject(new Error('Failed to load Tesseract.js'))
    document.head.appendChild(script)
  })
  return tesseractPromise
}

// ── small UI atoms ────────────────────────────────────────────────────────────

const Spinner = () => (
  <span style={{ display: 'inline-block', width: '16px', height: '16px' }}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      style={{ animation: 'spin 0.8s linear infinite', width: '16px', height: '16px' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </span>
)

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }
  return (
    <button onClick={copy} title={copied ? 'Copied!' : 'Copy'} style={{
      background: 'transparent', border: 'none', cursor: 'pointer',
      padding: '2px 4px', color: copied ? '#4ade80' : 'var(--text-secondary)',
      display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px',
    }}>
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function RefCodeIdentifier() {
  const [tab, setTab] = useState('text') // 'text' | 'image'

  // text tab state
  const [rawInput, setRawInput] = useState('')
  const [cleanedCode, setCleanedCode] = useState('')

  // image tab state
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [ocrText, setOcrText] = useState('')
  const [ocrCode, setOcrCode] = useState('')
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  // shared resolve state
  const [resolvedCode, setResolvedCode] = useState('')
  const [wallet, setWallet] = useState(null)
  const [resolving, setResolving] = useState(false)
  const [resolveError, setResolveError] = useState('')
  const [resolved, setResolved] = useState(false)

  const fileInputRef = useRef(null)

  // ── text tab ──────────────────────────────────────────────────────

  const handleExtract = () => {
    const code = extractRefCode(rawInput)
    setCleanedCode(code)
    resetResult()
  }

  const codeForResolve = tab === 'text'
    ? (cleanedCode || extractRefCode(rawInput))
    : ocrCode

  // ── image tab ────────────────────────────────────────────────────

  const processImage = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setOcrError('Please upload an image file.')
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setOcrText('')
    setOcrCode('')
    setOcrError('')
    setOcrLoading(true)
    resetResult()

    try {
      const Tesseract = await loadTesseract()
      const { data: { text } } = await Tesseract.recognize(file, 'eng', {
        logger: () => {},
      })
      const detected = detectCodeInText(text)
      setOcrText(text.trim())
      setOcrCode(detected)
    } catch (err) {
      setOcrError('OCR failed: ' + (err.message || 'Unknown error'))
    } finally {
      setOcrLoading(false)
    }
  }, [])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) processImage(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processImage(file)
  }

  // ── resolve ───────────────────────────────────────────────────────

  const resetResult = () => {
    setWallet(null)
    setResolveError('')
    setResolved(false)
    setResolvedCode('')
  }

  const handleResolve = async () => {
    const code = codeForResolve
    if (!code || code.length < 3) {
      setResolveError('Please enter or extract a valid referral code first.')
      return
    }
    setResolving(true)
    setResolveError('')
    setWallet(null)
    setResolved(false)

    try {
      const res = await fetch(`/api/resolve-refcode?code=${encodeURIComponent(code)}`)
      const json = await res.json()

      if (!res.ok || json.error) {
        setResolveError(json.error || `Error ${res.status}`)
      } else {
        setWallet(json.wallet || null)
        setResolvedCode(json.code || code)
        setResolved(true)
      }
    } catch (err) {
      setResolveError('Network error: ' + (err.message || 'Unknown'))
    } finally {
      setResolving(false)
    }
  }

  // ── styles ────────────────────────────────────────────────────────

  const tabBtnStyle = (active) => ({
    padding: '7px 16px',
    fontSize: '13px',
    fontWeight: active ? '600' : '400',
    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
    background: active ? 'var(--accent)' : 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  })

  const inputStyle: CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'var(--input)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontFamily: 'monospace',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const btnPrimaryStyle = {
    padding: '9px 18px',
    borderRadius: '8px',
    border: 'none',
    background: 'var(--accent)',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    opacity: resolving ? 0.7 : 1,
  }

  const btnSecondaryStyle = {
    padding: '9px 18px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  }

  // ── render ────────────────────────────────────────────────────────

  return (
    <div>
      {/* Tab switcher */}
      <div style={{
        display: 'inline-flex',
        gap: '4px',
        background: 'var(--color-overlay-subtle)',
        borderRadius: '8px',
        padding: '3px',
        marginBottom: '20px',
      }}>
        <button style={tabBtnStyle(tab === 'text')} onClick={() => { setTab('text'); resetResult() }}>
          Text Input
        </button>
        <button style={tabBtnStyle(tab === 'image')} onClick={() => { setTab('image'); resetResult() }}>
          Image Upload
        </button>
      </div>

      {/* ── TEXT TAB ─────────────────────────────────────────────── */}
      {tab === 'text' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Enter referral code or URL
            </label>
            <input
              style={inputStyle}
              type="text"
              placeholder="e.g. LUTZ123 or https://sodex.io/?ref=ABC"
              value={rawInput}
              onChange={(e) => { setRawInput(e.target.value); resetResult() }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleExtract() }}
            />
          </div>

          {rawInput && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button style={btnSecondaryStyle} onClick={handleExtract}>
                Extract Code
              </button>
            </div>
          )}

          {cleanedCode && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'var(--color-overlay-subtle)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>Extracted code:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: '600', color: 'var(--text-primary)' }}>
                {cleanedCode}
              </span>
              <button
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--text-secondary)', fontSize: '12px', padding: '2px 6px',
                }}
                onClick={() => { setCleanedCode(''); resetResult() }}
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── IMAGE TAB ────────────────────────────────────────────── */}
      {tab === 'image' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: '10px',
              padding: '32px 16px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragOver ? 'var(--color-overlay-subtle)' : 'transparent',
              transition: 'all 0.15s',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Preview"
                style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '6px', objectFit: 'contain' }}
              />
            ) : (
              <>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)"
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px' }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Drag & drop an image or <span style={{ color: 'var(--accent)', fontWeight: '500' }}>click to upload</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', opacity: 0.6 }}>
                  PNG, JPG, WebP supported
                </div>
              </>
            )}
          </div>

          {ocrLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              <Spinner /> Running OCR...
            </div>
          )}

          {ocrError && (
            <div style={{ color: '#f87171', fontSize: '13px' }}>{ocrError}</div>
          )}

          {ocrCode && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Detected code — confirm or edit:
              </div>
              <input
                style={inputStyle}
                type="text"
                value={ocrCode}
                onChange={(e) => { setOcrCode(e.target.value.toUpperCase()); resetResult() }}
              />
              {ocrText && (
                <details style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <summary style={{ cursor: 'pointer' }}>Show full OCR text</summary>
                  <pre style={{
                    marginTop: '8px', padding: '10px', borderRadius: '6px',
                    background: 'var(--color-overlay-faint)', border: '1px solid var(--border)',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '11px',
                    maxHeight: '120px', overflow: 'auto',
                  }}>{ocrText}</pre>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── RESOLVE BUTTON (shared) ───────────────────────────────── */}
      {codeForResolve && (
        <div style={{ marginTop: '16px' }}>
          <button
            style={btnPrimaryStyle}
            onClick={handleResolve}
            disabled={resolving}
          >
            {resolving ? <><Spinner /> Resolving...</> : 'Resolve Wallet'}
          </button>
        </div>
      )}

      {resolveError && (
        <div style={{ marginTop: '12px', color: '#f87171', fontSize: '13px' }}>
          {resolveError}
        </div>
      )}

      {/* ── RESULT PANEL ─────────────────────────────────────────── */}
      {resolved && (
        <div style={{
          marginTop: '16px',
          padding: '16px',
          borderRadius: '10px',
          border: `1px solid ${wallet ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`,
          background: wallet ? 'rgba(74,222,128,0.06)' : 'var(--color-overlay-faint)',
        }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Code resolved: <span style={{ fontFamily: 'monospace', fontWeight: '600', color: 'var(--text-primary)' }}>{resolvedCode}</span>
          </div>

          {wallet ? (
            <>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Linked wallet address:
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
                fontFamily: 'monospace', fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500',
              }}>
                <span style={{ wordBreak: 'break-all' }}>{wallet}</span>
                <CopyButton text={wallet} />
              </div>
              <div style={{ marginTop: '12px' }}>
                <Link
                  href={`/tracker/${wallet}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '7px 14px', borderRadius: '7px',
                    background: 'var(--accent)', color: '#fff',
                    fontSize: '13px', fontWeight: '500', textDecoration: 'none',
                  }}
                >
                  View on Scan
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </Link>
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              No wallet found for this referral code.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
