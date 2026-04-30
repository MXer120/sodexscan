// GET /api/tools — manifest of the entire tool catalog.
// Handlers/icons/demos are stripped; the response is pure JSON for AI consumption.

import { TOOLS, REGISTRY_VERSION } from '../../lib/tools/registry'
import { toManifestEntry } from '../../lib/tools/schema'

export const dynamic = 'force-dynamic'

export async function GET() {
  const manifest = {
    version: REGISTRY_VERSION,
    count: TOOLS.length,
    tools: TOOLS.map(toManifestEntry),
  }
  return Response.json(manifest, {
    headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' },
  })
}
