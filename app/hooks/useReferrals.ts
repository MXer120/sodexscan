'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useMemo } from 'react'

export interface Referral {
  id: number
  dc_username: string | null
  tg_username: string | null
  tg_displayname: string | null
  wallet_address: string | null
  ref_code: string
}

// Generate stable random seed per session
const getSessionSeed = () => {
  if (typeof window === 'undefined') return Math.random()
  const key = 'referral_seed'
  let seed = sessionStorage.getItem(key)
  if (!seed) {
    seed = Math.random().toString()
    sessionStorage.setItem(key, seed)
  }
  return parseFloat(seed)
}

async function fetchAllReferrals(): Promise<Referral[]> {
  const { data, error } = await supabase
    .from('publicdns')
    .select('id, dc_username, tg_username, tg_displayname, wallet_address, ref_code')

  if (error) {
    console.error('[Referrals] Fetch error:', error)
    throw error
  }

  return data || []
}

// Seeded random shuffle
function seededShuffle<T>(array: T[], seed: number): T[] {
  const result = [...array]
  let m = result.length
  let t: T
  let i: number

  let localSeed = Math.floor(seed * 233280)

  const random = () => {
    localSeed = (localSeed * 9301 + 49297) % 233280
    return localSeed / 233280
  }

  while (m) {
    i = Math.floor(random() * m--)
    t = result[m]
    result[m] = result[i]
    result[i] = t
  }

  return result
}

export function useReferrals() {
  const seed = useMemo(() => getSessionSeed(), [])

  const query = useQuery({
    queryKey: ['referrals', seed],
    queryFn: fetchAllReferrals,
    staleTime: 1000 * 60 * 30,      // 30 min before refetch
    gcTime: 1000 * 60 * 60,         // 1 hr cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  const shuffledReferrals = useMemo(() => {
    if (!query.data) return []
    return seededShuffle(query.data, seed)
  }, [query.data, seed])

  return {
    ...query,
    referrals: shuffledReferrals
  }
}
