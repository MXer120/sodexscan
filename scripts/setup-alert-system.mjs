/**
 * One-time setup script for the alert system.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=your_token node scripts/setup-alert-system.mjs
 *
 * Get your access token from: https://supabase.com/dashboard/account/tokens
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const root = join(__dir, '..')

function loadEnv() {
  try {
    const raw = readFileSync(join(root, '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const [key, ...rest] = trimmed.split('=')
      if (key && !process.env[key]) process.env[key] = rest.join('=')
    }
  } catch { /* .env.local may not exist in CI */ }
}

loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN

const PROJECT_REF = SUPABASE_URL?.match(/https:\/\/([^.]+)\./)?.[1]

async function runMigrations() {
  if (!ACCESS_TOKEN) {
    console.error('❌  SUPABASE_ACCESS_TOKEN not set.')
    console.error('   Get it from: https://supabase.com/dashboard/account/tokens')
    console.error('   Then run: SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/setup-alert-system.mjs')
    return false
  }

  if (!PROJECT_REF) {
    console.error('❌  Could not parse project ref from NEXT_PUBLIC_SUPABASE_URL')
    return false
  }

  const migrations = [
    '20260420000004_alerts.sql',
    '20260420000005_alert_cron.sql',
    '20260420000006_alert_types_extend.sql',
  ]

  let allOk = true
  for (const file of migrations) {
    const sql = readFileSync(join(root, 'supabase/migrations', file), 'utf8')
    process.stdout.write(`  Applying ${file}... `)

    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    })

    if (res.ok) {
      console.log('✅')
    } else {
      const err = await res.json().catch(() => ({}))
      console.log(`❌  ${err.message ?? res.status}`)
      allOk = false
    }
  }
  return allOk
}

async function renameBot() {
  if (!TELEGRAM_TOKEN) {
    console.log('⚠️  TELEGRAM_BOT_TOKEN not set — skipping bot rename')
    return
  }

  process.stdout.write('  Renaming bot to "Communityscan"... ')
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/setMyName`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Communityscan' }),
  })
  const data = await res.json()
  if (data.ok) {
    console.log('✅')
  } else {
    // Try alternate name if primary fails (name may be taken)
    process.stdout.write(`  Trying "Communityscan - SoDEX"... `)
    const r2 = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/setMyName`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Communityscan - SoDEX' }),
    })
    const d2 = await r2.json()
    console.log(d2.ok ? '✅' : `❌  ${d2.description}`)
  }
}

async function setBotDescription() {
  if (!TELEGRAM_TOKEN) return
  process.stdout.write('  Setting bot description... ')
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/setMyDescription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: 'Get notified when price targets, wallet activity, or position conditions trigger on SoDEX. Not financial advice.',
    }),
  })
  const data = await res.json()
  console.log(data.ok ? '✅' : `❌  ${data.description}`)
}

async function setBotCommands() {
  if (!TELEGRAM_TOKEN) return
  process.stdout.write('  Registering bot commands... ')
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      commands: [
        { command: 'alerts', description: 'View your active alerts' },
        { command: 'pause', description: 'Pause all notifications' },
        { command: 'resume', description: 'Resume all notifications' },
        { command: 'help', description: 'Show help' },
        { command: 'stop', description: 'Unlink your account' },
      ],
    }),
  })
  const data = await res.json()
  console.log(data.ok ? '✅' : `❌  ${data.description}`)
}

console.log('\n🚀  CommunityScan SoDEX — Alert System Setup\n')

console.log('📦  Database migrations:')
const migrationsOk = await runMigrations()

console.log('\n🤖  Telegram bot:')
await renameBot()
await setBotDescription()
await setBotCommands()

console.log(migrationsOk
  ? '\n✅  Done! Alert system is ready.\n'
  : '\n⚠️  Migrations failed. Run SQL manually in the Supabase SQL editor:\n   https://supabase.com/dashboard/project/yifkydhsbflzfprteots/sql\n   (Paste contents of supabase/migrations/20260420000004-6*.sql)\n'
)
