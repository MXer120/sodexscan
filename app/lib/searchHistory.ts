'use client'

import { supabase } from './supabaseClient'
import { useQueryClient } from '@tanstack/react-query'

// Hook version that invalidates cache
export function useRecordSearch() {
  const queryClient = useQueryClient()

  return async (walletAddress: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return // Only record if user is logged in

      const { error } = await supabase
        .from('search_history')
        .insert({
          user_id: user.id,
          wallet_address: walletAddress
        })

      if (error) {
        console.error('Error recording search:', error)
      } else {
        // Invalidate profile query to refresh search history
        queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      }
    } catch (error) {
      console.error('Error recording search:', error)
    }
  }
}

// Standalone function version (for use outside components)
export async function recordSearch(walletAddress: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return // Only record if user is logged in

    const { error } = await supabase
      .from('search_history')
      .insert({
        user_id: user.id,
        wallet_address: walletAddress
      })

    if (error) {
      console.error('Error recording search:', error)
    }
  } catch (error) {
    console.error('Error recording search:', error)
  }
}
