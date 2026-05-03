'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useSessionContext } from '../lib/SessionContext'

export function useUserProfile() {
  const { user } = useSessionContext()

  return useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const [profile, tags] = await Promise.all([
        supabase.from('profiles').select('id, own_wallet, show_zero_data, role, email, created_at').eq('id', user.id).single(),
        supabase.from('wallet_tags').select('wallet_address, tag_name').eq('user_id', user.id)
      ]);

      if (profile.error) throw profile.error

      const tagMap = new Map<string, string>()
      if (tags.data) {
        tags.data.forEach(tag => {
          tagMap.set(tag.wallet_address, tag.tag_name)
        })
      }

      let leaderboardStats = null
      if (profile.data?.own_wallet) {
        const [pnlRes, volRes] = await Promise.all([
          fetch(`/api/sodex-leaderboard/rank?wallet_address=${encodeURIComponent(profile.data.own_wallet)}&sort_by=pnl&window_type=ALL_TIME`).then(r => r.json()).catch(() => null),
          fetch(`/api/sodex-leaderboard/rank?wallet_address=${encodeURIComponent(profile.data.own_wallet)}&sort_by=volume&window_type=ALL_TIME`).then(r => r.json()).catch(() => null),
        ])
        const pnlData = pnlRes?.data
        const volData = volRes?.data
        if (pnlData || volData) {
          leaderboardStats = {
            total_pnl: parseFloat(pnlData?.pnl_usd ?? volData?.pnl_usd ?? 0),
            total_volume: parseFloat(volData?.volume_usd ?? pnlData?.volume_usd ?? 0),
            unrealized_pnl: 0,
            pnl_rank: pnlData?.rank ?? null,
            volume_rank: volData?.rank ?? null,
          }
        }
      }

      return { profile: profile.data, leaderboardStats, tagMap };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useWeeklyWalletStats(walletAddress: string | null | undefined) {
  return useQuery({
    queryKey: ['weekly-wallet-stats', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null

      const [pnlRes, volRes, weeklyListRes] = await Promise.all([
        fetch(`/api/sodex-leaderboard/rank?wallet_address=${encodeURIComponent(walletAddress)}&sort_by=pnl&window_type=WEEKLY`).then(r => r.json()).catch(() => null),
        fetch(`/api/sodex-leaderboard/rank?wallet_address=${encodeURIComponent(walletAddress)}&sort_by=volume&window_type=WEEKLY`).then(r => r.json()).catch(() => null),
        fetch(`/api/sodex-leaderboard?window_type=WEEKLY&sort_by=volume&page_size=10`).then(r => r.json()).catch(() => null),
      ])

      const pnlData = pnlRes?.data
      const volData = volRes?.data
      if (!pnlData && !volData) return null

      return {
        weekly_pnl: parseFloat(pnlData?.pnl_usd ?? volData?.pnl_usd ?? 0),
        weekly_volume: parseFloat(volData?.volume_usd ?? pnlData?.volume_usd ?? 0),
        unrealized_pnl: 0,
        pnl_rank: pnlData?.rank ?? null,
        volume_rank: volData?.rank ?? null,
        week_number: 1,
      }
    },
    enabled: !!walletAddress,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

export function useUpdateOwnWallet() {
  const { user } = useSessionContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (walletAddress: string) => {
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('profiles')
        .update({ own_wallet: walletAddress || null })
        .eq('id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      // Invalidate and refetch profile
      queryClient.invalidateQueries({ queryKey: ['user-profile', user?.id] })
    },
  })
}

export function useUpdateShowZeroData() {
  const { user } = useSessionContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (showZeroData: boolean) => {
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('profiles')
        .update({ show_zero_data: showZeroData })
        .eq('id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      // Invalidate and refetch profile
      queryClient.invalidateQueries({ queryKey: ['user-profile', user?.id] })
    },
  })
}
