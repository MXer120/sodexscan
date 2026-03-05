'use client'

import { useQuery } from '@tanstack/react-query'
import { useSessionContext } from '../lib/SessionContext'
import { supabase } from '../lib/supabaseClient'

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
  if (ticket.status === 'closed') {
    return ticket.progress || 'closed'
  }
  if (ticket.progress === 'escalated' || ticket.progress === 'solved') {
    return ticket.progress
  }
  if (!ticket.message_count || ticket.message_count === 0) {
    return 'new'
  }
  if (!ticket.responding_mods || ticket.responding_mods.length === 0) {
    return 'waiting'
  }
  if (ticket.last_non_mod_message && ticket.last_message) {
    if (new Date(ticket.last_non_mod_message).getTime() === new Date(ticket.last_message).getTime()) {
      return 'waiting'
    }
  }
  return 'attended'
}

const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000

function filterTickets(enriched: Ticket[], filter: TicketFilter): Ticket[] {
  const now = Date.now()
  switch (filter) {
    case 'starred':
      return enriched.filter((t: Ticket) => t.is_starred)
    case 'active':
      return enriched.filter((t: Ticket) => {
        if (t.status !== 'open') return false
        if (!t.last_non_mod_message) return true
        return now - new Date(t.last_non_mod_message).getTime() <= FORTY_EIGHT_HOURS
      })
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
    default:
      return enriched
  }
}

/** Base query — fetches ALL tickets once, shared across all useTickets consumers */
function useAllTickets() {
  const { user, isMod } = useSessionContext()

  return useQuery({
    queryKey: ['tickets', user?.id],
    queryFn: async (): Promise<Ticket[]> => {
      const { data: tickets, error } = await supabase.rpc('get_tickets_with_activity')
      if (error) throw error

      const { data: stars } = await supabase
        .from('ticket_stars')
        .select('ticket_id')
        .eq('user_id', user!.id)

      const starredIds = new Set((stars || []).map((s: any) => s.ticket_id))

      return (tickets || []).map((t: any) => ({
        ...t,
        is_starred: starredIds.has(t.id),
        progress: autoProgress(t),
      }))
    },
    enabled: !!user && isMod,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  })
}

/** Filtered view — uses React Query `select` to filter without separate fetch */
export function useTickets(filter: TicketFilter) {
  const { user, isMod } = useSessionContext()

  return useQuery({
    queryKey: ['tickets', user?.id],
    queryFn: async (): Promise<Ticket[]> => {
      const { data: tickets, error } = await supabase.rpc('get_tickets_with_activity')
      if (error) throw error

      const { data: stars } = await supabase
        .from('ticket_stars')
        .select('ticket_id')
        .eq('user_id', user!.id)

      const starredIds = new Set((stars || []).map((s: any) => s.ticket_id))

      return (tickets || []).map((t: any) => ({
        ...t,
        is_starred: starredIds.has(t.id),
        progress: autoProgress(t),
      }))
    },
    enabled: !!user && isMod,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    select: (data) => filterTickets(data, filter),
  })
}
