'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const next = sessionStorage.getItem('authRedirect') ?? '/'
    sessionStorage.removeItem('authRedirect')

    // Supabase auto-parses the hash and fires onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe()
        router.replace(next)
      }
    })

    // Fallback: if already signed in (hash already processed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe()
        router.replace(next)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return null
}
