'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionContext } from '../lib/SessionContext'

/** Allows access for team, mod, and owner roles */
export function useTeamGuard() {
  const { user, role, loading } = useSessionContext()
  const router = useRouter()

  const isAllowed = !!user && (role === 'team' || role === 'mod' || role === 'owner')

  useEffect(() => {
    if (!loading && !isAllowed) {
      router.push('/')
    }
  }, [isAllowed, loading, router])

  return { isAllowed, loading }
}
