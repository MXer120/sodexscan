import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { error } = await supabase
  .from('nav_config')
  .upsert(
    { path: '/design-system', label: 'Design System', enabled: true, tag: null, sort_order: 78, in_more: true, updated_at: new Date().toISOString() },
    { onConflict: 'path' }
  )

if (error) {
  console.error('Failed:', error.message)
  process.exit(1)
}
console.log('✓ /design-system inserted into nav_config')
