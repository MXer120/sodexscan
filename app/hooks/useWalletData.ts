'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'

// Full data load (initial) — includes external APIs
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

// 5s polling — external APIs only
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

// 1s polling — external APIs only
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

export function useWalletLeaderboard(address: string | null) {
  return useQuery({
    queryKey: ['wallet-leaderboard', address],
    queryFn: async () => {
      if (!address) return null
      const [pnlRes, volRes] = await Promise.all([
        fetch(`/api/sodex-leaderboard/rank?wallet_address=${address}&sort_by=pnl&window_type=ALL_TIME`).then(r => r.json()),
        fetch(`/api/sodex-leaderboard/rank?wallet_address=${address}&sort_by=volume&window_type=ALL_TIME`).then(r => r.json()),
      ])
      const pnlData = pnlRes?.data
      const volData = volRes?.data
      if (!pnlData && !volData) return null
      return {
        pnl_rank: pnlData?.rank ?? null,
        volume_rank: volData?.rank ?? null,
        cumulative_pnl: pnlData?.pnl_usd ?? null,
        cumulative_volume: volData?.volume_usd ?? null,
      }
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000,
  })
}
