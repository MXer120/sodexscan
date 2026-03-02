'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const cache: Record<string, string> = {}
let initialized = false
let initPromise: Promise<void> | null = null

async function loadAll(): Promise<void> {
  const { data, error } = await supabase
    .from('cms_content')
    .select('key, content')

  if (error) {
    console.error('[useCmsContent] fetch error:', error)
    return
  }

  if (data) {
    for (const row of data) {
      cache[row.key] = row.content
    }
  }

  initialized = true
}

export function useCmsContent() {
  const [loading, setLoading] = useState(!initialized)
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    if (initialized) {
      setLoading(false)
      return
    }

    if (!initPromise) {
      initPromise = loadAll()
    }

    initPromise.then(() => {
      setLoading(false)
      forceUpdate(n => n + 1)
    })
  }, [])

  const getContent = useCallback((key: string, fallback: string): string => {
    return cache[key] ?? fallback
  }, [])

  const refresh = useCallback(async () => {
    initialized = false
    initPromise = loadAll()
    await initPromise
    forceUpdate(n => n + 1)
  }, [])

  return { getContent, loading, refresh }
}
