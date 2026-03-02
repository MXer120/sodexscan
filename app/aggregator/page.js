'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionContext } from '../lib/SessionContext'
import AggregatorPage from '../components/AggregatorPage'

export default function Page() {
  const { user, loading, isMod } = useSessionContext()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/'); return }
    if (!isMod) router.replace('/')
  }, [user, loading, isMod, router])

  if (loading || !user || !isMod) return null
  return <AggregatorPage />
}
