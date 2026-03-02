import { supabase } from './supabaseClient'

export const configCache = {}
let cacheLoaded = false
let loadPromise = null

export async function loadPageConfigs() {
  if (cacheLoaded) return
  if (loadPromise) return loadPromise
  loadPromise = supabase
    .from('page_config')
    .select('path, visible, permission')
    .then(({ data }) => {
      if (data) data.forEach(row => { configCache[row.path] = row })
      cacheLoaded = true
    })
  return loadPromise
}

export function isConfigLoaded() { return cacheLoaded }
