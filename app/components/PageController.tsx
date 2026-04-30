'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSessionContext } from '../lib/SessionContext'
import { configCache, loadPageConfigs, isConfigLoaded } from '../lib/pageConfig'

export default function PageController() {
    const pathname = usePathname()
    const router = useRouter()
    const { user, isMod, loading: authLoading, openAuthModal } = useSessionContext()
    const [configReady, setConfigReady] = useState(isConfigLoaded())
    const openedModalRef = useRef(false)

    useEffect(() => {
        if (isConfigLoaded()) { setConfigReady(true); return }
        loadPageConfigs().then(() => setConfigReady(true))
    }, [])

    useEffect(() => {
        if (!configReady || authLoading) return

        // Normalize: strip trailing slash, match /admin sub-paths too
        const base = pathname === '/' ? '/' : '/' + pathname.split('/').filter(Boolean)[0]
        const cfg = configCache[pathname] || configCache[base]

        if (!cfg) return

        // 1. Hidden page → redirect home
        if (!cfg.visible) { router.replace('/'); return }

        // 2. Auth or mod required, not logged in → open auth modal
        if ((cfg.permission === 'auth' || cfg.permission === 'mod') && !user) {
            if (!openedModalRef.current) {
                openedModalRef.current = true
                openAuthModal()
            }
            return
        }

        // 3. Mod required, logged in but not mod → redirect home
        if (cfg.permission === 'mod' && user && !isMod) {
            router.replace('/')
            return
        }

        openedModalRef.current = false
    }, [pathname, configReady, authLoading, user, isMod])

    // Reset modal-opened flag on route change
    useEffect(() => {
        openedModalRef.current = false
    }, [pathname])

    return null
}
