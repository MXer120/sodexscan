// Client-side helper for invoking any tool by id.
// Handles session-token injection, method selection (GET for reads, POST for writes),
// and unwraps the standard { ok, data|error, code, field? } envelope.

import { supabase } from '../supabaseClient'

async function getBearer() {
  try {
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token ?? null
  } catch {
    return null
  }
}

interface InvokeOptions {
  method?: string
  signal?: AbortSignal
}

export async function invokeTool(toolId: string, params: Record<string, unknown> = {}, { method, signal }: InvokeOptions = {}) {
  const token = await getBearer()
  const headers: Record<string, string> = { 'Accept': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const preferPost = method ? method === 'POST' : (params && Object.keys(params).length > 0)
  let url = `/api/tools/${encodeURIComponent(toolId)}`
  const init: RequestInit = { method: preferPost ? 'POST' : 'GET', headers, signal }

  if (preferPost) {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(params ?? {})
  } else if (params && Object.keys(params).length) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue
      qs.set(k, Array.isArray(v) ? v.join(',') : String(v))
    }
    if ([...qs.keys()].length) url += `?${qs.toString()}`
  }

  let res
  try {
    res = await fetch(url, init)
  } catch (err) {
    return { ok: false, error: (err as Error)?.message ?? 'Network error', code: 0 }
  }

  let body = null
  try { body = await res.json() } catch {}
  if (!body) return { ok: false, error: `Non-JSON response (HTTP ${res.status})`, code: res.status }
  return body
}

export function toolHttpExamples(tool, sampleParams?) {
  const id = tool.id
  const payload = sampleParams ?? Object.fromEntries((tool.params ?? []).filter(p => p.default !== undefined).map(p => [p.name, p.default]))
  const method = tool.mutates ? 'POST' : 'GET'

  if (method === 'GET') {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(payload)) {
      if (v === undefined || v === null || v === '') continue
      qs.set(k, Array.isArray(v) ? v.join(',') : String(v))
    }
    const query = [...qs.keys()].length ? `?${qs.toString()}` : ''
    return {
      method,
      url: `/api/tools/${id}${query}`,
      curl: `curl "${typeof window === 'undefined' ? 'https://<host>' : window.location.origin}/api/tools/${id}${query}" \\\n  -H 'Authorization: Bearer <TOKEN>'`,
    }
  }

  const bodyJson = JSON.stringify(payload, null, 2)
  const origin = typeof window === 'undefined' ? 'https://<host>' : window.location.origin
  return {
    method,
    url: `/api/tools/${id}`,
    body: payload,
    curl: `curl -X POST "${origin}/api/tools/${id}" \\\n  -H 'Authorization: Bearer <TOKEN>' \\\n  -H 'Content-Type: application/json' \\\n  -d '${bodyJson.replace(/'/g, "\\'")}'`,
  }
}
