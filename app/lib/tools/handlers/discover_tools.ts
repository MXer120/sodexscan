// AI-facing tool search over the registry.
// Returns lightweight entries — just what the AI needs to decide which tool to call.

import { TOOLS } from '../registry'

interface ToolRecord {
  id: string
  name: string
  category: string
  categories?: string[]
  surface?: string
  status: string
  tier: string
  mutates?: boolean
  shortDescription?: string
  longDescription?: string
  params?: Array<{ name: string; required?: boolean; type: string; enum?: string[] }>
  relatedTools?: string[]
  [key: string]: unknown
}

function paramsSummary(params: ToolRecord['params']) {
  if (!Array.isArray(params) || params.length === 0) return ''
  return params.map(p => `${p.name}${p.required ? '*' : ''}:${p.type}${p.enum ? `(${p.enum.slice(0, 4).join('|')}${p.enum.length > 4 ? '…' : ''})` : ''}`).join(', ')
}

function matchesQuery(tool: ToolRecord, q: string | undefined) {
  if (!q) return true
  const needle = q.toLowerCase()
  return (tool.id || '').toLowerCase().includes(needle)
    || (tool.name || '').toLowerCase().includes(needle)
    || (tool.shortDescription || '').toLowerCase().includes(needle)
    || (tool.longDescription || '').toLowerCase().includes(needle)
    || (tool.category || '').toLowerCase().includes(needle)
}

export async function discover_tools({ query, category, surface, status, limit }: {
  query?: string
  category?: string
  surface?: string
  status?: string
  limit?: number | string
}) {
  const cap = Math.max(1, Math.min(parseInt(String(limit ?? 25), 10) || 25, 100))
  const tools = TOOLS as ToolRecord[]

  const results = tools.filter(t => {
    if (status && t.status !== status) return false
    if (category) {
      const cats = t.categories?.length ? t.categories : [t.category]
      if (!cats.some(c => (c || '').toLowerCase() === category.toLowerCase())) return false
    }
    if (surface && surface !== 'all' && t.surface && t.surface !== surface) return false
    return matchesQuery(t, query)
  })

  return {
    query: query || null,
    category: category || null,
    surface: surface || 'all',
    count: results.length,
    tools: results.slice(0, cap).map(t => ({
      id: t.id,
      name: t.name,
      category: t.category,
      surface: t.surface || null,
      status: t.status,
      tier: t.tier,
      mutates: !!t.mutates,
      shortDescription: t.shortDescription || '',
      params: paramsSummary(t.params),
      relatedTools: t.relatedTools || [],
    })),
  }
}
