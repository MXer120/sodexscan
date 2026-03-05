'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

const ROLE_CACHE_KEY = 'user_role_cache'
const ROLE_CACHE_TTL = 6 * 60 * 60 * 1000

function getCachedRole(userId: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(ROLE_CACHE_KEY)
    if (!raw) return null
    const { role, uid, ts } = JSON.parse(raw)
    if (uid !== userId) return null
    if (Date.now() - ts > ROLE_CACHE_TTL) return null
    return role
  } catch { return null }
}

function setCachedRole(userId: string, role: string) {
  try {
    localStorage.setItem(ROLE_CACHE_KEY, JSON.stringify({ role, uid: userId, ts: Date.now() }))
  } catch {}
}

function clearCachedRole() {
  try { localStorage.removeItem(ROLE_CACHE_KEY) } catch {}
}

interface SessionContextType {
  session: Session | null
  user: User | null
  loading: boolean
  role: string | null
  isMod: boolean
  isOwner: boolean
  openAuthModal: () => void
  setAuthModalCallback: (callback: (() => void) | null) => void
}

const SessionContext = createContext<SessionContextType>({
  session: null,
  user: null,
  loading: true,
  role: null,
  isMod: false,
  isOwner: false,
  openAuthModal: () => { },
  setAuthModalCallback: () => { },
})

export const SessionContextProvider = ({ children, supabaseClient }: { children: React.ReactNode; supabaseClient: typeof supabase }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)
  const [authModalCallback, setAuthModalCallback] = useState<(() => void) | null>(null)

  const isMod = role === 'mod' || role === 'owner'
  const isOwner = role === 'owner'

  const openAuthModal = () => {
    if (authModalCallback) {
      authModalCallback()
    }
  }

  useEffect(() => {
    const fetchRole = async (userId: string) => {
      try {
        const query = supabaseClient.from('profiles').select('role').eq('id', userId).single()
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 5000)
        )
        const { data } = await Promise.race([query, timeoutPromise])
        const fetched = data?.role ?? 'user'
        setRole(fetched)
        setCachedRole(userId, fetched)
      } catch {
        setRole(prev => prev ?? 'user')
      }
    }

    supabaseClient.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        const cached = getCachedRole(session.user.id)
        if (cached) {
          setRole(cached)
          setLoading(false)
          fetchRole(session.user.id)
        } else {
          await fetchRole(session.user.id)
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    }).catch(() => {
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        const cached = getCachedRole(session.user.id)
        if (cached) {
          setRole(cached)
          setLoading(false)
          fetchRole(session.user.id)
        } else {
          await fetchRole(session.user.id)
          setLoading(false)
        }
      } else {
        setRole(null)
        clearCachedRole()
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabaseClient])

  return (
    <SessionContext.Provider value={{ session, user, loading, role, isMod, isOwner, openAuthModal, setAuthModalCallback }}>
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
