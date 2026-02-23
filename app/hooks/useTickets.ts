'use client'

import { useQuery } from '@tanstack/react-query'
import { useSessionContext } from '../lib/SessionContext'
import { supabase } from '../lib/supabaseClient'
import { useEffect } from 'react'

export type TicketFilter = 'starred' | 'active' | 'inactive' | 'archived' | 'overview' | 'users'

export interface Ticket {
  id: number
  channel_id: string
  channel_name: string | null
  status: string
  open_date: string | null
  close_date: string | null
  opener_discord_id: string | null
  details: string | null
  project: string | null
  issue_type: string | null
  wallet_address: string | null
  account_id: string | null
  tx_id: string | null
  progress: string | null
  assigned: string[] | null
  created_at: string
  updated_at: string
  last_opener_message: string | null
  last_non_mod_message: string | null
  last_message: string | null
  message_count: number
  responding_mods: string[] | null
  is_starred?: boolean
}

export function useTickets(filter: TicketFilter) {
  const { user, isMod } = useSessionContext()

  const query = useQuery({
    queryKey: ['tickets', filter, user?.id],
    queryFn: async (): Promise<Ticket[]> => {
      // Fetch all tickets with activity data
      const { data: tickets, error } = await supabase.rpc('get_tickets_with_activity')
      if (error) throw error

      // Fetch starred ticket IDs
      const { data: stars } = await supabase
        .from('ticket_stars')
        .select('ticket_id')
        .eq('user_id', user!.id)

      const starredIds = new Set((stars || []).map((s: any) => s.ticket_id))

      const enriched = (tickets || []).map((t: any) => ({
        ...t,
        is_starred: starredIds.has(t.id),
      }))

      const now = Date.now()
      const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000

      switch (filter) {
        case 'starred':
          return enriched.filter((t: Ticket) => t.is_starred)
        case 'active': {
          const open = enriched.filter((t: Ticket) => t.status === 'open')
          return open.filter((t: Ticket) => {
            if (!t.last_non_mod_message) return true
            return now - new Date(t.last_non_mod_message).getTime() <= FORTY_EIGHT_HOURS
          })
        }
        case 'inactive':
          return enriched.filter((t: Ticket) => {
            if (t.status !== 'open') return false
            if (!t.last_non_mod_message) return false
            return now - new Date(t.last_non_mod_message).getTime() > FORTY_EIGHT_HOURS
          })
        case 'archived':
          return enriched.filter((t: Ticket) => t.status === 'closed')
        case 'overview':
        case 'users':
          return enriched
        default:
          return enriched
      }
    },
    enabled: !!user && isMod,
    staleTime: 30_000,
  })

  // Realtime subscription for live updates
  useEffect(() => {
    if (!user || !isMod) return

    const channel = supabase
      .channel('tickets-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        query.refetch()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_messages' }, () => {
        query.refetch()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, isMod])

  return query
}
