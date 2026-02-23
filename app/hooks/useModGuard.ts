'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionContext } from '../lib/SessionContext'

export function useModGuard() {
  const { user, isMod, loading } = useSessionContext()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!user || !isMod)) {
      router.push('/')
    }
  }, [user, isMod, loading, router])

  return { isAllowed: !!user && isMod, loading }
}
