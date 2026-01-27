'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import IncomingListings from '../components/IncomingListings'
import { useSessionContext } from '../lib/SessionContext'
import '../styles/IncomingListings.css'

export default function Incoming() {
  const { user, loading } = useSessionContext()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [loading, user, router])

  if (loading) return null
  if (!user) return null

  return <IncomingListings />
}
