/**
 * SoSoValue cache proxy.
 * Serves data from sosovalue_cache (Supabase) — never calls upstream directly from client.
 *
 * GET /api/sosovalue?module=etf&key=btc_flows
 */

import { supabaseAdmin } from '../../lib/supabaseServer'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const module = searchParams.get('module')
  const key = searchParams.get('key')

  if (!module || !key) {
    return Response.json({ error: 'module and key required' }, { status: 400 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('sosovalue_cache')
      .select('payload, fetched_at')
      .eq('module', module)
      .eq('key', key)
      .single()

    if (error || !data) {
      return Response.json({ error: 'Not found in cache' }, { status: 404 })
    }

    return Response.json(
      { data: data.payload, fetched_at: data.fetched_at },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
    )
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
