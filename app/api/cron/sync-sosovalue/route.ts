/**
 * Cron: pull SoSoValue hot endpoints into sosovalue_cache.
 * Runs every 3 min (see migration 20260420000002). ~5 API calls per tick — well under 20/min.
 */

import { requireCronAuth } from '../../../lib/cronAuth'
import { supabaseAdmin } from '../../../lib/supabaseServer'
import {
  etfBtcFlows,
  etfEthFlows,
  etfSnapshot,
  indicesList,
  newsTrending,
  macroEvents,
} from '../../../lib/sosoValueApi'

const ENDPOINTS = [
  { module: 'etf', key: 'btc_flows',  fetch: () => etfBtcFlows() },
  { module: 'etf', key: 'eth_flows',  fetch: () => etfEthFlows() },
  { module: 'etf', key: 'btc_snapshot', fetch: () => etfSnapshot('BTC') },
  { module: 'etf', key: 'eth_snapshot', fetch: () => etfSnapshot('ETH') },
  { module: 'index', key: 'list',     fetch: () => indicesList() },
  { module: 'news', key: 'trending',  fetch: () => newsTrending(1, 15) },
  { module: 'macro', key: 'events',   fetch: () => macroEvents() },
]

export async function GET(request) {
  const authErr = requireCronAuth(request)
  if (authErr) return authErr

  const results = { success: [], failed: [] }

  await Promise.allSettled(
    ENDPOINTS.map(async ({ module, key, fetch: fetchFn }) => {
      try {
        const payload = await fetchFn()
        const { error } = await supabaseAdmin
          .from('sosovalue_cache')
          .upsert({ module, key, payload, fetched_at: new Date().toISOString() })
        if (error) throw error
        results.success.push(`${module}/${key}`)
      } catch (err) {
        console.error(`SoSoValue sync failed [${module}/${key}]:`, err.message)
        results.failed.push(`${module}/${key}: ${err.message}`)
      }
    })
  )

  return Response.json(results)
}
