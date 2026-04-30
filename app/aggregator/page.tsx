'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionContext } from '../lib/SessionContext'
import { configCache, loadPageConfigs, isConfigLoaded } from '../lib/pageConfig'
import AggregatorPage from '../components/AggregatorPage'

export default function Page() {
  const { user, isMod, loading } = useSessionContext()
  const router = useRouter()
  const [configReady, setConfigReady] = useState(isConfigLoaded())

  useEffect(() => {
    if (isConfigLoaded()) { setConfigReady(true); return }
    loadPageConfigs().then(() => setConfigReady(true))
  }, [])

  useEffect(() => {
    if (loading || !configReady) return
    const cfg = configCache['/aggregator']
    if (!cfg || !cfg.visible) { router.replace('/'); return }
    if (cfg.permission === 'auth' && !user) { router.replace('/'); return }
    if (cfg.permission === 'mod' && (!user || !isMod)) { router.replace('/'); return }
  }, [loading, configReady, user, isMod, router])

  if (loading || !configReady) return null
  const cfg = configCache['/aggregator']
  if (!cfg || !cfg.visible) return null
  if (cfg.permission === 'auth' && !user) return null
  if (cfg.permission === 'mod' && (!user || !isMod)) return null

  return <AggregatorPage />
}
