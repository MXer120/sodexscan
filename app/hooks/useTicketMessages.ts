'use client'

import { useQuery } from '@tanstack/react-query'
import { useSessionContext } from '../lib/SessionContext'
import { supabase } from '../lib/supabaseClient'
import { useEffect } from 'react'

export interface TicketMessage {
  id: number
  ticket_id: number
  message_id: string
  content: string | null
  author_id: string
  author_name: string
  timestamp: string
  attachments: Array<{ url: string; filename: string; content_type?: string }>
  is_edit: boolean
  is_deleted: boolean
}

export function useTicketMessages(ticketId: number | null) {
  const { user, isMod } = useSessionContext()

  const query = useQuery({
    queryKey: ['ticket-messages', ticketId],
    queryFn: async (): Promise<TicketMessage[]> => {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('timestamp', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!ticketId && !!user && isMod,
    staleTime: 15_000,
  })

  // Realtime for this ticket's messages
  useEffect(() => {
    if (!ticketId || !user || !isMod) return

    const channel = supabase
      .channel(`ticket-msgs-${ticketId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ticket_messages',
        filter: `ticket_id=eq.${ticketId}`
      }, () => {
        query.refetch()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [ticketId, user, isMod])

  return query
}
