'use client'

import { supabase } from './supabaseClient'

export async function addPrivateTag(wallet: string, name: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from('wallet_tags').upsert({
    user_id: user.id,
    wallet_address: wallet,
    tag_name: name
  });

  if (error) console.error("Error tagging wallet:", error);
}
