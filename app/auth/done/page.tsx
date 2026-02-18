'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

function AuthDoneInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Signing you in...')

  useEffect(() => {
    const code = searchParams.get('code')
    const next = sessionStorage.getItem('authRedirect') ?? '/'
    sessionStorage.removeItem('authRedirect')

    console.log('[auth/done] code:', code, 'next:', next)

    if (!code) {
      console.log('[auth/done] no code, redirecting to', next)
      router.replace(next)
      return
    }

    supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
      console.log('[auth/done] exchange result:', { user: data?.user?.email, error: error?.message })
      if (error) {
        setStatus('Sign in failed: ' + error.message)
        setTimeout(() => router.replace('/'), 3000)
      } else {
        router.replace(next)
      }
    })
  }, [router, searchParams])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#fff', fontSize: '16px' }}>
      {status}
    </div>
  )
}

export default function AuthDone() {
  return (
    <Suspense>
      <AuthDoneInner />
    </Suspense>
  )
}
