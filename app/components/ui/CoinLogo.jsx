'use client'
import { useState } from 'react'

const SUPABASE_BASE = 'https://yifkydhsbflzfprteots.supabase.co/storage/v1/object/public/coin-logos/'
const SPOTHQ_BASE = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/'

const LOGO_EXTENSIONS = {
  hype: 'jpg', pump: 'jpg', trump: 'jpg', wld: 'jpg', xlm: 'jpg', ton: 'jpg',
  mag7: 'png', soso: 'png', silver: 'svg', wif: 'jpeg'
}
const LOGO_ALIASES = {
  mag7ssi: 'mag7', defissi: 'defi', ussi: 'u', memessi: 'meme',
  pepe: '1000pepe', shib: '1000shib', bonk: '1000bonk', arbitrum: 'arb'
}

// Per-base-coin: tracks how many sources have been tried
const globalSrcIndex = {}

export function getBaseCoin(symbol) {
  if (!symbol || typeof symbol !== 'string') return ''
  let s = symbol.replace(/^WSOSO/g, 'SOSO')
  s = s.replace(/v([A-Z0-9]+)/g, '$1')
  // Split on separator chars first (e.g. BTC-PERP, BTC/USDT)
  s = s.split(/[-_/]/)[0]
  // Strip trailing quote currencies from unseparated pairs (e.g. BTCUSDT → BTC)
  s = s.replace(/(USDT|USDC|BUSD|PERP|USD)$/, (match) => {
    const base = s.slice(0, s.length - match.length)
    return base.length >= 2 ? '' : match
  })
  return s.toLowerCase()
}

function urlForIndex(base, idx) {
  if (idx === 0) {
    const aliased = LOGO_ALIASES[base] || base
    const ext = LOGO_EXTENSIONS[aliased] || 'png'
    return `${SUPABASE_BASE}${aliased}.${ext}`
  }
  if (idx === 1) return `${SPOTHQ_BASE}${base}.png`
  return null
}

export function getCoinLogoUrl(symbol) {
  const base = getBaseCoin(symbol)
  if (!base) return null
  const idx = globalSrcIndex[base] || 0
  return urlForIndex(base, idx)
}

export default function CoinLogo({ symbol, size = 20, style = {} }) {
  const base = getBaseCoin(symbol)
  const initIdx = globalSrcIndex[base] || 0
  const [srcIdx, setSrcIdx] = useState(initIdx)

  const url = base ? urlForIndex(base, srcIdx) : null

  if (!url || !base) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: 'rgba(var(--color-primary-rgb, 72, 203, 255), 0.15)',
        border: '1px solid rgba(var(--color-primary-rgb, 72, 203, 255), 0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.45, fontWeight: 700,
        color: 'var(--color-primary)', flexShrink: 0, ...style
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
      style={{ borderRadius: '50%', flexShrink: 0, ...style }}
      onError={() => {
        const next = srcIdx + 1
        globalSrcIndex[base] = next
        setSrcIdx(next)
      }}
      onLoad={() => { globalSrcIndex[base] = srcIdx }}
    />
  )
}
