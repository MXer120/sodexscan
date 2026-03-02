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
        const { data: leaderboard } = await supabase
          .from('leaderboard')
          .select('cumulative_pnl, cumulative_volume, unrealized_pnl, pnl_rank, volume_rank')
          .eq('wallet_address', profile.data.own_wallet)
          .maybeSingle()
        leaderboardStats = leaderboard
      }

      return { profile: profile.data, leaderboardStats, tagMap };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
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
