// Param validation for tool invocations.
// Pure functions — no framework deps.

const ISO8601_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/

function fail(field, message) {
  return { ok: false, code: 400, field, error: message }
}

function coerceParam(raw, spec) {
  if (raw === undefined || raw === null || raw === '') return undefined
  switch (spec.type) {
    case 'number': {
      const n = typeof raw === 'number' ? raw : Number(raw)
      if (!Number.isFinite(n)) return { _err: 'must be a number' }
      return n
    }
    case 'integer': {
      const n = typeof raw === 'number' ? raw : Number(raw)
      if (!Number.isInteger(n)) return { _err: 'must be an integer' }
      return n
    }
    case 'boolean': {
      if (typeof raw === 'boolean') return raw
      if (raw === 'true') return true
      if (raw === 'false') return false
      return { _err: 'must be boolean' }
    }
    case 'array': {
      if (Array.isArray(raw)) return raw
      if (typeof raw === 'string') return raw.split(',').map(s => s.trim()).filter(Boolean)
      return { _err: 'must be an array' }
    }
    case 'object': {
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw
      return { _err: 'must be an object' }
    }
    case 'iso8601':
    case 'string':
    case 'enum':
    default:
      return typeof raw === 'string' ? raw : String(raw)
  }
}

export function validateParams(input, paramSpecs = []) {
  const out = {}
  const src = input && typeof input === 'object' ? input : {}

  for (const spec of paramSpecs) {
    const raw = src[spec.name]
    let value = coerceParam(raw, spec)
    if (value && typeof value === 'object' && value._err) {
      return fail(spec.name, `${spec.name} ${value._err}`)
    }

    if (value === undefined) {
      if (spec.default !== undefined) {
        out[spec.name] = spec.default
        continue
      }
      if (spec.required) return fail(spec.name, `${spec.name} is required`)
      continue
    }

    if (spec.type === 'enum' && Array.isArray(spec.enum) && !spec.enum.includes(value)) {
      return fail(spec.name, `${spec.name} must be one of: ${spec.enum.join(', ')}`)
    }
    if (spec.type === 'string' && spec.pattern) {
      const re = typeof spec.pattern === 'string' ? new RegExp(spec.pattern) : spec.pattern
      if (!re.test(value)) return fail(spec.name, `${spec.name} has invalid format`)
    }
    if (spec.type === 'iso8601' && !ISO8601_RE.test(value)) {
      return fail(spec.name, `${spec.name} must be ISO8601`)
    }
    if ((spec.type === 'number' || spec.type === 'integer')) {
      if (spec.min !== undefined && value < spec.min) return fail(spec.name, `${spec.name} must be ≥ ${spec.min}`)
      if (spec.max !== undefined && value > spec.max) return fail(spec.name, `${spec.name} must be ≤ ${spec.max}`)
    }
    if (spec.type === 'array' && spec.itemPattern) {
      const re = typeof spec.itemPattern === 'string' ? new RegExp(spec.itemPattern) : spec.itemPattern
      for (const item of value) {
        if (typeof item !== 'string' || !re.test(item)) {
          return fail(spec.name, `${spec.name} item "${item}" has invalid format`)
        }
      }
    }
    if (spec.type === 'array' && spec.itemType === 'enum' && Array.isArray(spec.enum)) {
      for (const item of value) {
        if (!spec.enum.includes(item)) {
          return fail(spec.name, `${spec.name} item "${item}" must be one of: ${spec.enum.join(', ')}`)
        }
      }
    }
    out[spec.name] = value
  }

  return { ok: true, value: out }
}

export function toManifestEntry(tool) {
  const {
    id, name, category, categories, surface, status, tier, mutates, destructive,
    shortDescription, longDescription, features, limits,
    params, returns, examples, errors, fullPageHref, relatedTools, plannedFeatures, eta,
    verified, supportedTokens,
  } = tool
  return {
    id, name, category, categories: categories ?? null, surface, status,
    tier: tier ?? 'public',
    mutates: !!mutates,
    destructive: !!destructive,
    shortDescription,
    longDescription,
    features,
    limits,
    params: params ?? [],
    returns: returns ?? null,
    examples: examples ?? [],
    errors: errors ?? {},
    fullPageHref: fullPageHref ?? null,
    relatedTools: relatedTools ?? [],
    plannedFeatures: plannedFeatures ?? null,
    eta: eta ?? null,
    verified: verified ?? false,
    supportedTokens: supportedTokens ?? null,
  }
}
