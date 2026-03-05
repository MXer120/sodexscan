'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

// Full data load (initial) — includes supabase + external APIs
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

/** Resolve accountId from cached wallet-data query */
function useResolvedAccountId(address: string | null): string | null {
  const qc = useQueryClient()
  const cached = qc.getQueryData<any>(['wallet-data', address])
  return cached?.account_id ?? null
}

// 5s polling — external APIs only, no supabase
export function useWalletSlowData(address: string | null, accountIdOverride?: string | null) {
  const resolved = useResolvedAccountId(address)
  const accountId = accountIdOverride ?? resolved

  return useQuery({
    queryKey: ['wallet-slow-data', address],
    queryFn: async () => {
      if (!address || !accountId) return null
      const res = await fetch(`/api/public/wallet/${address}/live?accountId=${accountId}`)
      if (!res.ok) throw new Error('Failed to fetch wallet slow data')
      return res.json()
    },
    enabled: !!address && !!accountId,
    staleTime: 0,
    refetchInterval: 5000,
  })
}

// 1s polling — external APIs only, no supabase
export function useWalletLiveData(address: string | null, accountIdOverride?: string | null) {
  const resolved = useResolvedAccountId(address)
  const accountId = accountIdOverride ?? resolved

  return useQuery({
    queryKey: ['wallet-live-data', address],
    queryFn: async () => {
      if (!address || !accountId) return null
      const res = await fetch(`/api/public/wallet/${address}/live?accountId=${accountId}`)
      if (!res.ok) throw new Error('Failed to fetch wallet live data')
      return res.json()
    },
    enabled: !!address && !!accountId,
    staleTime: 0,
    refetchInterval: 1000,
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
        .maybeSingle()
      if (error) return null
      return data
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000,
  })
}
