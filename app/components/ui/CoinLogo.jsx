'use client'
import { useState } from 'react'

const LOGO_BASE = 'https://raw.githubusercontent.com/niccolozy/token-icons/main/tokens'

const globalLogoCache = {}

export function getBaseCoin(symbol) {
  if (!symbol || typeof symbol !== 'string') return ''
  let s = symbol.replace(/^WSOSO/g, 'SOSO')
  s = s.replace(/v([A-Z0-9]+)/g, '$1')
  s = s.split(/[-_/]/)[0]
  return s.toLowerCase()
}

export function getCoinLogoUrl(symbol) {
  const base = getBaseCoin(symbol)
  return `${LOGO_BASE}/${base}.png`
}

export default function CoinLogo({ symbol, size = 20, style = {} }) {
  const base = getBaseCoin(symbol)
  const url = getCoinLogoUrl(symbol)
  const [failed, setFailed] = useState(globalLogoCache[base] === false)

  if (failed || !base) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.5, color: 'var(--color-text-muted)', ...style
      }}>
        {(base || '?').charAt(0).toUpperCase()}
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={base}
      width={size}
      height={size}
      style={{ borderRadius: '50%', ...style }}
      onError={() => { globalLogoCache[base] = false; setFailed(true) }}
      onLoad={() => { globalLogoCache[base] = true }}
    />
  )
}
