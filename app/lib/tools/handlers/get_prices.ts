import { perpsTickers, spotTickers } from '../../sodexApi'

function toList(raw) {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    if (Array.isArray(raw.data)) return raw.data
    if (Array.isArray(raw.list)) return raw.list
  }
  return []
}

export async function get_prices({ symbols }) {
  const [rp, rs] = await Promise.allSettled([perpsTickers(), spotTickers()])
  const mark = {}
  if (rp.status === 'fulfilled') {
    for (const m of toList(rp.value)) {
      const sym = m.symbol ?? m.s
      const p = parseFloat(m.markPrice ?? m.mark ?? m.p ?? m.price ?? 0)
      if (sym && p) mark[sym] = p
    }
  }
  if (rs.status === 'fulfilled') {
    for (const m of toList(rs.value)) {
      const sym = m.symbol ?? m.s
      const p = parseFloat(m.lastPrice ?? m.lastPx ?? m.price ?? m.p ?? 0)
      if (sym && p) mark[sym] = p
    }
  }
  if (Array.isArray(symbols) && symbols.length) {
    const filtered = {}
    for (const s of symbols) if (mark[s] !== undefined) filtered[s] = mark[s]
    return { mark: filtered }
  }
  return { mark }
}
