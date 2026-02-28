'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionContext } from '../lib/SessionContext'
import AggregatorPage from '../components/AggregatorPage'

export default function Page() {
  const { user, loading } = useSessionContext()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [user, loading, router])

  if (loading || !user) return null
  return <AggregatorPage />
}
