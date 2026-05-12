'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionContext } from '../lib/SessionContext'
import { configCache, loadPageConfigs, isConfigLoaded } from '../lib/pageConfig'
import AggregatorPage from '../components/AggregatorPage'

const PrototypeBanner = () => (
  <div className="mx-4 mt-4 sm:mx-6 sm:mt-6 flex items-center gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
    <svg className="size-4 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
    <p className="text-xs font-medium text-amber-500">Prototype — this feature is under active development and may be incomplete.</p>
  </div>
)

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

  return (
    <>
      <PrototypeBanner />
      <AggregatorPage />
    </>
  )
}
