'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthDone() {
  const router = useRouter()

  useEffect(() => {
    const next = sessionStorage.getItem('authRedirect') ?? '/'
    sessionStorage.removeItem('authRedirect')
    router.replace(next)
  }, [router])

  return null
}
