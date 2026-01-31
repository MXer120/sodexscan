'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ReferralPage from '../components/ReferralPage'
import { useSessionContext } from '../lib/SessionContext'

export default function Referral() {
  const { user, loading } = useSessionContext()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [loading, user, router])

  if (loading) return null
  if (!user) return null

  return <ReferralPage />
}
