'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import SoPointsPage from '../components/SoPointsPage'
import { useSessionContext } from '../lib/SessionContext'

export default function SoPoints() {
    const { user, loading } = useSessionContext()
    const router = useRouter()

    React.useEffect(() => {
        if (!loading && !user) {
            router.push('/')
        }
    }, [user, loading, router])

    if (loading) return null

    if (!user) {
        return null // Will redirect
    }

    return <SoPointsPage />
}
