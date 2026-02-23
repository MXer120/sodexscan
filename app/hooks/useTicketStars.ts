'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSessionContext } from '../lib/SessionContext'
import { supabase } from '../lib/supabaseClient'

export function useToggleStar() {
  const { user } = useSessionContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ticketId, isStarred }: { ticketId: number; isStarred: boolean }) => {
      if (isStarred) {
        const { error } = await supabase
          .from('ticket_stars')
          .delete()
          .eq('ticket_id', ticketId)
          .eq('user_id', user!.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('ticket_stars')
          .insert({ ticket_id: ticketId, user_id: user!.id })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}
