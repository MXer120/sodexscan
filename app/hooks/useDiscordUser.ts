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
