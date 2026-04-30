// Gateway for invoking a tool by id.
// - GET supported for pure read tools (mutates:false). Params via querystring.
// - POST supported for all tools. Params via JSON body.
// - Validates params, enforces tier, returns the standard envelope:
//     { ok: true,  data, tool, version }
//     { ok: false, error, code, field?, tool, version }

import { TOOL_BY_ID, resolveHandler, REGISTRY_VERSION } from '../../../lib/tools/registry'
import { validateParams } from '../../../lib/tools/schema'
import { getToolUser } from '../../../lib/tools/auth'

export const dynamic = 'force-dynamic'

function envelopeError(toolId: string, { error, code = 500, field }: { error?: string; code?: number; field?: string } = {}) {
  const body: Record<string, unknown> = { ok: false, error, code, tool: toolId, version: REGISTRY_VERSION }
  if (field) body.field = field
  return Response.json(body, { status: code })
}

function envelopeOk(toolId: string, data: unknown) {
  return Response.json({ ok: true, data, tool: toolId, version: REGISTRY_VERSION })
}

function isOwner(user: { app_metadata?: Record<string, unknown> } | null) {
  return Boolean(user?.app_metadata?.role === 'owner' || user?.app_metadata?.admin === true)
}

async function invoke(request: Request, toolId: string, rawParams: Record<string, unknown>, { httpMethod }: { httpMethod: string }) {
  const tool = TOOL_BY_ID[toolId]
  if (!tool) return envelopeError(toolId, { error: `Unknown tool: ${toolId}`, code: 404 })
  if (tool.status !== 'available') {
    return envelopeError(toolId, { error: `Tool "${toolId}" is planned — not yet available.`, code: 501 })
  }
  if (tool.mutates && httpMethod === 'GET') {
    return envelopeError(toolId, { error: 'Mutations require POST', code: 405 })
  }

  const tier = tool.tier ?? 'public'
  let user = null
  if (tier === 'user' || tier === 'owner') {
    user = await getToolUser(request)
    if (!user) return envelopeError(toolId, { error: 'Unauthorized', code: 401 })
    if (tier === 'owner' && !isOwner(user)) {
      return envelopeError(toolId, { error: 'Forbidden', code: 403 })
    }
  }

  const toolRecord = tool as Record<string, unknown>
  const validated = validateParams(rawParams, (toolRecord.params as unknown[]) ?? [])
  if (!validated.ok) {
    const fail = validated as { ok: false; code: number; field: string; error: string }
    return envelopeError(toolId, { error: fail.error, code: fail.code ?? 400, field: fail.field })
  }

  const handler = resolveHandler(toolId)
  if (typeof handler !== 'function') {
    return envelopeError(toolId, { error: `Handler missing for "${toolId}"`, code: 500 })
  }

  try {
    const success = validated as { ok: true; value: Record<string, unknown> }
    const result = await handler(success.value, { user, request }) as Record<string, unknown>
    if (result && typeof result === 'object' && result.error && typeof result.code === 'number') {
      return envelopeError(toolId, { error: String(result.error), code: result.code, field: result.field as string | undefined })
    }
    return envelopeOk(toolId, result)
  } catch (err) {
    const message = (err as Error)?.message ?? 'Handler crashed'
    return envelopeError(toolId, { error: message, code: 500 })
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ toolId: string }> }) {
  const { toolId } = await params
  const url = new URL(request.url)
  const rawParams = Object.fromEntries(url.searchParams.entries())
  return invoke(request, toolId, rawParams, { httpMethod: 'GET' })
}

export async function POST(request: Request, { params }: { params: Promise<{ toolId: string }> }) {
  const { toolId } = await params
  let body: Record<string, unknown> = {}
  try {
    const text = await request.text()
    body = text ? JSON.parse(text) : {}
  } catch {
    return envelopeError(toolId, { error: 'Invalid JSON body', code: 400 })
  }
  return invoke(request, toolId, body, { httpMethod: 'POST' })
}
