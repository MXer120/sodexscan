'use client'

import { supabase } from './supabaseClient'

export interface WalletTag {
  id: string
  user_id: string
  wallet_address: string
  tag_name: string
  created_at?: string
  is_group?: boolean
  group_name?: string | null
  group_color?: string | null
}

export interface WalletGroup {
  id: string
  user_id: string
  group_name: string
  group_color: string
  created_at?: string
}

// 10 preset group colors (enum values for DB)
export const GROUP_COLORS = [
  'red',
  'orange',
  'yellow',
  'green',
  'teal',
  'blue',
  'purple',
  'pink',
  'gray',
  'brown',
] as const

export type GroupColor = typeof GROUP_COLORS[number]

// Map color names to hex for UI display
export const COLOR_HEX: Record<GroupColor, string> = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
  teal: '#14b8a6',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  pink: '#ec4899',
  gray: '#6b7280',
  brown: '#a16207',
}

export async function addPrivateTag(wallet: string, name: string): Promise<WalletTag | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase.from('wallet_tags').upsert({
    user_id: user.id,
    wallet_address: wallet,
    tag_name: name
  }, { onConflict: 'user_id,wallet_address' }).select().single()

  if (error) {
    console.error("Error tagging wallet:", error)
    return null
  }
  return data
}

export async function renameTag(tagId: string, newName: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('wallet_tags')
    .update({ tag_name: newName })
    .eq('id', tagId)
    .eq('user_id', user.id)

  if (error) {
    console.error("Error renaming tag:", error)
    return false
  }
  return true
}

export async function deleteTag(tagId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('wallet_tags')
    .delete()
    .eq('id', tagId)
    .eq('user_id', user.id)

  if (error) {
    console.error("Error deleting tag:", error)
    return false
  }
  return true
}

export async function fetchUserTags(): Promise<WalletTag[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('wallet_tags')
    .select('id, user_id, wallet_address, tag_name, created_at, is_group, group_name, group_color')
    .eq('user_id', user.id)
    .eq('is_group', false)
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching tags:", error)
    return []
  }
  return data || []
}

// Group operations

export async function fetchUserGroups(): Promise<WalletGroup[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('wallet_tags')
    .select('id, user_id, group_name, group_color, created_at')
    .eq('user_id', user.id)
    .eq('is_group', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching groups:", error)
    return []
  }
  return (data || []).map(row => ({
    id: row.id,
    user_id: row.user_id,
    group_name: row.group_name!,
    group_color: row.group_color!,
    created_at: row.created_at
  }))
}

export async function createGroup(name: string, color: GroupColor): Promise<WalletGroup | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !name.trim()) return null

  const { data, error } = await supabase.from('wallet_tags').insert({
    user_id: user.id,
    is_group: true,
    group_name: name.trim(),
    group_color: color
  }).select().single()

  if (error) {
    console.error("Error creating group:", error)
    return null
  }
  return {
    id: data.id,
    user_id: data.user_id,
    group_name: data.group_name!,
    group_color: data.group_color!,
    created_at: data.created_at
  }
}

export async function deleteGroup(groupId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  // First get the group name to clear from assigned wallets
  const { data: group } = await supabase
    .from('wallet_tags')
    .select('group_name')
    .eq('id', groupId)
    .eq('user_id', user.id)
    .eq('is_group', true)
    .single()

  if (group?.group_name) {
    // Clear group assignment from all wallets in this group
    await supabase
      .from('wallet_tags')
      .update({ group_name: null })
      .eq('user_id', user.id)
      .eq('group_name', group.group_name)
      .eq('is_group', false)
  }

  // Delete the group
  const { error } = await supabase
    .from('wallet_tags')
    .delete()
    .eq('id', groupId)
    .eq('user_id', user.id)
    .eq('is_group', true)

  if (error) {
    console.error("Error deleting group:", error)
    return false
  }
  return true
}

export async function renameGroup(groupId: string, newName: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !newName.trim()) return false

  // Get old group name
  const { data: group } = await supabase
    .from('wallet_tags')
    .select('group_name')
    .eq('id', groupId)
    .eq('user_id', user.id)
    .eq('is_group', true)
    .single()

  if (!group) return false

  // Update group name
  const { error: updateError } = await supabase
    .from('wallet_tags')
    .update({ group_name: newName.trim() })
    .eq('id', groupId)
    .eq('user_id', user.id)

  if (updateError) {
    console.error("Error renaming group:", updateError)
    return false
  }

  // Update all wallet references to use new name
  if (group.group_name) {
    await supabase
      .from('wallet_tags')
      .update({ group_name: newName.trim() })
      .eq('user_id', user.id)
      .eq('group_name', group.group_name)
      .eq('is_group', false)
  }

  return true
}

export async function assignToGroup(tagId: string, groupName: string | null): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('wallet_tags')
    .update({ group_name: groupName })
    .eq('id', tagId)
    .eq('user_id', user.id)
    .eq('is_group', false)

  if (error) {
    console.error("Error assigning to group:", error)
    return false
  }
  return true
}

export async function assignMultipleToGroup(tagIds: string[], groupName: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || tagIds.length === 0) return false

  const { error } = await supabase
    .from('wallet_tags')
    .update({ group_name: groupName })
    .in('id', tagIds)
    .eq('user_id', user.id)
    .eq('is_group', false)

  if (error) {
    console.error("Error bulk assigning to group:", error)
    return false
  }
  return true
}

export async function removeFromGroup(tagId: string): Promise<boolean> {
  return assignToGroup(tagId, null)
}
