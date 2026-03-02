'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSessionContext } from '../lib/SessionContext'
import { supabase } from '../lib/supabaseClient'

// Module-level cache: path → { visible, permission }
const configCache = {}
let cacheLoaded = false
let loadPromise = null

async function loadPageConfigs() {
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

export default function PageController() {
    const pathname = usePathname()
    const router = useRouter()
    const { user, isMod, loading: authLoading, openAuthModal } = useSessionContext()
    const [permDenied, setPermDenied] = useState(false)
    const [configReady, setConfigReady] = useState(cacheLoaded)
    const openedModalRef = useRef(false)

    useEffect(() => {
        if (cacheLoaded) { setConfigReady(true); return }
        loadPageConfigs().then(() => setConfigReady(true))
    }, [])

    useEffect(() => {
        if (!configReady || authLoading) return

        // Normalize: strip trailing slash, match /admin sub-paths too
        const base = pathname === '/' ? '/' : '/' + pathname.split('/').filter(Boolean)[0]
        const cfg = configCache[pathname] || configCache[base]

        if (!cfg) { setPermDenied(false); return }

        // 1. Hidden page → redirect home
        if (!cfg.visible) { router.replace('/'); return }

        // 2. Auth required, not logged in → open auth modal
        if (cfg.permission === 'auth' && !user) {
            if (!openedModalRef.current) {
                openedModalRef.current = true
                openAuthModal()
            }
            setPermDenied(false)
            return
        }

        // 3. Mod required, logged in but not mod → yellow notice
        if (cfg.permission === 'mod' && user && !isMod) {
            setPermDenied(true)
            return
        }

        openedModalRef.current = false
        setPermDenied(false)
    }, [pathname, configReady, authLoading, user, isMod])

    // Reset modal-opened flag on route change
    useEffect(() => {
        openedModalRef.current = false
        setPermDenied(false)
    }, [pathname])

    if (!permDenied) return null

    return (
        <div style={{
            position: 'fixed',
            top: '60px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: 'rgba(234, 179, 8, 0.15)',
            border: '1px solid rgba(234, 179, 8, 0.5)',
            borderRadius: 'var(--theme-radius)',
            padding: '10px 20px',
            color: '#f59e0b',
            fontSize: '0.875rem',
            fontWeight: 500,
            backdropFilter: 'blur(8px)',
            whiteSpace: 'nowrap',
        }}>
            You don&apos;t have permission to view this page.
        </div>
    )
}
