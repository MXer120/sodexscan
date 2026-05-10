/**
 * SoSoValue cache proxy.
 * 1. Serves from sosovalue_cache if fresh (< 3h).
 * 2. Falls through to live SoSoValue API on cache miss/stale, then stores result.
 *
 * GET /api/sosovalue?module=etf&key=ibit_history
 */

import { supabaseAdmin } from '../../lib/supabaseServer'
import {
  etfBtcFlows, etfEthFlows,
  etfTickerHistory, etfSnapshot,
} from '../../lib/sosoValueApi'

const CACHE_TTL_MS = 3 * 60 * 60 * 1000 // 3 hours

type Fetcher = () => Promise<unknown>

const LIVE: Record<string, Fetcher> = {
  'etf/btc_flows':     etfBtcFlows,
  'etf/eth_flows':     etfEthFlows,
  'etf/ibit_history':  () => etfTickerHistory('IBIT'),
  'etf/fbtc_history':  () => etfTickerHistory('FBTC'),
  'etf/arkb_history':  () => etfTickerHistory('ARKB'),
  'etf/gbtc_history':  () => etfTickerHistory('GBTC'),
  'etf/ibit_snapshot': () => etfSnapshot('IBIT'),
  'etf/fbtc_snapshot': () => etfSnapshot('FBTC'),
  'etf/arkb_snapshot': () => etfSnapshot('ARKB'),
  'etf/gbtc_snapshot': () => etfSnapshot('GBTC'),
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const module = searchParams.get('module')
  const key    = searchParams.get('key')

  if (!module || !key) {
    return Response.json({ error: 'module and key required' }, { status: 400 })
  }

  // 1. Try cache
  try {
    const { data } = await supabaseAdmin
      .from('sosovalue_cache')
      .select('payload, fetched_at')
      .eq('module', module)
      .eq('key', key)
      .single()

    if (data) {
      const age = Date.now() - new Date(data.fetched_at).getTime()
      if (age < CACHE_TTL_MS) {
        return Response.json(
          { data: data.payload, fetched_at: data.fetched_at },
          { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
        )
      }
    }
  } catch { /* cache miss — fall through */ }

  // 2. Live fetch
  const fetcher = LIVE[`${module}/${key}`]
  if (!fetcher) {
    return Response.json({ error: `No fetcher for ${module}/${key}` }, { status: 404 })
  }

  if (!process.env.SOSOVALUE_API_KEY) {
    return Response.json(
      { error: 'SOSOVALUE_API_KEY is not set in environment variables' },
      { status: 503 }
    )
  }

  try {
    const payload = await fetcher()
    const now = new Date().toISOString()

    // Store in cache (non-blocking)
    supabaseAdmin
      .from('sosovalue_cache')
      .upsert({ module, key, payload, fetched_at: now })
      .then(() => {})
      .catch(() => {})

    return Response.json(
      { data: payload, fetched_at: now },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ error: msg }, { status: 502 })
  }
}
