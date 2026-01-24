'use client'

import { supabase } from './supabaseClient'

export interface WalletTag {
  id: string
  user_id: string
  wallet_address: string
  tag_name: string
  created_at?: string
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
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching tags:", error)
    return []
  }
  return data || []
}
