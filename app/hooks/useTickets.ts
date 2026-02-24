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
  opener_username?: string | null
  opener_display_name?: string | null
  opener_avatar_url?: string | null
  is_starred?: boolean
}

/**
 * Auto-compute progress if not manually set:
 * - "new" = no messages at all
 * - "waiting" = most recent message is by the opener (not a mod)
 * - Otherwise keep whatever is set
 */
function autoProgress(ticket: Ticket): string {
  // Closed tickets default to 'closed' progress
  if (ticket.status === 'closed') {
    return ticket.progress || 'closed'
  }

  // If manually set to escalated/solved, respect it
  if (ticket.progress === 'escalated' || ticket.progress === 'solved') {
    return ticket.progress
  }

  // No messages = new
  if (!ticket.message_count || ticket.message_count === 0) {
    return 'new'
  }

  // If we have messages, but no mod has ever responded = waiting
  if (!ticket.responding_mods || ticket.responding_mods.length === 0) {
    return 'waiting'
  }

  // If last non-mod message is the latest message = waiting
  if (ticket.last_non_mod_message && ticket.last_message) {
    if (new Date(ticket.last_non_mod_message).getTime() === new Date(ticket.last_message).getTime()) {
      return 'waiting'
    }
  }

  // Otherwise, a mod responded last = attended
  return 'attended'
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
        // Auto-compute progress
        progress: autoProgress(t),
      }))

      const now = Date.now()
      const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000

      switch (filter) {
        case 'starred':
          // Starred is independent — tickets can be starred AND in any section
          return enriched.filter((t: Ticket) => t.is_starred)

        case 'active': {
          // Active = OPEN + last non-mod message within 48h (or no non-mod message yet)
          return enriched.filter((t: Ticket) => {
            if (t.status !== 'open') return false // closed = archived, not active
            if (!t.last_non_mod_message) return true // no non-mod msg yet = still active
            return now - new Date(t.last_non_mod_message).getTime() <= FORTY_EIGHT_HOURS
          })
        }

        case 'inactive':
          // Inactive = OPEN + last non-mod message older than 48h
          return enriched.filter((t: Ticket) => {
            if (t.status !== 'open') return false // closed tickets go to archived
            if (!t.last_non_mod_message) return false // no msg = active, not inactive
            return now - new Date(t.last_non_mod_message).getTime() > FORTY_EIGHT_HOURS
          })

        case 'archived':
          // Archived = ONLY closed tickets (closed in Discord)
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
