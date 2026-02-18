'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

function CallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get('code')
    const next = sessionStorage.getItem('authRedirect') ?? '/'
    sessionStorage.removeItem('authRedirect')

    if (!code) {
      router.replace(next)
      return
    }

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setError(error.message)
        setTimeout(() => router.replace('/'), 3000)
      } else {
        router.replace(next)
      }
    })
  }, [router, searchParams])

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#f44336', fontSize: '14px' }}>
      {error}
    </div>
  )

  return null
}

export default function AuthCallback() {
  return (
    <Suspense>
      <CallbackInner />
    </Suspense>
  )
}
