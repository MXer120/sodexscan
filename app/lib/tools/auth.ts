// Shared auth helper for tool handlers.
// Extracts the bearer token, returns the user record or null.

import { supabaseAdmin } from '../supabaseServer'

export async function getToolUser(request) {
  const auth = request.headers?.get?.('authorization') ?? ''
  const token = auth.replace('Bearer ', '').trim()
  if (!token) return null
  try {
    const { data } = await supabaseAdmin.auth.getUser(token)
    return data?.user ?? null
  } catch {
    return null
  }
}
