'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

interface SessionContextType {
  session: Session | null
  user: User | null
  loading: boolean
  openAuthModal: () => void
  setAuthModalCallback: (callback: (() => void) | null) => void
}

const SessionContext = createContext<SessionContextType>({
  session: null,
  user: null,
  loading: true,
  openAuthModal: () => { },
  setAuthModalCallback: () => { },
})

export const SessionContextProvider = ({ children, supabaseClient }: { children: React.ReactNode; supabaseClient: typeof supabase }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authModalCallback, setAuthModalCallback] = useState<(() => void) | null>(null)

  const openAuthModal = () => {
    if (authModalCallback) {
      authModalCallback()
    }
  }

  useEffect(() => {
    // Get initial session
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabaseClient])

  return (
    <SessionContext.Provider value={{ session, user, loading, openAuthModal, setAuthModalCallback }}>
      {children}
    </SessionContext.Provider>
  )
}

export const useSessionContext = () => {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSessionContext must be used within SessionContextProvider')
  }
  return context
}
