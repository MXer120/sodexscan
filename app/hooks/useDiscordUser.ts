'use client'

import { useQuery } from '@tanstack/react-query'
import { useSessionContext } from '../lib/SessionContext'
import { supabase } from '../lib/supabaseClient'

export interface DiscordUser {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  is_mod: boolean
}

export interface DiscordUserStats {
  tickets_opened: number
  tickets_assigned: number
  messages_sent: number
}

export function useDiscordUser(discordId: string | null) {
  const { user, isMod } = useSessionContext()

  return useQuery({
    queryKey: ['discord-user', discordId],
    queryFn: async (): Promise<DiscordUser | null> => {
      const { data, error } = await supabase
        .from('discord_users')
        .select('*')
        .eq('id', discordId)
        .single()
      if (error) return null
      return data
    },
    enabled: !!discordId && !!user && isMod,
  })
}

export function useDiscordUsers(ids: string[]) {
  const { user, isMod } = useSessionContext()

  return useQuery({
    queryKey: ['discord-users', ids.sort().join(',')],
    queryFn: async (): Promise<DiscordUser[]> => {
      if (!ids.length) return []
      const { data, error } = await supabase
        .from('discord_users')
        .select('*')
        .in('id', ids)
      if (error) return []
      return data || []
    },
    enabled: ids.length > 0 && !!user && isMod,
    staleTime: 60_000,
  })
}

export function useAllMods() {
  const { user, isMod } = useSessionContext()

  return useQuery({
    queryKey: ['all-mods'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_mods')
      if (error) throw error
      return data || []
    },
    enabled: !!user && isMod,
    staleTime: 60_000,
  })
}

export function useTopTicketOpeners(limit = 20) {
  const { user, isMod } = useSessionContext()

  return useQuery({
    queryKey: ['top-ticket-openers', limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_top_ticket_openers', { p_limit: limit })
      if (error) throw error
      return data || []
    },
    enabled: !!user && isMod,
    staleTime: 60_000,
  })
}

export function useRecentTicketOpeners(limit = 20) {
  const { user, isMod } = useSessionContext()

  return useQuery({
    queryKey: ['recent-ticket-openers', limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_recent_ticket_openers', { p_limit: limit })
      if (error) throw error
      return data || []
    },
    enabled: !!user && isMod,
    staleTime: 60_000,
  })
}

export function useDiscordUserStats(discordId: string | null) {
  const { user, isMod } = useSessionContext()

  return useQuery({
    queryKey: ['discord-user-stats', discordId],
    queryFn: async (): Promise<DiscordUserStats> => {
      const { data, error } = await supabase.rpc('get_discord_user_stats', {
        p_discord_id: discordId,
      })
      if (error) throw error
      return data?.[0] || { tickets_opened: 0, tickets_assigned: 0, messages_sent: 0 }
    },
    enabled: !!discordId && !!user && isMod,
  })
}
