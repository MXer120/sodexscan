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
        const { data: lb } = await supabase
          .from('leaderboard_smart')
          .select('unrealized_pnl, sodex_total_volume, sodex_pnl')
          .ilike('wallet_address', profile.data.own_wallet)
          .maybeSingle()
        if (lb) {
          const pnlVal = parseFloat(lb.sodex_pnl) || 0
          const volVal = parseFloat(lb.sodex_total_volume) || 0
          // Compute total (sodex) ranks by counting wallets above
          const [pnlAbove, volAbove] = await Promise.all([
            supabase.from('leaderboard_smart').select('*', { count: 'exact', head: true }).gt('sodex_pnl', pnlVal),
            supabase.from('leaderboard_smart').select('*', { count: 'exact', head: true }).gt('sodex_total_volume', volVal),
          ])
          leaderboardStats = {
            total_pnl: pnlVal,
            total_volume: volVal,
            unrealized_pnl: parseFloat(lb.unrealized_pnl) || 0,
            pnl_rank: (pnlAbove.count ?? 0) + 1,
            volume_rank: (volAbove.count ?? 0) + 1,
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
      const lowerWallet = walletAddress.toLowerCase()

      // Get current week number from meta
      const { data: meta } = await supabase
        .from('leaderboard_meta')
        .select('current_week_number')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle()

      const currentWeek = meta?.current_week_number || 1

      // Use RPC for delta-based weekly data + ranks (total=sodex sort)
      const [pnlRes, volRes] = await Promise.all([
        supabase.rpc('get_weekly_leaderboard', { p_week: 0, p_sort: 'total_pnl', p_limit: 5000, p_offset: 0, p_exclude_sodex: false }),
        supabase.rpc('get_weekly_leaderboard', { p_week: 0, p_sort: 'volume', p_limit: 5000, p_offset: 0, p_exclude_sodex: false }),
      ])

      const pnlRows = pnlRes.data || []
      const volRows = volRes.data || []

      // Find user in PnL-sorted results
      const pnlIdx = pnlRows.findIndex((r: any) => r.wallet_address?.toLowerCase() === lowerWallet)
      // Find user in volume-sorted results
      const volIdx = volRows.findIndex((r: any) => r.wallet_address?.toLowerCase() === lowerWallet)

      // Get user's weekly values from whichever result has them
      const userRow = pnlIdx !== -1 ? pnlRows[pnlIdx] : (volIdx !== -1 ? volRows[volIdx] : null)
      if (!userRow) return null

      return {
        weekly_pnl: parseFloat(userRow.weekly_sodex_pnl ?? userRow.weekly_pnl) || 0,
        weekly_volume: parseFloat(userRow.weekly_sodex_volume ?? userRow.weekly_volume) || 0,
        unrealized_pnl: parseFloat(userRow.unrealized_pnl) || 0,
        pnl_rank: pnlIdx !== -1 ? pnlIdx + 1 : null,
        volume_rank: volIdx !== -1 ? volIdx + 1 : null,
        week_number: currentWeek,
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
