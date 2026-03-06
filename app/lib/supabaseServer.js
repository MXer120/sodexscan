import { createClient } from '@supabase/supabase-js'

// Shared server-side Supabase client (service role).
// Reused across API routes + cron jobs to prevent connection pool exhaustion.
// On Vercel serverless each cold start gets one instance; warm invocations reuse it.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
