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

      // 1. Fetch watchlist first
      const { data: watchlistRows, error: watchlistError } = await supabase
        .from('watchlist')
        .select('id, wallet_address, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (watchlistError) throw watchlistError
      if (!watchlistRows || watchlistRows.length === 0) return []

      const watchlistAddresses = watchlistRows.map(w => w.wallet_address)

      // Helper to fetch valid data with case-insensitive matching
      // We chunk requests to avoid URL length limits with .or()
      const fetchWithILike = async (table: string, select: string, addresses: string[], extraFilter?: (q: any) => any) => {
        const chunkSize = 20
        const results = []
        for (let i = 0; i < addresses.length; i += chunkSize) {
          const chunk = addresses.slice(i, i + chunkSize)
          const orFilter = chunk.map(addr => `wallet_address.ilike.${addr}`).join(',')

          let query = supabase.from(table).select(select).or(orFilter)
          if (extraFilter) {
            query = extraFilter(query)
          }

          const { data, error } = await query
          if (error) {
            console.error(`Error fetching ${table}:`, error)
          } else if (data) {
            results.push(...data)
          }
        }
        return results
      }

      // 2. Fetch related data
      const [tagsData, groupsData, leaderboardData] = await Promise.all([
        fetchWithILike('wallet_tags', 'wallet_address, tag_name, group_name', watchlistAddresses, (q) => q.eq('is_group', false)),
        supabase.from('wallet_tags').select('group_name, group_color').eq('is_group', true).then(res => res.data || []),
        fetchWithILike('leaderboard_smart', 'wallet_address, account_id, pnl_rank, volume_rank', watchlistAddresses)
      ])

      // Build maps for efficient lookup
      // Use lowercase keys for robust matching
      const tagMap = new Map<string, { tag_name: string, group_name: string | null }>()
      tagsData.forEach((tag: any) => {
        if (tag.wallet_address) {
          tagMap.set(tag.wallet_address.toLowerCase(), {
            tag_name: tag.tag_name,
            group_name: tag.group_name
          })
        }
      })

      const groupColorMap = new Map<string, string>()
      groupsData.forEach((group: any) => {
        if (group.group_name) {
          groupColorMap.set(group.group_name, group.group_color)
        }
      })

      const leaderboardMap = new Map<string, {
        account_id: string | null,
        pnl_rank: number | null,
        volume_rank: number | null
      }>()
      leaderboardData.forEach((entry: any) => {
        if (entry.wallet_address) {
          leaderboardMap.set(entry.wallet_address.toLowerCase(), {
            account_id: entry.account_id,
            pnl_rank: entry.pnl_rank,
            volume_rank: entry.volume_rank
          })
        }
      })

      // Fetch positions from Sodex API
      const accountIds = Array.from(new Set(
        leaderboardData
          .filter((e: any) => e.account_id)
          .map((e: any) => e.account_id)
      ))

      const positionsMap = new Map<string, { symbol: string, position_side: string }>()

      // Fetch positions in batches
      const batchSize = 20
      for (let i = 0; i < accountIds.length; i += batchSize) {
        const batch = accountIds.slice(i, i + batchSize)
        await Promise.all(
          batch.map(async (accountId) => {
            try {
              // Fetch Account Details to get OPEN positions (includes symbol strings)
              const res = await fetch(
                `https://mainnet-gw.sodex.dev/futures/fapi/user/v1/public/account/details?accountId=${accountId}`
              )
              const data = await res.json()

              let positions = []
              if (data.code === 0 && data.data && data.data.positions) {
                positions = data.data.positions
              }

              if (positions && positions.length > 0) {
                // Find biggest position by size (margin * leverage. e.g. usd value)
                const sorted = positions.sort((a: any, b: any) => {
                  const valA = (parseFloat(a.isolatedMargin) || 0) * (parseFloat(a.leverage) || 0)
                  const valB = (parseFloat(b.isolatedMargin) || 0) * (parseFloat(b.leverage) || 0)
                  return valB - valA
                })

                // Only keep first position per account (biggest)
                const pos = sorted[0]
                const symbol = pos.symbol
                // API returns 'LONG' / 'SHORT'
                const side = pos.positionSide

                if (symbol) {
                  positionsMap.set(String(accountId), {
                    symbol: symbol,
                    position_side: side
                  })
                }
              }
            } catch (err) {
              console.error(`Failed to fetch positions for account ${accountId}:`, err)
            }
          })
        )
      }

      return watchlistRows.map((item) => {
        const walletLower = item.wallet_address.toLowerCase()
        const tagInfo = tagMap.get(walletLower)
        const leaderboardInfo = leaderboardMap.get(walletLower)
        const accountId = leaderboardInfo?.account_id
        const positionInfo = accountId ? positionsMap.get(String(accountId)) : null

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
        .ilike('wallet_address', walletAddress)

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
