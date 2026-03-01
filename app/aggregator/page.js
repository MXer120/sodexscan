'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionContext } from '../lib/SessionContext'
import AggregatorPage from '../components/AggregatorPage'

export default function Page() {
  const { user, loading, role } = useSessionContext()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/'); return }
    if (role !== null && role !== 'owner') router.replace('/')
  }, [user, loading, role, router])

  if (loading || !user || role === null || role !== 'owner') return null
  return <AggregatorPage />
}
