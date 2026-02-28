'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

// Shared hook for wallet-specific data used by scanner widgets in aggregator
export function useWalletData(address: string | null) {
  return useQuery({
    queryKey: ['wallet-data', address],
    queryFn: async () => {
      if (!address) return null
      const res = await fetch(`/api/public/wallet/${address}`)
      if (!res.ok) throw new Error('Failed to fetch wallet data')
      return res.json()
    },
    enabled: !!address,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  })
}

export function useWalletLeaderboard(accountId: string | null) {
  return useQuery({
    queryKey: ['wallet-leaderboard', accountId],
    queryFn: async () => {
      if (!accountId) return null
      const { data, error } = await supabase
        .from('leaderboard_smart')
        .select('pnl_rank, volume_rank, cumulative_pnl, cumulative_volume')
        .eq('account_id', accountId)
        .single()
      if (error) return null
      return data
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000,
  })
}
