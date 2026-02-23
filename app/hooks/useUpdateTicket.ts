'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

export function useUpdateTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ticketId, fields }: { ticketId: number; fields: Record<string, string | null> }) => {
      const { error } = await supabase.rpc('update_ticket_fields', {
        p_ticket_id: ticketId,
        p_fields: fields,
      })
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['ticket-messages', variables.ticketId] })
    },
  })
}
