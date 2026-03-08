'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import MainnetPage from '../components/MainnetPage'
import { useSessionContext } from '../lib/SessionContext'

export default function Mainnet() {
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

  return <MainnetPage />
}
