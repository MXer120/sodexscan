'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useSessionContext } from '../lib/SessionContext'

// Matches exact DB schema: id, user_id, wallet_address, created_at
export interface WatchlistItem {
  id: number
  wallet_address: string
  created_at: string
  wallet_tags: {
    tag_name: string
    group_name: string | null
    group_color: string | null
  } | null
  leaderboard: {
    pnl_rank: number | null
    volume_rank: number | null
  } | null
  current_position: {
    symbol: string
    position_side: string
  } | null
}

export interface AddWatchlistInput {
  wallet_address: string
}

export function useWatchlist() {
  const { user } = useSessionContext()
  const queryClient = useQueryClient()

  // Fetch watchlist - RLS ensures only user's rows returned
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['watchlist', user?.id],
    queryFn: async () => {
      if (!user) return []

      const [watchlistResult, tagsResult, groupsResult, leaderboardResult] = await Promise.all([
        supabase
          .from('watchlist')
          .select('id, wallet_address, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('wallet_tags')
          .select('wallet_address, tag_name, group_name')
          .eq('is_group', false),
        supabase
          .from('wallet_tags')
          .select('group_name, group_color')
          .eq('is_group', true),
        supabase
          .from('leaderboard_smart')
          .select('wallet_address, account_id, pnl_rank, volume_rank')
      ])

      if (watchlistResult.error) throw watchlistResult.error
      if (tagsResult.error) throw tagsResult.error
      if (groupsResult.error) throw groupsResult.error
      if (leaderboardResult.error) throw leaderboardResult.error

      // Build maps for efficient lookup
      const tagMap = new Map<string, { tag_name: string, group_name: string | null }>()
      if (tagsResult.data) {
        tagsResult.data.forEach(tag => {
          if (tag.wallet_address) {
            tagMap.set(tag.wallet_address.toLowerCase(), {
              tag_name: tag.tag_name,
              group_name: tag.group_name
            })
          }
        })
      }

      const groupColorMap = new Map<string, string>()
      if (groupsResult.data) {
        groupsResult.data.forEach(group => {
          if (group.group_name) {
            groupColorMap.set(group.group_name, group.group_color)
          }
        })
      }

      const leaderboardMap = new Map<string, {
        account_id: string | null,
        pnl_rank: number | null,
        volume_rank: number | null
      }>()
      if (leaderboardResult.data) {
        leaderboardResult.data.forEach(entry => {
          if (entry.wallet_address) {
            leaderboardMap.set(entry.wallet_address.toLowerCase(), {
              account_id: entry.account_id,
              pnl_rank: entry.pnl_rank,
              volume_rank: entry.volume_rank
            })
          }
        })
      }

      // Only fetch positions for wallets in the watchlist
      const watchlistWallets = new Set(
        (watchlistResult.data || []).map(item => item.wallet_address.toLowerCase())
      )

      const accountIds = Array.from(new Set(
        leaderboardResult.data
          ?.filter(e => e.account_id && e.wallet_address && watchlistWallets.has(e.wallet_address.toLowerCase()))
          .map(e => e.account_id) || []
      ))

      const positionsMap = new Map<string, { symbol: string, position_side: string }>()

      // Fetch positions in batches to avoid too many concurrent requests
      const batchSize = 5
      for (let i = 0; i < accountIds.length; i += batchSize) {
        const batch = accountIds.slice(i, i + batchSize)
        await Promise.all(
          batch.map(async (accountId) => {
            try {
              const res = await fetch(
                `https://mainnet-gw.sodex.dev/futures/fapi/user/v1/public/account/details?accountId=${accountId}`
              )
              const data = await res.json()
              if (data.code === 0 && data.data?.positions?.length > 0) {
                // Only keep first position per account
                const pos = data.data.positions[0]
                positionsMap.set(accountId, {
                  symbol: pos.symbol,
                  position_side: pos.positionSide
                })
              }
            } catch (err) {
              console.error(`Failed to fetch positions for account ${accountId}:`, err)
            }
          })
        )
      }

      return (watchlistResult.data || []).map((item) => {
        const walletLower = item.wallet_address.toLowerCase()
        const tagInfo = tagMap.get(walletLower)
        const leaderboardInfo = leaderboardMap.get(walletLower)
        const accountId = leaderboardInfo?.account_id
        const positionInfo = accountId ? positionsMap.get(accountId) : null

        return {
          id: item.id,
          wallet_address: item.wallet_address,
          created_at: item.created_at,
          wallet_tags: tagInfo ? {
            tag_name: tagInfo.tag_name,
            group_name: tagInfo.group_name,
            group_color: tagInfo.group_name ? groupColorMap.get(tagInfo.group_name) || null : null
          } : null,
          leaderboard: leaderboardInfo ? {
            pnl_rank: leaderboardInfo.pnl_rank,
            volume_rank: leaderboardInfo.volume_rank
          } : null,
          current_position: positionInfo || null
        }
      }) as WatchlistItem[]
    },
    enabled: !!user,
  })

  // Add to watchlist - only wallet_address column
  const addMutation = useMutation({
    mutationFn: async (input: AddWatchlistInput) => {
      if (!user) throw new Error('User not authenticated')

      const trimmedAddress = input.wallet_address.trim()
      if (!trimmedAddress) throw new Error('Wallet address is required')

      const { data, error } = await supabase
        .from('watchlist')
        .insert([{ wallet_address: trimmedAddress }])
        .select('id, wallet_address, created_at')
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new Error('This wallet is already in your watchlist')
        }
        throw error
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist', user?.id] })
    },
  })

  // Remove from watchlist by id
  const removeMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist', user?.id] })
    },
  })

  // Remove from watchlist by wallet address
  const removeByAddressMutation = useMutation({
    mutationFn: async (walletAddress: string) => {
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('wallet_address', walletAddress.toLowerCase())

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist', user?.id] })
    },
  })

  return {
    watchlist: data || [],
    isLoading,
    error,
    refetch,
    addToWatchlist: addMutation.mutateAsync,
    isAdding: addMutation.isPending,
    addError: addMutation.error,
    removeFromWatchlist: removeMutation.mutate,
    removeFromWatchlistById: removeMutation.mutate,
    removeFromWatchlistByAddress: removeByAddressMutation.mutate,
    isRemoving: removeMutation.isPending || removeByAddressMutation.isPending,
    removeError: removeMutation.error || removeByAddressMutation.error,
  }
}
