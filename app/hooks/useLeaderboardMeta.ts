'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { globalCache } from '../lib/globalCache'

export interface LeaderboardMeta {
  id: number
  current_week_number: number
  pool_size: string | null
  total_user_counts: Record<string, number> | null
}

export function useLeaderboardMeta() {
  return useQuery<LeaderboardMeta | null>({
    queryKey: ['leaderboard-meta'],
    queryFn: async () => {
      const cached = globalCache.getLeaderboardMeta() as LeaderboardMeta | null
      if (cached) return cached
      const { data, error } = await supabase
        .from('leaderboard_meta')
        .select('id, current_week_number, pool_size, total_user_counts')
        .eq('id', 1)
        .single()
      if (error) throw error
      if (data) globalCache.setLeaderboardMeta(data)
      return data
    },
    staleTime: 60_000,
  })
}
