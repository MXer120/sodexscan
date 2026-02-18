// Uses @supabase/ssr browser client so PKCE code verifier is stored in cookies
// (survives server-side redirects, no tokens in URL)
import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
