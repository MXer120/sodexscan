'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useSessionContext } from '../lib/SessionContext'

interface WatchlistItem {
  id: number
  wallet_address: string
  created_at: string
  wallet_tags: {
    tag_name: string
  } | null
}

export function useWatchlist() {
  const { user } = useSessionContext()
  const queryClient = useQueryClient()

  // Fetch watchlist with tags
  const { data, isLoading, error } = useQuery({
    queryKey: ['watchlist', user?.id],
    queryFn: async () => {
      if (!user) return []

      // Fetch watchlist and tags in parallel
      const [watchlistResult, tagsResult] = await Promise.all([
        supabase
          .from('watchlist')
          .select('id, wallet_address, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('wallet_tags')
          .select('wallet_address, tag_name')
          .eq('user_id', user.id)
      ])

      if (watchlistResult.error) throw watchlistResult.error
      if (tagsResult.error) throw tagsResult.error

      // Create a map of wallet addresses to tag names
      const tagMap = new Map<string, string>()
      if (tagsResult.data) {
        tagsResult.data.forEach(tag => {
          tagMap.set(tag.wallet_address, tag.tag_name)
        })
      }

      // Combine watchlist with tags
      return (watchlistResult.data || []).map((item) => ({
        id: item.id,
        wallet_address: item.wallet_address,
        created_at: item.created_at,
        wallet_tags: tagMap.has(item.wallet_address)
          ? { tag_name: tagMap.get(item.wallet_address)! }
          : null
      })) as WatchlistItem[]
    },
    enabled: !!user,
  })

  // Mutation to remove from watchlist
  const removeMutation = useMutation({
    mutationFn: async (walletAddress: string) => {
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', user.id)
        .eq('wallet_address', walletAddress)

      if (error) throw error
    },
    onSuccess: () => {
      // Invalidate and refetch watchlist
      queryClient.invalidateQueries({ queryKey: ['watchlist', user?.id] })
    },
  })

  return {
    watchlist: data || [],
    isLoading,
    error,
    removeFromWatchlist: removeMutation.mutate,
    isRemoving: removeMutation.isPending,
  }
}
